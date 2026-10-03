/** 跌倒预警链路领域模型 */

export type IncidentSource = 'wristband' | 'family';
export type IncidentStatus =
  | 'pending' // 待管家确认
  | 'acting' // 管家已确认，处置中
  | 'dispatched' // 已派护工
  | 'escalated' // 超时升级至社区值班台
  | 'revisited' // 复访完成（已归档）
  | 'false_alarm'; // 误报

export type TimelineType =
  | 'created'
  | 'acknowledged'
  | 'dispatched'
  | 'called'
  | 'false_alarm'
  | 'revisited'
  | 'escalated'
  | 'claimed';

export type VisitOutcome =
  | 'no_fall'
  | 'minor'
  | 'fall_treated'
  | 'fall_hospital';

export interface EmergencyContact {
  name: string;
  relation: string;
  phone: string;
}

export interface Elder {
  id: string;
  name: string;
  age: number;
  gender: '男' | '女';
  address: string;
  location: string; // 事件常用位置描述（小区/楼栋）
  phone: string;
  avatarColor: string;
  riskLevel: 'low' | 'medium' | 'high';
  emergencyContacts: EmergencyContact[];
  conditions: string[]; // 基础病/注意事项
}

export interface Caregiver {
  id: string;
  name: string;
  phone: string;
  title: string;
  onDuty: boolean;
  zones: string[]; // 负责片区
}

/** 上门服务记录 */
export interface ServiceVisit {
  id: string;
  elderId: string;
  caregiverId: string;
  caregiverName: string;
  serviceType: string;
  visitedAt: string; // ISO
  note: string;
}

export interface CallRecord {
  at: string;
  target: 'emergency_contact' | 'elder' | 'caregiver' | 'duty';
  targetName: string;
  phone: string;
  by: string;
}

export interface DispatchRecord {
  caregiverId: string;
  caregiverName: string;
  at: string;
  by: string;
  etaMinutes: number;
  arrivedAt?: string;
}

export interface RevisitNote {
  outcome: VisitOutcome;
  injuryFound: boolean;
  measures: string[];
  hospitalAdvised: boolean;
  note: string;
  caregiverName: string;
  by: string;
  at: string;
}

export interface TimelineEntry {
  id: string;
  type: TimelineType;
  at: string;
  actor: string;
  detail?: string;
}

/** 跌倒预警事件 */
export interface FallIncident {
  id: string;
  code: string; // 业务编号
  elderId: string;
  source: IncidentSource;
  status: IncidentStatus;
  address: string; // 上报位置
  locationDetail?: string;
  occurredAt: string;
  createdAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  escalatedAt?: string;
  escalatedReason?: string;
  claimedAt?: string;
  claimedBy?: string;
  resolvedAt?: string;
  reporterName?: string; // 家属上报人
  reporterPhone?: string;
  sensorConfidence?: number; // 手环置信度 0-100
  slaSeconds: number; // 确认时限
  calls: CallRecord[];
  dispatches: DispatchRecord[];
  revisit?: RevisitNote;
  timeline: TimelineEntry[];
}

/** 健康档案条目（复访结果最终落点） */
export interface HealthRecord {
  id: string;
  elderId: string;
  incidentId: string;
  incidentCode: string;
  type: 'fall' | 'followup' | 'checkup';
  title: string;
  content: string;
  measures: string[];
  hospitalAdvised: boolean;
  outcome: VisitOutcome;
  createdAt: string;
  caregiverName: string;
  recorderName: string;
}

/** 事件聚合详情：一页拉齐位置、时间、最近上门、紧急联系人 */
export interface IncidentDetail extends FallIncident {
  elder: Elder;
  latestVisit?: ServiceVisit;
}

export interface IncidentSummary {
  id: string;
  code: string;
  elderId: string;
  elderName: string;
  elderAddress: string;
  source: IncidentSource;
  status: IncidentStatus;
  createdAt: string;
  slaSeconds: number;
  acknowledgedAt?: string;
  escalatedAt?: string;
}

export interface DutyStats {
  pending: number;
  acting: number;
  escalated: number;
  resolvedToday: number;
  falseAlarmToday: number;
}
