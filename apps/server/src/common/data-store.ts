import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import {
  AlertSource,
  CallLog,
  Elder,
  EmergencyContact,
  FallAlert,
  HealthRecord,
  ServiceVisit,
  TimelineEvent,
  Worker,
} from './types';

const now = Date.now();
const iso = (offsetMs: number) => new Date(now + offsetMs).toISOString();
const MINUTE = 60_000;
export const SLA_MS = Number(process.env.ALERT_SLA_SECONDS ?? 5 * 60) * 1000;

function makeId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * 演示用内存数据层。
 * 字段与 supabase/schema.sql 中的表一一对应，
 * 接入 Supabase 时把各方法替换为 PostgREST / SQL 调用即可，接口层无需改动。
 */
@Injectable()
export class DataStore implements OnModuleInit {
  private readonly logger = new Logger('DataStore');
  elders: Elder[] = [];
  contacts: EmergencyContact[] = [];
  visits: ServiceVisit[] = [];
  workers: Worker[] = [];
  records: HealthRecord[] = [];
  alerts: FallAlert[] = [];
  timeline: TimelineEvent[] = [];
  calls: CallLog[] = [];

  onModuleInit() {
    this.seed();
    this.logger.log(
      `演示数据已载入：${this.elders.length} 位老人，${this.alerts.length} 条预警，SLA=${SLA_MS / 1000}s`,
    );
  }

  private seed() {
    this.elders = [
      {
        id: 'eld_001',
        name: '王秀兰',
        age: 82,
        gender: 'female',
        address: '幸福里社区 3 栋 2 单元 501',
        community: '幸福里社区',
        managerId: 'mgr_01',
        phone: '139-0000-1101',
        careLevel: 2,
        photoColor: '#f59e0b',
      },
      {
        id: 'eld_002',
        name: '李建国',
        age: 76,
        gender: 'male',
        address: '幸福里社区 5 栋 1 单元 302',
        community: '幸福里社区',
        managerId: 'mgr_01',
        phone: '139-0000-2202',
        careLevel: 1,
        photoColor: '#3b82f6',
      },
      {
        id: 'eld_003',
        name: '张桂芳',
        age: 88,
        gender: 'female',
        address: '康宁小区 2 栋 3 单元 1102',
        community: '康宁小区',
        managerId: 'mgr_01',
        phone: '139-0000-3303',
        careLevel: 3,
        photoColor: '#ec4899',
      },
    ];

    this.contacts = [
      {
        id: 'con_1',
        elderId: 'eld_001',
        name: '王强',
        relation: '儿子',
        phone: '138-1111-0001',
        priority: 1,
      },
      {
        id: 'con_2',
        elderId: 'eld_001',
        name: '王丽',
        relation: '女儿',
        phone: '138-2222-0002',
        priority: 2,
      },
      {
        id: 'con_3',
        elderId: 'eld_002',
        name: '李娜',
        relation: '女儿',
        phone: '138-3333-0003',
        priority: 1,
      },
      {
        id: 'con_4',
        elderId: 'eld_003',
        name: '张明',
        relation: '孙子',
        phone: '138-4444-0004',
        priority: 1,
      },
      {
        id: 'con_5',
        elderId: 'eld_003',
        name: '张梅',
        relation: '女儿',
        phone: '138-5555-0005',
        priority: 2,
      },
    ];

    this.visits = [
      {
        id: 'vis_1',
        elderId: 'eld_001',
        workerName: '陈护工',
        serviceType: '助浴服务',
        visitedAt: iso(-26 * 60 * MINUTE),
        note: '老人状态平稳，浴室已加装防滑垫。',
      },
      {
        id: 'vis_2',
        elderId: 'eld_002',
        workerName: '刘护工',
        serviceType: '康复按摩',
        visitedAt: iso(-3 * 60 * MINUTE),
        note: '膝关节理疗，结束后步行正常。',
      },
      {
        id: 'vis_3',
        elderId: 'eld_003',
        workerName: '周护工',
        serviceType: '上门巡访',
        visitedAt: iso(-52 * 60 * MINUTE),
        note: '血压偏高，已提醒按时服药。',
      },
    ];

    this.workers = [
      {
        id: 'wkr_01',
        name: '陈护工',
        phone: '137-0001-0001',
        title: '高级护理员',
        status: 'idle',
        currentArea: '幸福里社区',
      },
      {
        id: 'wkr_02',
        name: '刘护工',
        phone: '137-0002-0002',
        title: '护理员',
        status: 'on_duty',
        currentArea: '幸福里社区 5 栋',
      },
      {
        id: 'wkr_03',
        name: '周护工',
        phone: '137-0003-0003',
        title: '高级护理员',
        status: 'idle',
        currentArea: '康宁小区',
      },
    ];

    this.records = [
      {
        id: 'rec_seed_1',
        elderId: 'eld_001',
        type: 'chronic',
        title: '高血压 II 期',
        content: '长期服用苯磺酸氨氯地平，血压控制在 140/90 左右。',
        createdAt: iso(-30 * 24 * 60 * MINUTE),
        author: '社区卫生中心',
      },
      {
        id: 'rec_seed_2',
        elderId: 'eld_003',
        type: 'fall',
        title: '既往跌倒史',
        content: '半年前在卫生间滑倒，髋部软组织挫伤，无骨折。',
        createdAt: iso(-180 * 24 * 60 * MINUTE),
        author: '周护工',
      },
    ];

    // 一条来自手环、尚未确认的预警（SLA 剩余约 90 秒，便于观察升级）
    this.alerts = [
      {
        id: makeId('alrt'),
        elderId: 'eld_001',
        source: 'wristband',
        status: 'pending',
        createdAt: iso(-(SLA_MS - 90 * 1000)),
        acknowledgedAt: null,
        acknowledgedBy: null,
        escalatedAt: null,
        dutyAckAt: null,
        resolvedAt: null,
        location: '家中 · 卫生间附近',
        locationDetail: '手环定位：3 栋 2 单元 501，卫生间',
        slaDeadline: iso(0), // 下方按 createdAt + SLA 统一修正
        assignedWorkerId: null,
        assignedAt: null,
      },
      {
        id: makeId('alrt'),
        elderId: 'eld_002',
        source: 'family',
        status: 'pending',
        createdAt: iso(-2 * MINUTE),
        acknowledgedAt: null,
        acknowledgedBy: null,
        escalatedAt: null,
        dutyAckAt: null,
        resolvedAt: null,
        location: '小区花园',
        locationDetail: '家属上报：老人散步时疑似踉跄了一下',
        slaDeadline: iso(5 * MINUTE - 2 * MINUTE),
        assignedWorkerId: null,
        assignedAt: null,
        reporterName: '李娜（女儿）',
        reporterNote: '爸爸说没事，但我看他扶了一下长椅',
      },
      {
        id: makeId('alrt'),
        elderId: 'eld_003',
        source: 'wristband',
        status: 'resolved',
        createdAt: iso(-2 * 24 * 60 * MINUTE),
        acknowledgedAt: iso(-2 * 24 * 60 * MINUTE + 40 * 1000),
        acknowledgedBy: '值班管家',
        escalatedAt: null,
        dutyAckAt: null,
        resolvedAt: iso(-2 * 24 * 60 * MINUTE + 45 * MINUTE),
        location: '客厅',
        locationDetail: '手环跌倒检测',
        slaDeadline: iso(-2 * 24 * 60 * MINUTE + SLA_MS),
        assignedWorkerId: 'wkr_03',
        assignedAt: iso(-2 * 24 * 60 * MINUTE + 2 * MINUTE),
        revisitResult: 'minor_injury',
        revisitNote: '左手掌轻微擦伤，已消毒包扎，情绪稳定。',
        revisitedBy: '周护工',
      },
    ];

    // 修正第一条预警的 SLA 截止时间（createdAt + SLA）
    this.alerts[0].slaDeadline = new Date(
      new Date(this.alerts[0].createdAt).getTime() + SLA_MS,
    ).toISOString();

    for (const a of this.alerts) {
      this.pushTimeline(
        a.id,
        'created',
        a.source === 'wristband' ? '智能手环' : '家属',
        '触发疑似跌倒预警',
      );
      if (a.acknowledgedAt)
        this.pushTimeline(
          a.id,
          'acknowledged',
          a.acknowledgedBy ?? '管家',
          '已确认预警并接管处理',
        );
      if (a.assignedWorkerId) {
        const w = this.workers.find((x) => x.id === a.assignedWorkerId);
        this.pushTimeline(
          a.id,
          'dispatched',
          '值班管家',
          `派单给 ${w?.name ?? a.assignedWorkerId}`,
        );
      }
      if (a.status === 'resolved') {
        this.pushTimeline(
          a.id,
          'resolved',
          a.revisitedBy ?? '护工',
          a.revisitNote ?? '复访完成',
          a.resolvedAt!,
        );
      }
    }

    // 已解决事件对应一条健康档案
    const resolved = this.alerts.find((a) => a.status === 'resolved')!;
    const recId = 'rec_seed_fall_1';
    this.records.push({
      id: recId,
      elderId: resolved.elderId,
      type: 'fall',
      title: '跌倒预警复访记录',
      content: resolved.revisitNote ?? '',
      createdAt: resolved.resolvedAt!,
      author: resolved.revisitedBy ?? '护工',
      alertId: resolved.id,
    });
  }

  pushTimeline(
    alertId: string,
    type: TimelineEvent['type'],
    actor: string,
    detail: string,
    at = new Date().toISOString(),
  ): TimelineEvent {
    const ev: TimelineEvent = {
      id: makeId('tl'),
      alertId,
      type,
      actor,
      detail,
      at,
    };
    this.timeline.push(ev);
    return ev;
  }

  pushCall(call: Omit<CallLog, 'id' | 'at'> & { at?: string }): CallLog {
    const log: CallLog = {
      ...call,
      id: makeId('call'),
      at: call.at ?? new Date().toISOString(),
    };
    this.calls.push(log);
    return log;
  }

  pushRecord(record: Omit<HealthRecord, 'id'>): HealthRecord {
    const rec: HealthRecord = { ...record, id: makeId('rec') };
    this.records.push(rec);
    return rec;
  }

  createAlert(input: {
    elderId: string;
    source: AlertSource;
    location: string;
    locationDetail?: string;
    reporterName?: string;
    reporterNote?: string;
  }): FallAlert {
    const ts = new Date().toISOString();
    const alert: FallAlert = {
      id: makeId('alrt'),
      elderId: input.elderId,
      source: input.source,
      status: 'pending',
      createdAt: ts,
      acknowledgedAt: null,
      acknowledgedBy: null,
      escalatedAt: null,
      dutyAckAt: null,
      resolvedAt: null,
      location: input.location,
      locationDetail: input.locationDetail,
      reporterName: input.reporterName,
      reporterNote: input.reporterNote,
      slaDeadline: new Date(Date.now() + SLA_MS).toISOString(),
      assignedWorkerId: null,
      assignedAt: null,
    };
    this.alerts.push(alert);
    this.pushTimeline(
      alert.id,
      'created',
      input.source === 'wristband' ? '智能手环' : input.reporterName || '家属',
      input.reporterNote || '触发疑似跌倒预警',
      ts,
    );
    return alert;
  }
}
