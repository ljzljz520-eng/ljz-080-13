import { Injectable } from '@nestjs/common';
import {
  Caregiver,
  Elder,
  FallIncident,
  HealthRecord,
  ServiceVisit,
} from '../common/domain';
import { DatabaseService } from './database.service';
import {
  seedCaregivers,
  seedElders,
  seedHealthRecords,
  seedIncidents,
  seedVisits,
} from './seed';

@Injectable()
export class InMemoryStore extends DatabaseService {
  private elders: Elder[] = structuredClone(seedElders);
  private caregivers: Caregiver[] = structuredClone(seedCaregivers);
  private visits: ServiceVisit[] = structuredClone(seedVisits);
  private incidents: FallIncident[] = structuredClone(seedIncidents);
  private healthRecords: HealthRecord[] = structuredClone(seedHealthRecords);

  listElders() {
    return Promise.resolve(this.elders.map((e) => ({ ...e })));
  }

  getElder(id: string) {
    return Promise.resolve(this.elders.find((e) => e.id === id) ?? null);
  }

  listCaregivers() {
    return Promise.resolve(this.caregivers.map((c) => ({ ...c })));
  }

  getCaregiver(id: string) {
    return Promise.resolve(this.caregivers.find((c) => c.id === id) ?? null);
  }

  listVisits(elderId?: string) {
    const list = elderId
      ? this.visits.filter((v) => v.elderId === elderId)
      : this.visits;
    return Promise.resolve(
      list
        .map((v) => ({ ...v }))
        .sort((a, b) => b.visitedAt.localeCompare(a.visitedAt)),
    );
  }

  listIncidents() {
    return Promise.resolve(
      this.incidents
        .map((i) => structuredClone(i))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    );
  }

  getIncident(id: string) {
    return Promise.resolve(this.incidents.find((i) => i.id === id) ?? null);
  }

  async insertIncident(incident: FallIncident) {
    this.incidents.unshift(incident);
    return Promise.resolve(structuredClone(incident));
  }

  updateIncident(incident: FallIncident) {
    const idx = this.incidents.findIndex((i) => i.id === incident.id);
    if (idx >= 0) this.incidents[idx] = structuredClone(incident);
    return Promise.resolve(structuredClone(incident));
  }

  listHealthRecords(elderId?: string) {
    const list = elderId
      ? this.healthRecords.filter((r) => r.elderId === elderId)
      : this.healthRecords;
    return Promise.resolve(
      list
        .map((r) => ({ ...r }))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    );
  }

  insertHealthRecord(record: HealthRecord) {
    this.healthRecords.unshift(record);
    return Promise.resolve({ ...record });
  }
}
