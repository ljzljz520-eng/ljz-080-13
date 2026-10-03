# NestJS 后端 · 跌倒预警服务

- `src/fall-alerts/`：预警事件核心模块（上报 / 确认 / 派工 / 通话 / 误报 / 升级 / 复访结案）
- `src/elders/`：老人档案、健康档案查询
- `src/common/data-store.ts`：内存数据层（演示用，字段对齐 Supabase 表）
- `supabase/schema.sql`：Supabase/Postgres 建表脚本、升级函数与复访入档触发器

环境变量：

- `PORT`（默认 3000）
- `ALERT_SLA_SECONDS`（默认 300）：预警必须在该秒数内被确认，否则自动升级
- `SCAN_INTERVAL_MS`（默认 5000）：升级扫描间隔
