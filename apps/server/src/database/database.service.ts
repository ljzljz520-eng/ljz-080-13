import {
  Caregiver,
  Elder,
  FallIncident,
  HealthRecord,
  ServiceVisit,
} from '../common/domain';

/**
 * 数据访问抽象。
 * - 配置 SUPABASE_URL 且非占位符时使用 Supabase 实现（见 supabase.store.ts）
 * - 否则使用带演示种子数据的内存实现（in-memory.store.ts），便于本地/容器一键启动
 */
export abstract class DatabaseService {
  abstract listElders(): Promise<Elder[]>;
  abstract getElder(id: string): Promise<Elder | null>;

  abstract listCaregivers(): Promise<Caregiver[]>;
  abstract getCaregiver(id: string): Promise<Caregiver | null>;

  abstract listVisits(elderId?: string): Promise<ServiceVisit[]>;

  abstract listIncidents(): Promise<FallIncident[]>;
  abstract getIncident(id: string): Promise<FallIncident | null>;
  abstract insertIncident(incident: FallIncident): Promise<FallIncident>;
  abstract updateIncident(incident: FallIncident): Promise<FallIncident>;

  abstract listHealthRecords(elderId?: string): Promise<HealthRecord[]>;
  abstract insertHealthRecord(record: HealthRecord): Promise<HealthRecord>;
}
