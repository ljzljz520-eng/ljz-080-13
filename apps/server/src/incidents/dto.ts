import { IncidentSource, TimelineEntry, VisitOutcome } from '../common/domain';

export class CreateIncidentDto {
  elderId: string;
  source: IncidentSource;
  address: string;
  locationDetail?: string;
  reporterName?: string;
  reporterPhone?: string;
  sensorConfidence?: number;
  note?: string;
}

export class AcknowledgeDto {
  by: string;
}

export class DispatchDto {
  caregiverId: string;
  by: string;
  etaMinutes: number;
}

export class CallDto {
  target: 'emergency_contact' | 'elder' | 'caregiver' | 'duty';
  phone: string;
  targetName: string;
  by: string;
}

export class FalseAlarmDto {
  by: string;
  reason: string;
}

export class RevisitDto {
  by: string;
  outcome: VisitOutcome;
  injuryFound: boolean;
  measures: string[];
  hospitalAdvised: boolean;
  note: string;
}

export class ClaimDto {
  by: string;
}

let seq = 0;
export function newId(prefix: string): string {
  seq += 1;
  return `${prefix}-${Date.now().toString(36)}-${seq}-${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}

export function timelineEntry(
  type: TimelineEntry['type'],
  actor: string,
  detail?: string,
): TimelineEntry {
  return { id: newId('tl'), type, at: new Date().toISOString(), actor, detail };
}
