import type {
  Caregiver,
  Elder,
  ElderProfile,
  HealthRecord,
  IncidentDetail,
  IncidentSummary,
  DutyStats,
} from './types';

const BASE = '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `请求失败 ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  listIncidents: () => request<IncidentSummary[]>('/incidents'),
  incident: (id: string) => request<IncidentDetail>(`/incidents/${id}`),
  stats: () => request<DutyStats>('/incidents/stats'),
  createIncident: (body: unknown) =>
    request<IncidentDetail>('/incidents', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  acknowledge: (id: string, by: string) =>
    request<IncidentDetail>(`/incidents/${id}/acknowledge`, {
      method: 'POST',
      body: JSON.stringify({ by }),
    }),
  dispatch: (id: string, body: unknown) =>
    request<IncidentDetail>(`/incidents/${id}/dispatch`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  logCall: (id: string, body: unknown) =>
    request<IncidentDetail>(`/incidents/${id}/calls`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  falseAlarm: (id: string, by: string, reason: string) =>
    request<IncidentDetail>(`/incidents/${id}/false-alarm`, {
      method: 'POST',
      body: JSON.stringify({ by, reason }),
    }),
  revisit: (id: string, body: unknown) =>
    request<IncidentDetail>(`/incidents/${id}/revisit`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  claim: (id: string, by: string) =>
    request<IncidentDetail>(`/incidents/${id}/claim`, {
      method: 'POST',
      body: JSON.stringify({ by }),
    }),

  elders: () => request<Elder[]>('/elders'),
  elderProfile: (id: string) => request<ElderProfile>(`/elders/${id}/profile`),
  caregivers: () => request<Caregiver[]>('/caregivers'),
  healthRecords: () => request<HealthRecord[]>('/health-records'),
};
