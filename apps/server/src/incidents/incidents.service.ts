import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  DutyStats,
  FallIncident,
  HealthRecord,
  IncidentDetail,
  IncidentSummary,
  VisitOutcome,
} from '../common/domain';
import { DatabaseService } from '../database/database.service';
import {
  AcknowledgeDto,
  CallDto,
  ClaimDto,
  CreateIncidentDto,
  DispatchDto,
  FalseAlarmDto,
  newId,
  RevisitDto,
  timelineEntry,
} from './dto';

const OUTCOME_TEXT: Record<VisitOutcome, string> = {
  no_fall: '到场确认未跌倒',
  minor: '轻微伤情，现场处置',
  fall_treated: '确认跌倒，已现场救治',
  fall_hospital: '确认跌倒，已送医',
};

@Injectable()
export class IncidentsService {
  private readonly logger = new Logger(IncidentsService.name);
  private readonly slaSeconds = Number(process.env.FALL_ACK_SLA_SECONDS ?? 180);

  constructor(private readonly db: DatabaseService) {}

  // ---------------- 查询 ----------------

  async listSummaries(): Promise<IncidentSummary[]> {
    const elders = await this.db.listElders();
    const elderMap = new Map(elders.map((e) => [e.id, e]));
    const incidents = await this.db.listIncidents();
    return incidents.map((i) => {
      const elder = elderMap.get(i.elderId);
      return {
        id: i.id,
        code: i.code,
        elderId: i.elderId,
        elderName: elder?.name ?? '未知老人',
        elderAddress: elder?.address ?? '',
        source: i.source,
        status: i.status,
        createdAt: i.createdAt,
        slaSeconds: i.slaSeconds,
        acknowledgedAt: i.acknowledgedAt,
        escalatedAt: i.escalatedAt,
      };
    });
  }

  /** 聚合页：事件 + 老人档案 + 最近一次上门服务，一页拉齐 */
  async getDetail(id: string): Promise<IncidentDetail> {
    const incident = await this.db.getIncident(id);
    if (!incident) throw new NotFoundException('预警事件不存在');
    const elder = await this.db.getElder(incident.elderId);
    if (!elder) throw new NotFoundException('老人档案不存在');
    const visits = await this.db.listVisits(incident.elderId);
    return {
      ...incident,
      elder,
      latestVisit: visits[0],
    };
  }

  async stats(): Promise<DutyStats> {
    const incidents = await this.db.listIncidents();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    return {
      pending: incidents.filter((i) => i.status === 'pending').length,
      acting: incidents.filter(
        (i) => i.status === 'acting' || i.status === 'dispatched',
      ).length,
      escalated: incidents.filter((i) => i.status === 'escalated').length,
      resolvedToday: incidents.filter(
        (i) =>
          i.status === 'revisited' &&
          i.resolvedAt &&
          new Date(i.resolvedAt) >= todayStart,
      ).length,
      falseAlarmToday: incidents.filter(
        (i) =>
          i.status === 'false_alarm' &&
          i.resolvedAt &&
          new Date(i.resolvedAt) >= todayStart,
      ).length,
    };
  }

  // ---------------- 主链路动作 ----------------

  /** 手环 / 家属上报，创建疑似跌倒事件 */
  async create(dto: CreateIncidentDto): Promise<IncidentDetail> {
    const elder = await this.db.getElder(dto.elderId);
    if (!elder) throw new NotFoundException('老人不存在，无法上报');

    const at = new Date().toISOString();
    const code = this.buildCode();
    const incident: FallIncident = {
      id: newId('in'),
      code,
      elderId: dto.elderId,
      source: dto.source,
      status: 'pending',
      address: dto.address || elder.address,
      locationDetail: dto.locationDetail,
      occurredAt: at,
      createdAt: at,
      reporterName: dto.reporterName,
      reporterPhone: dto.reporterPhone,
      sensorConfidence: dto.sensorConfidence,
      slaSeconds: this.slaSeconds,
      calls: [],
      dispatches: [],
      timeline: [
        timelineEntry(
          'created',
          dto.source === 'wristband'
            ? '老人手环'
            : `家属 ${dto.reporterName ?? ''}`.trim(),
          dto.source === 'wristband'
            ? `手环检测到疑似跌倒，置信度 ${dto.sensorConfidence ?? '--'}%${dto.note ? `；${dto.note}` : ''}`
            : `家属上报疑似跌倒${dto.note ? `：${dto.note}` : ''}`,
        ),
      ],
    };
    const saved = await this.db.insertIncident(incident);
    this.logger.warn(
      `新跌倒预警 ${code}：${elder.name} / ${incident.address}，需在 ${this.slaSeconds}s 内确认`,
    );
    return this.getDetail(saved.id);
  }

  /** 管家确认接单（确认时限计时停止） */
  async acknowledge(id: string, dto: AcknowledgeDto): Promise<IncidentDetail> {
    const incident = await this.requireIncident(id);
    if (incident.acknowledgedAt) {
      return this.getDetail(id);
    }
    if (['revisited', 'false_alarm'].includes(incident.status)) {
      throw new BadRequestException('事件已结束，不能确认');
    }
    incident.acknowledgedAt = new Date().toISOString();
    incident.acknowledgedBy = dto.by;
    if (incident.status === 'pending') incident.status = 'acting';
    incident.timeline.push(timelineEntry('acknowledged', dto.by));
    await this.db.updateIncident(incident);
    return this.getDetail(id);
  }

  /** 派护工上门（派单即视为管家已确认，停止升级计时） */
  async dispatch(id: string, dto: DispatchDto): Promise<IncidentDetail> {
    const incident = await this.requireIncident(id);
    this.assertActive(incident);
    const caregiver = await this.db.getCaregiver(dto.caregiverId);
    if (!caregiver) throw new NotFoundException('护工不存在');
    if (!caregiver.onDuty) throw new BadRequestException('该护工当前不在值班');

    const at = new Date().toISOString();
    if (!incident.acknowledgedAt) {
      incident.acknowledgedAt = at;
      incident.acknowledgedBy = dto.by;
    }
    incident.dispatches.push({
      caregiverId: caregiver.id,
      caregiverName: caregiver.name,
      at,
      by: dto.by,
      etaMinutes: dto.etaMinutes,
    });
    incident.status = 'dispatched';
    incident.timeline.push(
      timelineEntry(
        'dispatched',
        dto.by,
        `派单护工 ${caregiver.name}（${caregiver.title}），预计 ${dto.etaMinutes} 分钟到达`,
      ),
    );
    await this.db.updateIncident(incident);
    return this.getDetail(id);
  }

  /** 拨打电话（老人 / 紧急联系人 / 护工 / 值班台），记录通话动作 */
  async logCall(id: string, dto: CallDto): Promise<IncidentDetail> {
    const incident = await this.requireIncident(id);
    this.assertActive(incident);
    const at = new Date().toISOString();
    incident.calls.push({
      at,
      target: dto.target,
      targetName: dto.targetName,
      phone: dto.phone,
      by: dto.by,
    });
    incident.timeline.push(
      timelineEntry('called', dto.by, `致电${dto.targetName} ${dto.phone}`),
    );
    await this.db.updateIncident(incident);
    return this.getDetail(id);
  }

  /** 标记误报 */
  async markFalseAlarm(
    id: string,
    dto: FalseAlarmDto,
  ): Promise<IncidentDetail> {
    const incident = await this.requireIncident(id);
    this.assertActive(incident);
    incident.status = 'false_alarm';
    incident.resolvedAt = new Date().toISOString();
    incident.timeline.push(
      timelineEntry('false_alarm', dto.by, `标记误报：${dto.reason}`),
    );
    await this.db.updateIncident(incident);
    return this.getDetail(id);
  }

  /**
   * 复访结果：写回事件并落入老人健康档案（健康档案是最终落点，
   * 而不是只停留在消息/时间线里）
   */
  async submitRevisit(id: string, dto: RevisitDto): Promise<IncidentDetail> {
    const incident = await this.requireIncident(id);
    this.assertActive(incident);

    const at = new Date().toISOString();
    incident.revisit = {
      outcome: dto.outcome,
      injuryFound: dto.injuryFound,
      measures: dto.measures,
      hospitalAdvised: dto.hospitalAdvised,
      note: dto.note,
      caregiverName:
        incident.dispatches[incident.dispatches.length - 1]?.caregiverName ??
        '上门护工',
      by: dto.by,
      at,
    };
    incident.status = 'revisited';
    incident.resolvedAt = at;
    if (incident.dispatches.length) {
      incident.dispatches[incident.dispatches.length - 1].arrivedAt = at;
    }
    incident.timeline.push(
      timelineEntry(
        'revisited',
        dto.by,
        `复访完成：${OUTCOME_TEXT[dto.outcome]}，结果已写入老人健康档案`,
      ),
    );
    await this.db.updateIncident(incident);

    const record: HealthRecord = {
      id: newId('hr'),
      elderId: incident.elderId,
      incidentId: incident.id,
      incidentCode: incident.code,
      type: 'fall',
      title: `跌倒复访：${OUTCOME_TEXT[dto.outcome]}`,
      content: dto.note,
      measures: dto.measures,
      hospitalAdvised: dto.hospitalAdvised,
      outcome: dto.outcome,
      createdAt: at,
      caregiverName: incident.revisit.caregiverName,
      recorderName: dto.by,
    };
    await this.db.insertHealthRecord(record);
    this.logger.log(
      `事件 ${incident.code} 复访完成，已写入健康档案 record=${record.id}`,
    );
    return this.getDetail(id);
  }

  /** 超时未确认 -> 自动升级社区值班台 */
  async escalateOverdue(now = Date.now()): Promise<FallIncident[]> {
    const incidents = await this.db.listIncidents();
    const overdue = incidents.filter(
      (i) =>
        i.status === 'pending' &&
        !i.acknowledgedAt &&
        !i.escalatedAt &&
        now - new Date(i.createdAt).getTime() > i.slaSeconds * 1000,
    );
    for (const incident of overdue) {
      const reason = `超过 ${incident.slaSeconds} 秒无管家确认，系统自动升级`;
      incident.status = 'escalated';
      incident.escalatedAt = new Date(now).toISOString();
      incident.escalatedReason = reason;
      incident.timeline.push(timelineEntry('escalated', '系统', reason));
      await this.db.updateIncident(incident);
      this.logger.error(`预警 ${incident.code} ${reason}，已转社区值班台`);
    }
    return overdue;
  }

  /** 社区值班台认领升级事件 */
  async claim(id: string, dto: ClaimDto): Promise<IncidentDetail> {
    const incident = await this.requireIncident(id);
    if (incident.status !== 'escalated') {
      throw new BadRequestException('仅升级中的事件可由值班台认领');
    }
    incident.claimedAt = new Date().toISOString();
    incident.claimedBy = dto.by;
    incident.status = 'acting';
    incident.timeline.push(
      timelineEntry('claimed', dto.by, '社区值班台已认领，接手处置'),
    );
    await this.db.updateIncident(incident);
    return this.getDetail(id);
  }

  // ---------------- 内部工具 ----------------

  private async requireIncident(id: string): Promise<FallIncident> {
    const incident = await this.db.getIncident(id);
    if (!incident) throw new NotFoundException('预警事件不存在');
    return incident;
  }

  private assertActive(incident: FallIncident) {
    if (['revisited', 'false_alarm'].includes(incident.status)) {
      throw new BadRequestException('事件已结束，不能再执行该操作');
    }
  }

  private buildCode(): string {
    const d = new Date();
    const ym = `${String(d.getMonth() + 1).padStart(2, '0')}${String(
      d.getDate(),
    ).padStart(2, '0')}`;
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `FALL-${ym}-${rand}`;
  }
}
