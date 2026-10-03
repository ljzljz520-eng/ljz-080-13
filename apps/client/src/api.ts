/* 与后端 src/common/types.ts 对应 */
export type AlertSource = 'wristband' | 'family' | 'community';
export type AlertStatus =
  | 'pending'
  | 'dispatched'
  | 'calling'
  | 'resolved'
  | 'false_alarm'
  | 'escalated';

export interface Elder {
  id: string;
  name: string;
  age: number;
  gender: 'male' | 'female';
  address: string;
  community: string;
  phone: string;
  careLevel: 1 | 2 | 3;
  photoColor: string;
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

export interface TimelineEvent {
  id: string;
  alertId: string;
  type: string;
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
  location: string;
  locationDetail?: string;
  assignedWorkerId: string | null;
  assignedAt: string | null;
  revisitResult?: string;
  revisitNote?: string;
  revisitedBy?: string;
  slaDeadline: string;
  reporterName?: string;
  reporterNote?: string;
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

export interface ElderProfile {
  elder: Elder;
  contacts: EmergencyContact[];
  visits: ServiceVisit[];
  records: HealthRecord[];
}

export interface HealthRecord {
  id: string;
  elderId: string;
  type: string;
  title: string;
  content: string;
  createdAt: string;
  author: string;
  alertId?: string;
}

export interface AlertStats {
  total: number;
  active: number;
  pending: number;
  dispatched: number;
  escalated: number;
  overdue: number;
  resolved: number;
  falseAlarm: number;
  slaSeconds: number;
}

const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const msg = await res.json().catch(() => ({}));
    throw new Error(
      (msg as { message?: string | string[] }).message
        ? String((msg as { message?: string | string[] }).message)
        : `请求失败 (${res.status})`,
    );
  }
  return res.json() as Promise<T>;
}

export const api = {
  listAlerts: (scope: 'active' | 'all' = 'active', status?: string) =>
    request<AlertDetail[]>(
      `/fall-alerts?scope=${scope}${status ? `&status=${status}` : ''}`,
    ),
  alertDetail: (id: string) => request<AlertDetail>(`/fall-alerts/${id}`),
  reportAlert: (body: {
    elderId: string;
    source: AlertSource;
    location: string;
    locationDetail?: string;
    reporterName?: string;
    reporterNote?: string;
  }) => request<AlertDetail>('/fall-alerts', { method: 'POST', body: JSON.stringify(body) }),
  acknowledge: (id: string, operator = '值班管家') =>
    request<AlertDetail>(`/fall-alerts/${id}/acknowledge`, {
      method: 'POST',
      body: JSON.stringify({ operator }),
    }),
  dispatch: (id: string, body: { workerId: string; operator?: string; note?: string }) =>
    request<AlertDetail>(`/fall-alerts/${id}/dispatch`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  call: (
    id: string,
    body: {
      targetType: CallLog['targetType'];
      target: string;
      result: CallLog['result'];
      durationSec: number;
      note?: string;
      operator?: string;
    },
  ) =>
    request<AlertDetail>(`/fall-alerts/${id}/call`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  falseAlarm: (id: string, reason: string, operator = '值班管家') =>
    request<AlertDetail>(`/fall-alerts/${id}/false-alarm`, {
      method: 'POST',
      body: JSON.stringify({ reason, operator }),
    }),
  dutyAck: (id: string, operator = '社区值班员') =>
    request<AlertDetail>(`/fall-alerts/${id}/duty-acknowledge`, {
      method: 'POST',
      body: JSON.stringify({ operator }),
    }),
  resolve: (
    id: string,
    body: {
      revisitResult: string;
      revisitNote: string;
      revisitedBy: string;
      operator?: string;
    },
  ) =>
    request<AlertDetail>(`/fall-alerts/${id}/resolve`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  workers: () => request<Worker[]>('/fall-alerts/workers/available'),
  stats: () => request<AlertStats>('/fall-alerts/stats/overview'),
  listElders: (keyword?: string) =>
    request<(Elder & { contacts: EmergencyContact[] })[]>(
      `/elders${keyword ? `?keyword=${encodeURIComponent(keyword)}` : ''}`,
    ),
  elderProfile: (id: string) => request<ElderProfile>(`/elders/${id}`),
};
