-- 养老平台 · 跌倒预警链路 Supabase / Postgres schema
-- 嵌套数组（紧急联系人、通话记录、派单记录、时间线、复访、措施）统一使用 jsonb。

create table if not exists elders (
  id                text primary key,
  name              text not null,
  age               int  not null,
  gender            text not null,
  address           text not null,
  location          text,
  phone             text,
  avatar_color      text,
  risk_level        text not null default 'medium',
  conditions        jsonb not null default '[]',
  emergency_contacts jsonb not null default '[]',
  created_at        timestamptz not null default now()
);

create table if not exists caregivers (
  id          text primary key,
  name        text not null,
  phone       text,
  title       text,
  on_duty     boolean not null default true,
  zones       jsonb not null default '[]'
);

create table if not exists service_visits (
  id             text primary key,
  elder_id       text not null references elders(id),
  caregiver_id   text not null references caregivers(id),
  caregiver_name text not null,
  service_type   text not null,
  visited_at     timestamptz not null,
  note           text
);
create index if not exists idx_visits_elder_time
  on service_visits(elder_id, visited_at desc);

-- 跌倒预警事件（聚合主表）
create table if not exists fall_incidents (
  id                  text primary key,
  code                text not null unique,
  elder_id            text not null references elders(id),
  source              text not null,            -- wristband | family
  status              text not null,            -- pending | acting | dispatched | escalated | revisited | false_alarm
  address             text not null,
  location_detail     text,
  occurred_at         timestamptz not null,
  created_at          timestamptz not null,
  acknowledged_at     timestamptz,
  acknowledged_by     text,
  escalated_at        timestamptz,
  escalated_reason    text,
  claimed_at          timestamptz,
  claimed_by          text,
  resolved_at         timestamptz,
  reporter_name       text,
  reporter_phone      text,
  sensor_confidence   int,
  sla_seconds         int not null default 180,
  calls               jsonb not null default '[]',
  dispatches          jsonb not null default '[]',
  revisit             jsonb,
  timeline            jsonb not null default '[]'
);
create index if not exists idx_incidents_status_time
  on fall_incidents(status, created_at desc);

-- 老人健康档案（复访结果最终落点）
create table if not exists health_records (
  id             text primary key,
  elder_id       text not null references elders(id),
  incident_id    text not null references fall_incidents(id),
  incident_code  text not null,
  type           text not null,                -- fall | followup | checkup
  title          text not null,
  content        text,
  measures       jsonb not null default '[]',
  hospital_advised boolean not null default false,
  outcome        text not null,
  caregiver_name text,
  recorder_name  text,
  created_at     timestamptz not null default now()
);
create index if not exists idx_health_records_elder_time
  on health_records(elder_id, created_at desc);
