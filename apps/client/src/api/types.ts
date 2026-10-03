export type IncidentSource = 'wristband' | 'family';
export type IncidentStatus =
  | 'pending'
  | 'acting'
  | 'dispatched'
  | 'escalated'
  | 'revisited'
  | 'false_alarm';
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
  gender: string;
  address: string;
  location: string;
  phone: string;
  avatarColor: string;
  riskLevel: 'low' | 'medium' | 'high';
  emergencyContacts: EmergencyContact[];
  conditions: string[];
}

export interface Caregiver {
  id: string;
  name: string;
  phone: string;
  title: string;
  onDuty: boolean;
  zones: string[];
}

export interface ServiceVisit {
  id: string;
  elderId: string;
  caregiverName: string;
  serviceType: string;
  visitedAt: string;
  note: string;
}

export interface TimelineEntry {
  id: string;
  type: string;
  at: string;
  actor: string;
  detail?: string;
}

export interface DispatchRecord {
  caregiverId: string;
  caregiverName: string;
  at: string;
  by: string;
  etaMinutes: number;
  arrivedAt?: string;
}

export interface CallRecord {
  at: string;
  target: string;
  targetName: string;
  phone: string;
  by: string;
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

export interface IncidentDetail {
  id: string;
  code: string;
  elderId: string;
  source: IncidentSource;
  status: IncidentStatus;
  address: string;
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
  reporterName?: string;
  reporterPhone?: string;
  sensorConfidence?: number;
  slaSeconds: number;
  calls: CallRecord[];
  dispatches: DispatchRecord[];
  revisit?: RevisitNote;
  timeline: TimelineEntry[];
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

export interface HealthRecord {
  id: string;
  elderId: string;
  incidentId: string;
  incidentCode: string;
  type: string;
  title: string;
  content: string;
  measures: string[];
  hospitalAdvised: boolean;
  outcome: VisitOutcome;
  createdAt: string;
  caregiverName: string;
  recorderName: string;
}

export interface DutyStats {
  pending: number;
  acting: number;
  escalated: number;
  resolvedToday: number;
  falseAlarmToday: number;
}

export interface ElderProfile {
  elder: Elder;
  records: HealthRecord[];
  visits: ServiceVisit[];
}

export const STATUS_META: Record<
  IncidentStatus,
  { label: string; color: string }
> = {
  pending: { label: '待确认', color: '#f5222d' },
  acting: { label: '处置中', color: '#fa8c16' },
  dispatched: { label: '已派护工', color: '#1677ff' },
  escalated: { label: '已升级值班台', color: '#722ed1' },
  revisited: { label: '复访完成', color: '#52c41a' },
  false_alarm: { label: '误报', color: '#8c8c8c' },
};

export const OUTCOME_LABEL: Record<VisitOutcome, string> = {
  no_fall: '到场确认未跌倒',
  minor: '轻微伤情，现场处置',
  fall_treated: '确认跌倒，已现场救治',
  fall_hospital: '确认跌倒，已送医',
};
