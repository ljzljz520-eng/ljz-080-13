import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AlertDetail, AlertSource, CallLog, FallAlert } from '../common/types';
import { DataStore } from '../common/data-store';

export interface CreateAlertDto {
  elderId: string;
  source: AlertSource;
  location: string;
  locationDetail?: string;
  reporterName?: string;
  reporterNote?: string;
}

export interface DispatchDto {
  workerId: string;
  operator: string;
  note?: string;
}

export interface CallDto {
  targetType: CallLog['targetType'];
  target: string;
  result: CallLog['result'];
  durationSec: number;
  note?: string;
  operator: string;
}

export interface ResolveDto {
  revisitResult: NonNullable<FallAlert['revisitResult']>;
  revisitNote: string;
  revisitedBy: string;
  operator: string;
}

const ACTIVE_STATUSES: FallAlert['status'][] = [
  'pending',
  'dispatched',
  'calling',
  'escalated',
];

@Injectable()
export class FallAlertsService {
  constructor(private readonly store: DataStore) {}

  /** 列表：默认返回活跃事件，支持按状态筛选 */
  list(status?: string, scope: 'active' | 'all' = 'active') {
    return this.store.alerts
      .filter((a) => {
        if (status) return a.status === status;
        if (scope === 'active') return ACTIVE_STATUSES.includes(a.status);
        return true;
      })
      .map((a) => this.decorate(a))
      .sort((a, b) => b.alert.createdAt.localeCompare(a.alert.createdAt));
  }

  /**
   * 事件详情：把位置、时间、最近一次上门服务、紧急联系人聚合到同一页
   */
  getDetail(id: string): AlertDetail {
    const alert = this.store.alerts.find((a) => a.id === id);
    if (!alert) throw new NotFoundException('预警事件不存在');
    return this.buildDetail(alert);
  }

  /** 家属 / 手环 上报 */
  report(dto: CreateAlertDto): AlertDetail {
    const elder = this.store.elders.find((e) => e.id === dto.elderId);
    if (!elder) throw new NotFoundException('老人不存在');
    if (!dto.location?.trim())
      throw new BadRequestException('缺少跌倒位置信息');

    const alert = this.store.createAlert(dto);
    return this.buildDetail(alert);
  }

  /** 管家确认接管 */
  acknowledge(id: string, operator: string): AlertDetail {
    const alert = this.mustGet(id);
    if (alert.status === 'resolved' || alert.status === 'false_alarm') {
      throw new BadRequestException('事件已结束，无需确认');
    }
    if (!alert.acknowledgedAt) {
      alert.acknowledgedAt = new Date().toISOString();
      alert.acknowledgedBy = operator;
      this.store.pushTimeline(
        id,
        'acknowledged',
        operator,
        '管家已确认并接管事件',
      );
    }
    return this.buildDetail(alert);
  }

  /** 派护工上门 */
  dispatch(id: string, dto: DispatchDto): AlertDetail {
    const alert = this.mustGet(id);
    this.assertActive(alert);
    const worker = this.store.workers.find((w) => w.id === dto.workerId);
    if (!worker) throw new NotFoundException('护工不存在');

    if (!alert.acknowledgedAt) {
      alert.acknowledgedAt = new Date().toISOString();
      alert.acknowledgedBy = dto.operator;
      this.store.pushTimeline(
        id,
        'acknowledged',
        dto.operator,
        '管家已确认并接管事件',
      );
    }
    alert.assignedWorkerId = worker.id;
    alert.assignedAt = new Date().toISOString();
    alert.status = 'dispatched';
    worker.status = 'on_duty';
    this.store.pushTimeline(
      id,
      'dispatched',
      dto.operator,
      `派单给 ${worker.name}（${worker.title}）前往 ${alert.location}${dto.note ? '；备注：' + dto.note : ''}`,
    );
    return this.buildDetail(alert);
  }

  /** 记录拨打电话（老人 / 联系人 / 护工 / 值班台） */
  logCall(id: string, dto: CallDto): AlertDetail {
    const alert = this.mustGet(id);
    this.assertActive(alert);
    if (!alert.acknowledgedAt) {
      alert.acknowledgedAt = new Date().toISOString();
      alert.acknowledgedBy = dto.operator;
      this.store.pushTimeline(
        id,
        'acknowledged',
        dto.operator,
        '管家已确认并接管事件',
      );
    }
    const call = this.store.pushCall({
      alertId: id,
      target: dto.target,
      targetType: dto.targetType,
      result: dto.result,
      durationSec: dto.durationSec,
      note: dto.note,
    });
    if (alert.status === 'pending' || alert.status === 'escalated') {
      alert.status = 'calling';
    }
    const resultText: Record<CallLog['result'], string> = {
      connected: '已接通',
      no_answer: '无人接听',
      busy: '占线',
      voicemail: '语音留言',
    };
    this.store.pushTimeline(
      id,
      'called',
      dto.operator,
      `拨打${this.targetLabel(dto.targetType)} ${dto.target}，${resultText[dto.result]}，通话 ${dto.durationSec}s${dto.note ? '；' + dto.note : ''}`,
      call.at,
    );
    return this.buildDetail(alert);
  }

  /** 标记误报 */
  markFalseAlarm(id: string, operator: string, reason: string): AlertDetail {
    const alert = this.mustGet(id);
    this.assertActive(alert);
    alert.status = 'false_alarm';
    alert.resolvedAt = new Date().toISOString();
    if (!alert.acknowledgedAt) {
      alert.acknowledgedAt = alert.resolvedAt;
      alert.acknowledgedBy = operator;
    }
    this.store.pushTimeline(
      id,
      'marked_false',
      operator,
      `标记为误报：${reason || '未填写原因'}`,
      alert.resolvedAt,
    );
    return this.buildDetail(alert);
  }

  /**
   * 复访结案：结果同时写入老人健康档案，
   * 不允许只停留在消息 / 时间线中
   */
  resolve(id: string, dto: ResolveDto): AlertDetail {
    const alert = this.mustGet(id);
    this.assertActive(alert);
    if (!dto.revisitNote?.trim()) {
      throw new BadRequestException('复访说明必填，需写入健康档案');
    }

    const ts = new Date().toISOString();
    alert.status = 'resolved';
    alert.resolvedAt = ts;
    alert.revisitResult = dto.revisitResult;
    alert.revisitNote = dto.revisitNote;
    alert.revisitedBy = dto.revisitedBy;

    const elder = this.store.elders.find((e) => e.id === alert.elderId);
    const record = this.store.pushRecord({
      elderId: alert.elderId,
      type: 'fall',
      title: `跌倒预警复访记录（${this.resultLabel(dto.revisitResult)}）`,
      content: this.composeRecordContent(alert, dto, elder?.name ?? ''),
      createdAt: ts,
      author: dto.revisitedBy || dto.operator,
      alertId: alert.id,
    });

    this.store.pushTimeline(
      id,
      'resolved',
      dto.revisitedBy || dto.operator,
      `复访完成：${this.resultLabel(dto.revisitResult)}；${dto.revisitNote}`,
      ts,
    );
    this.store.pushTimeline(
      id,
      'resolved',
      '系统',
      `复访结果已写入 ${elder?.name ?? '老人'} 健康档案（${record.id}）`,
      ts,
    );

    const detail = this.buildDetail(alert);
    detail.healthRecordId = record.id;
    return detail;
  }

  /** 社区值班台接单 */
  dutyAcknowledge(id: string, dutyOfficer: string): AlertDetail {
    const alert = this.mustGet(id);
    if (alert.status !== 'escalated') {
      throw new BadRequestException('仅升级中的事件可由值班台接单');
    }
    alert.dutyAckAt = new Date().toISOString();
    this.store.pushTimeline(
      id,
      'duty_acknowledged',
      dutyOfficer,
      '社区值班台已接单并介入处理',
    );
    return this.buildDetail(alert);
  }

  listWorkers() {
    return this.store.workers;
  }

  stats() {
    const all = this.store.alerts;
    const active = all.filter((a) => ACTIVE_STATUSES.includes(a.status));
    const overdue = active.filter(
      (a) => new Date(a.slaDeadline).getTime() <= Date.now(),
    );
    return {
      total: all.length,
      active: active.length,
      pending: all.filter((a) => a.status === 'pending').length,
      dispatched: all.filter((a) => a.status === 'dispatched').length,
      escalated: all.filter((a) => a.status === 'escalated').length,
      overdue: overdue.length,
      resolved: all.filter((a) => a.status === 'resolved').length,
      falseAlarm: all.filter((a) => a.status === 'false_alarm').length,
      slaSeconds: Number(process.env.ALERT_SLA_SECONDS ?? 5 * 60),
    };
  }

  /**
   * 定时扫描：超过 SLA 仍无人确认的事件升级到社区值班台。
   * 已确认（派工 / 通话中）的事件不再升级；误报 / 已结案也不升级。
   */
  escalateOverdue(): FallAlert[] {
    const nowMs = Date.now();
    const escalated: FallAlert[] = [];
    for (const alert of this.store.alerts) {
      if (alert.status !== 'pending') continue;
      if (alert.acknowledgedAt) continue;
      if (new Date(alert.slaDeadline).getTime() > nowMs) continue;

      alert.status = 'escalated';
      alert.escalatedAt = new Date().toISOString();
      this.store.pushTimeline(
        alert.id,
        'escalated',
        '系统',
        `规定时限内无人确认，自动升级至社区值班台`,
        alert.escalatedAt,
      );
      escalated.push(alert);
    }
    return escalated;
  }

  private decorate(a: FallAlert): AlertDetail {
    return this.buildDetail(a);
  }

  private buildDetail(alert: FallAlert): AlertDetail {
    const elder = this.store.elders.find((e) => e.id === alert.elderId)!;
    const contacts = this.store.contacts
      .filter((c) => c.elderId === alert.elderId)
      .sort((x, y) => x.priority - y.priority);
    const lastVisit =
      this.store.visits
        .filter((v) => v.elderId === alert.elderId)
        .sort((a, b) => b.visitedAt.localeCompare(a.visitedAt))[0] ?? null;
    const worker = alert.assignedWorkerId
      ? (this.store.workers.find((w) => w.id === alert.assignedWorkerId) ??
        null)
      : null;
    const timeline = this.store.timeline
      .filter((t) => t.alertId === alert.id)
      .sort((a, b) => a.at.localeCompare(b.at));
    const calls = this.store.calls
      .filter((c) => c.alertId === alert.id)
      .sort((a, b) => a.at.localeCompare(b.at));
    const record = this.store.records.find((r) => r.alertId === alert.id);
    return {
      alert,
      elder,
      contacts,
      lastVisit,
      worker,
      timeline,
      calls,
      healthRecordId: record?.id,
    };
  }

  private mustGet(id: string): FallAlert {
    const alert = this.store.alerts.find((a) => a.id === id);
    if (!alert) throw new NotFoundException('预警事件不存在');
    return alert;
  }

  private assertActive(alert: FallAlert) {
    if (alert.status === 'resolved')
      throw new BadRequestException('事件已复访结案');
    if (alert.status === 'false_alarm')
      throw new BadRequestException('事件已标记误报');
  }

  private targetLabel(t: CallLog['targetType']) {
    return {
      elder: '老人电话',
      contact: '紧急联系人',
      worker: '护工电话',
      duty: '值班台',
    }[t];
  }

  resultLabel(r: string): string {
    const map: Record<string, string> = {
      confirmed_fall: '确认跌倒',
      minor_injury: '轻微受伤',
      serious_injury: '严重受伤',
      hospitalized: '已送医',
      no_fall: '未发生跌倒',
    };
    return map[r] ?? r;
  }

  private composeRecordContent(
    alert: FallAlert,
    dto: ResolveDto,
    elderName: string,
  ): string {
    const lines = [
      `老人：${elderName}`,
      `预警事件：${alert.id}`,
      `预警来源：${alert.source === 'wristband' ? '智能手环' : '家属上报'}`,
      `发生时间：${alert.createdAt}`,
      `发生位置：${alert.location}${alert.locationDetail ? `（${alert.locationDetail}）` : ''}`,
      `上门护工：${alert.assignedWorkerId ? (this.store.workers.find((w) => w.id === alert.assignedWorkerId)?.name ?? alert.assignedWorkerId) : '未派单'}`,
      `复访人员：${dto.revisitedBy}`,
      `复访结论：${this.resultLabel(dto.revisitResult)}`,
      `复访说明：${dto.revisitNote}`,
    ];
    return lines.join('\n');
  }
}
