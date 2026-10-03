/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  Caregiver,
  Elder,
  FallIncident,
  HealthRecord,
  ServiceVisit,
} from '../common/domain';
import { DatabaseService } from './database.service';

/**
 * Supabase 实现。表结构见 db/schema.sql。
 * 嵌套数组字段（紧急联系人、通话、派单、时间线、复访、措施）以 jsonb 存储。
 */
export class SupabaseStore extends DatabaseService {
  private client: SupabaseClient;

  constructor() {
    super();
    this.client = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_KEY!,
    );
  }

  private rowToIncident(row: Record<string, unknown>): FallIncident {
    return row as unknown as FallIncident;
  }

  async listElders(): Promise<Elder[]> {
    const { data, error } = await this.client.from('elders').select('*');
    if (error) throw error;
    return (data ?? []) as unknown as Elder[];
  }

  async getElder(id: string): Promise<Elder | null> {
    const { data, error } = await this.client
      .from('elders')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return (data as unknown as Elder) ?? null;
  }

  async listCaregivers(): Promise<Caregiver[]> {
    const { data, error } = await this.client
      .from('caregivers')
      .select('*')
      .order('name');
    if (error) throw error;
    return (data ?? []) as unknown as Caregiver[];
  }

  async getCaregiver(id: string): Promise<Caregiver | null> {
    const { data, error } = await this.client
      .from('caregivers')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return (data as unknown as Caregiver) ?? null;
  }

  async listVisits(elderId?: string): Promise<ServiceVisit[]> {
    let query = this.client
      .from('service_visits')
      .select('*')
      .order('visited_at', { ascending: false });
    if (elderId) query = query.eq('elder_id', elderId);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as unknown as ServiceVisit[];
  }

  async listIncidents(): Promise<FallIncident[]> {
    const { data, error } = await this.client
      .from('fall_incidents')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r) =>
      this.rowToIncident(r as Record<string, unknown>),
    );
  }

  async getIncident(id: string): Promise<FallIncident | null> {
    const { data, error } = await this.client
      .from('fall_incidents')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? this.rowToIncident(data as Record<string, unknown>) : null;
  }

  async insertIncident(incident: FallIncident): Promise<FallIncident> {
    const { data, error } = await this.client
      .from('fall_incidents')
      .insert(incident)
      .single();
    if (error) throw error;
    return this.rowToIncident(data as Record<string, unknown>);
  }

  async updateIncident(incident: FallIncident): Promise<FallIncident> {
    const { data, error } = await this.client
      .from('fall_incidents')
      .update(incident)
      .eq('id', incident.id)
      .single();
    if (error) throw error;
    return this.rowToIncident(data as Record<string, unknown>);
  }

  async listHealthRecords(elderId?: string): Promise<HealthRecord[]> {
    let query = this.client
      .from('health_records')
      .select('*')
      .order('created_at', { ascending: false });
    if (elderId) query = query.eq('elder_id', elderId);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as unknown as HealthRecord[];
  }

  async insertHealthRecord(record: HealthRecord): Promise<HealthRecord> {
    const { data, error } = await this.client
      .from('health_records')
      .insert(record)
      .single();
    if (error) throw error;
    return data as unknown as HealthRecord;
  }
}
