# 颐年守护 · 智慧养老平台

跌倒预警闭环链路：从**老人手环 / 家属上报疑似摔倒**，到管家同页处置、超时升级社区值班台，再到**复访结果写入老人健康档案**结案。

## 技术栈

- **前端**：React 19 + TypeScript + Vite + React Router v7 + antd（PC / 值班台）+ antd-mobile（H5）+ LESS
- **后端**：Node.js 20 + NestJS 11 + TypeScript
- **数据库**：Supabase（Postgres），建表脚本见 `apps/server/supabase/schema.sql`
- 当前可直接运行：后端内置与 Supabase 表结构一一对应的内存数据层（含演示数据），无需外部依赖

## 三个入口

| 入口 | 路由 | 使用者 | 说明 |
| --- | --- | --- | --- |
| 入口导航 | `/` | — | 三个工作台的导航页 |
| 用户端 H5 | `/h5` | 家属 / 手环 | 一键上报疑似跌倒（老人、位置、现场描述），并可实时查看处理进度 |
| 管家工作台 | `/admin` | 社区管家 | 预警列表 + SLA 倒计时；详情页聚合**位置、时间、最近一次上门服务、紧急联系人**；可确认、派护工、拨打电话、标记误报、复访结案 |
| 社区值班台 | `/duty` | 值班员 | 仅接收超过规定时限无人确认、被系统自动升级的事件；接单后可代行全部处置 |

## 跌倒预警链路（状态机）

```
pending（待确认）
  ├─ 管家确认/派工/通话 ─→ dispatched / calling
  │                        └─ 复访登记 ─→ resolved（结果写入 health_records）
  ├─ 标记误报 ───────────→ false_alarm
  └─ 超过 SLA 仍未确认 ──→ escalated（社区值班台）─接单→ 继续处置 ─→ resolved / false_alarm
```

- **SLA 升级**：`EscalationScheduler` 每 5 秒扫描一次（`ALERT_SLA_SECONDS` 默认 300 秒），
  仅升级 `pending` 且 `acknowledgedAt` 为空的事件；已派工 / 通话中 / 已结案的不会升级。
  Supabase 环境可用 `schema.sql` 中的 `escalate_overdue_fall_alerts()` + pg_cron 替代轮询。
- **复访入档**：`POST /fall-alerts/:id/resolve` 在更新事件状态的同一步写入
  `health_records`（type=fall，带 alertId），数据库层另有 `trg_fall_revisit_archive`
  触发器兜底，复访结果不会只停留在消息 / 时间线列表。
- **全链路审计**：每个动作（创建、确认、派工、通话、误报、升级、值班接单、结案）写
  `alert_timeline`，通话写 `alert_calls`。

## 本地运行

```bash
# 安装依赖（npm workspaces）
npm install

# 后端（默认 http://localhost:3000/api，SLA 300s）
cd apps/server && npm run start:dev

# 前端（http://localhost:5173，已配置 /api 代理到 3000）
cd apps/client && npm run dev
```

演示时想快速观察自动升级：

```bash
ALERT_SLA_SECONDS=10 SCAN_INTERVAL_MS=2000 npm run start:dev
```

`H5 上报 → 管家工作台（不操作）→ 10 秒后事件出现在 /duty 值班台`。

## 主要接口（前缀 /api）

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/fall-alerts` | 手环 / 家属上报 |
| GET | `/fall-alerts?scope=active&status=` | 预警列表 |
| GET | `/fall-alerts/:id` | 事件聚合详情（老人/联系人/最近上门/护工/时间线/通话） |
| POST | `/fall-alerts/:id/acknowledge` | 管家确认接管 |
| POST | `/fall-alerts/:id/dispatch` | 派护工上门 |
| POST | `/fall-alerts/:id/call` | 登记拨打电话结果 |
| POST | `/fall-alerts/:id/false-alarm` | 标记误报 |
| POST | `/fall-alerts/:id/duty-acknowledge` | 社区值班台接单 |
| POST | `/fall-alerts/:id/resolve` | 复访结案并写入健康档案 |
| GET | `/fall-alerts/stats/overview` | 工作台统计 |
| GET | `/elders/:id` | 老人档案（联系人/上门记录/健康档案） |

## 测试

```bash
cd apps/server && npm test
```

覆盖：信息同页聚合、派工、误报不升级、超时升级、已确认不升级、复访必须落健康档案、缺复访说明拒绝结案。

## Docker

```bash
docker compose up
# frontend http://localhost:3000  backend http://localhost:8000
```
