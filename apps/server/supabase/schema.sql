-- ============================================================
-- 养老平台 · 跌倒预警链路 Supabase / Postgres 建表脚本
-- 内存数据层（src/common/data-store.ts）字段与此一一对应，
-- 上线时切换到 Supabase：替换 DataStore 内部实现即可。
-- ============================================================

create extension if not exists "pgcrypto";

-- 老人档案
create table if not exists elders (
  id           text primary key default 'eld_' || encode(gen_random_bytes(6), 'hex'),
  name         text not null,
  age          int  not null,
  gender       text check (gender in ('male', 'female')),
  address      text not null,
  room_no      text,
  community    text not null,
  manager_id   text,
  phone        text,
  care_level   int check (care_level between 1 and 3),
  photo_color  text default '#3b82f6',
  created_at   timestamptz not null default now()
);

-- 紧急联系人
create table if not exists emergency_contacts (
  id        text primary key default 'con_' || encode(gen_random_bytes(6), 'hex'),
  elder_id  text not null references elders(id) on delete cascade,
  name      text not null,
  relation  text not null,
  phone     text not null,
  priority  int  not null default 1
);

-- 上门服务记录
create table if not exists service_visits (
  id           text primary key default 'vis_' || encode(gen_random_bytes(6), 'hex'),
  elder_id     text not null references elders(id) on delete cascade,
  worker_name  text not null,
  service_type text not null,
  visited_at   timestamptz not null default now(),
  note         text
);
create index if not exists idx_visits_elder_time on service_visits(elder_id, visited_at desc);

-- 护工
create table if not exists workers (
  id           text primary key default 'wkr_' || encode(gen_random_bytes(6), 'hex'),
  name         text not null,
  phone        text not null,
  title        text,
  status       text check (status in ('idle', 'on_duty', 'off_duty')) default 'idle',
  current_area text
);

-- 跌倒预警事件（核心表）
create table if not exists fall_alerts (
  id                 text primary key default 'alrt_' || encode(gen_random_bytes(6), 'hex'),
  elder_id           text not null references elders(id) on delete cascade,
  source             text not null check (source in ('wristband', 'family', 'community')),
  status             text not null default 'pending'
                     check (status in ('pending','dispatched','calling','resolved','false_alarm','escalated')),
  location           text not null,
  location_detail    text,
  reporter_name      text,
  reporter_note      text,
  created_at         timestamptz not null default now(),
  acknowledged_at    timestamptz,
  acknowledged_by    text,
  escalated_at       timestamptz,
  duty_ack_at        timestamptz,
  assigned_worker_id text references workers(id),
  assigned_at        timestamptz,
  resolved_at        timestamptz,
  revisit_result     text check (revisit_result in
                       ('confirmed_fall','minor_injury','serious_injury','no_fall','hospitalized')),
  revisit_note       text,
  revisited_by       text,
  sla_deadline       timestamptz not null,
  health_record_id   text,
  created_from       text default 'wristband'
);
create index if not exists idx_alerts_status on fall_alerts(status);
create index if not exists idx_alerts_elder on fall_alerts(elder_id);
-- 升级扫描关键索引：待确认且已过 SLA
create index if not exists idx_alerts_sla on fall_alerts(sla_deadline)
  where status = 'pending' and acknowledged_at is null;

-- 事件时间线（系统审计）
create table if not exists alert_timeline (
  id        text primary key default 'tl_' || encode(gen_random_bytes(6), 'hex'),
  alert_id  text not null references fall_alerts(id) on delete cascade,
  type      text not null check (type in
            ('created','acknowledged','dispatched','called','marked_false',
             'escalated','duty_acknowledged','resolved')),
  actor     text not null,
  detail    text,
  at        timestamptz not null default now()
);
create index if not exists idx_timeline_alert on alert_timeline(alert_id, at);

-- 通话记录
create table if not exists alert_calls (
  id          text primary key default 'call_' || encode(gen_random_bytes(6), 'hex'),
  alert_id    text not null references fall_alerts(id) on delete cascade,
  target      text not null,
  target_type text check (target_type in ('elder','contact','worker','duty')),
  result      text check (result in ('connected','no_answer','busy','voicemail')),
  duration_sec int default 0,
  note        text,
  at          timestamptz not null default now()
);

-- 老人健康档案（复访结果最终落点）
create table if not exists health_records (
  id        text primary key default 'rec_' || encode(gen_random_bytes(6), 'hex'),
  elder_id  text not null references elders(id) on delete cascade,
  type      text not null check (type in ('fall','chronic','checkup','note')),
  title     text not null,
  content   text not null,
  author    text not null,
  alert_id  text references fall_alerts(id),
  created_at timestamptz not null default now()
);
create index if not exists idx_records_elder_time on health_records(elder_id, created_at desc);

-- ============================================================
-- 自动升级：超过 SLA 仍未确认的事件 -> escalated（社区值班台）
-- 也可由 NestJS 的 EscalationScheduler 轮询执行（当前演示方式）
-- ============================================================
create or replace function escalate_overdue_fall_alerts()
returns setof fall_alerts language sql as $$
  update fall_alerts
     set status = 'escalated',
         escalated_at = now()
   where status = 'pending'
     and acknowledged_at is null
     and sla_deadline <= now()
   returning *;
$$;

-- pg_cron（Supabase 已内置）：每 30 秒执行一次升级扫描
-- select cron.schedule('fall-alert-escalation', '30 seconds',
--   $$ select escalate_overdue_fall_alerts() $$);

-- 复访结案时同步写入健康档案（数据库层兜底，防止复访结果只停在消息列表）
create or replace function write_fall_revisit_to_health_record()
returns trigger language plpgsql as $$
declare rec_id text;
begin
  if new.status = 'resolved' and new.revisit_note is not null
     and (old.health_record_id is null) then
    insert into health_records (elder_id, type, title, content, author, alert_id)
    select new.elder_id, 'fall',
           '跌倒预警复访记录（' || coalesce(new.revisit_result, '') || '）',
           '预警事件：' || new.id || E'\n' ||
           '发生位置：' || new.location || E'\n' ||
           '复访人员：' || coalesce(new.revisited_by, '') || E'\n' ||
           '复访说明：' || new.revisit_note,
           coalesce(new.revisited_by, '护工'),
           new.id
    returning id into rec_id;
    new.health_record_id := rec_id;
  end if;
  return new;
end $$;

drop trigger if exists trg_fall_revisit_archive on fall_alerts;
create trigger trg_fall_revisit_archive
  before update on fall_alerts
  for each row execute function write_fall_revisit_to_health_record();

-- 开启实时订阅（管家工作台 / 值班台可直接订阅升级与状态变更）
alter publication supabase_realtime add table fall_alerts;
