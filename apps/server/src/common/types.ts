export type AlertSource = 'wristband' | 'family' | 'community';
export type AlertStatus =
  | 'pending' // 待管家确认
  | 'dispatched' // 已派护工
  | 'calling' // 电话联系中
  | 'resolved' // 复访完成
  | 'false_alarm' // 误报
  | 'escalated'; // 超时升级到社区值班台

export interface Elder {
  id: string;
  name: string;
  age: number;
  gender: 'male' | 'female';
  address: string;
  roomNo?: string;
  photoColor: string;
  community: string;
  managerId: string;
  phone: string;
  careLevel: 1 | 2 | 3; // 1 自理 2 半失能 3 失能
}

export interface EmergencyContact {
  id: string;
  elderId: string;
  name: string;
  relation: string;
  phone: string;
  priority: number;
}

export interface ServiceVisit {
  id: string;
  elderId: string;
  workerName: string;
  serviceType: string;
  visitedAt: string;
  note: string;
}

export interface Worker {
  id: string;
  name: string;
  phone: string;
  title: string;
  status: 'idle' | 'on_duty' | 'off_duty';
  currentArea: string;
}

export interface HealthRecord {
  id: string;
  elderId: string;
  type: 'fall' | 'chronic' | 'checkup' | 'note';
  title: string;
  content: string;
  createdAt: string;
  author: string;
  alertId?: string;
}

export interface TimelineEvent {
  id: string;
  alertId: string;
  type:
    | 'created'
    | 'acknowledged'
    | 'dispatched'
    | 'called'
    | 'marked_false'
    | 'escalated'
    | 'duty_acknowledged'
    | 'resolved';
  actor: string;
  detail: string;
  at: string;
}

export interface CallLog {
  id: string;
  alertId: string;
  target: string;
  targetType: 'elder' | 'contact' | 'worker' | 'duty';
  result: 'connected' | 'no_answer' | 'busy' | 'voicemail';
  durationSec: number;
  note?: string;
  at: string;
}

export interface FallAlert {
  id: string;
  elderId: string;
  source: AlertSource;
  status: AlertStatus;
  createdAt: string;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
  escalatedAt: string | null;
  dutyAckAt: string | null;
  resolvedAt: string | null;
  // 位置
  location: string;
  locationDetail?: string;
  // 派工
  assignedWorkerId: string | null;
  assignedAt: string | null;
  // 复访结果
  revisitResult?:
    | 'confirmed_fall'
    | 'minor_injury'
    | 'serious_injury'
    | 'no_fall'
    | 'hospitalized';
  revisitNote?: string;
  revisitedBy?: string;
  // 升级 / SLA
  slaDeadline: string;
  reporterNote?: string;
  reporterName?: string;
}

export interface AlertDetail {
  alert: FallAlert;
  elder: Elder;
  contacts: EmergencyContact[];
  lastVisit: ServiceVisit | null;
  worker: Worker | null;
  timeline: TimelineEvent[];
  calls: CallLog[];
  healthRecordId?: string;
}
