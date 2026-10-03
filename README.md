# 颐家云 · 养老平台 —— 跌倒预警处置链路

本项目在 React + NestJS 空骨架基础上，落地了一条完整的**跌倒预警闭环**：

```
老人手环自动预警 / 家属 H5 一键上报
        │
        ▼
信息聚合一页呈现：位置、发生时间、最近一次上门服务、紧急联系人
        │
        ▼
管家处置：确认接单 │ 派护工上门 │ 拨打电话 │ 标记误报
        │
        ├─ 超过规定时限无人确认 → 自动升级社区值班台 → 值班员认领接手
        ▼
护工上门复访 → 复访结果写回事件并写入「老人健康档案」（非消息列表）
```

## 技术栈

- **前端**：React 19 + TypeScript + Vite + React Router v7
  - 家属端 H5：`antd-mobile`（`/h5`，一键上报、处置进度、事件时间线）
  - 管理端 PC：`antd` v6（`/admin`，预警工作台、事件处置页、社区值班台、健康档案）
  - LESS
- **后端**：Node.js + NestJS + TypeScript
- **数据库**：Supabase（Postgres），schema 见 [`db/schema.sql`](db/schema.sql)
  - 未配置真实 Supabase 时自动使用**带演示种子数据的内存存储**，无需数据库即可启动体验
  - 配置 `SUPABASE_URL`（非占位符）+ `SUPABASE_SERVICE_ROLE_KEY` 后自动切换为 Supabase 实现

## 快速开始

### Docker

```bash
docker compose up
```

- 前端入口：http://localhost:3000
- 后端 API：http://localhost:8000/api
- （可选）调整确认时限：`FALL_ACK_SLA_SECONDS=60 docker compose up`

### 本地开发

```bash
# 后端（默认 3000）
cd apps/server && npm install && npm run start:dev

# 前端（5173，/api 代理到 http://localhost:8000）
cd apps/client && npm install && npm run dev
```

演示用确认时限默认 180 秒，可通过环境变量调小观察自动升级：

```bash
FALL_ACK_SLA_SECONDS=10 FALL_SCAN_INTERVAL_MS=2000 npm run start:dev
```

## 预置演示数据

- 老人：王秀兰（高风险）、李长根（中风险）、张桂芳（高风险），含紧急联系人与基础病
- 护工：刘护 / 赵护值班、孙护休息；含历史上门服务记录
- 事件：
  - `FALL-*-1001` 王秀兰，**手环预警、待确认**（可直接观察倒计时与超时升级）
  - `FALL-*-1002` 李长根，家属上报、已派护工、已电话联系女儿
  - `FALL-*-1003` 张桂芳，已复访归档，健康档案中可见复访条目

## 页面与操作

| 入口 | 路径 | 能力 |
| --- | --- | --- |
| 门户选择 | `/` | H5 / PC 双端入口 |
| 家属上报 | `/h5` | 选择老人 → SOS 一键上报（支持 GPS 补位）→ 查看实时进度 |
| 处置进度 | `/h5/track` | 全部事件、确认倒计时、升级提示、时间线、复访结果 |
| 预警工作台 | `/admin` | 待确认/处置中/升级/归档统计、SLA 倒计时、快速处置 |
| 事件处置页 | `/admin/incidents/:id` | 位置/时间/最近上门/联系人聚合一页；确认、派单、拨号、误报、复访 |
| 社区值班台 | `/admin/duty` | 超时升级队列、值班员认领、全线事件监控 |
| 老人健康档案 | `/admin/records` | 老人档案、跌倒复访记录（可回溯原始事件）、上门服务历史 |

## API 一览

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `POST` | `/api/incidents` | 手环/家属上报，创建疑似跌倒事件 |
| `GET` | `/api/incidents` | 事件列表（工作台/值班台） |
| `GET` | `/api/incidents/stats` | 待确认、处置中、升级、今日归档/误报统计 |
| `GET` | `/api/incidents/:id` | **聚合详情**：事件 + 老人档案 + 最近一次上门 |
| `POST` | `/api/incidents/:id/acknowledge` | 管家确认（停止升级计时） |
| `POST` | `/api/incidents/:id/dispatch` | 派护工（派单即确认） |
| `POST` | `/api/incidents/:id/calls` | 登记拨打老人/联系人/护工/值班台电话 |
| `POST` | `/api/incidents/:id/false-alarm` | 标记误报（关闭，不入健康档案） |
| `POST` | `/api/incidents/:id/revisit` | 提交复访结果（**同步写入健康档案**） |
| `POST` | `/api/incidents/:id/claim` | 社区值班台认领升级事件 |
| `GET` | `/api/elders` / `/api/caregivers` | 老人 / 护工名录 |
| `GET` | `/api/elders/:id/profile` | 老人档案 + 健康记录 + 上门历史 |
| `GET` | `/api/health-records` | 健康档案列表 |

后台 `EscalationScheduler` 每 `FALL_SCAN_INTERVAL_MS` 毫秒扫描一次：
状态为 `pending` 且未确认、距创建超过 `FALL_ACK_SLA_SECONDS` 秒的事件会被自动置为
`escalated` 并写入时间线，进入社区值班台队列。

## 状态机

`pending`（待确认）→ `acting`（已确认/值班台认领）→ `dispatched`（已派护工）
→ `revisited`（复访完成归档）；任意活跃状态可 → `false_alarm`（误报关闭）；
`pending` 超时 → `escalated` →（值班台认领）`acting`。

## 目录

```
apps/
  client/            # React 双端（H5 + PC）
    src/pages/h5     # 家属端：上报 / 进度 / 事件详情
    src/pages/admin  # 管理端：工作台 / 处置页 / 值班台 / 健康档案
  server/
    src/common       # 领域模型
    src/database     # 数据层抽象 + Supabase / 内存实现 + 种子数据
    src/incidents    # 预警事件主链路 + 超时升级调度器
    src/elders       # 老人档案 / 护工 / 健康记录
db/schema.sql        # Supabase Postgres 建表脚本
```

## 测试

```bash
cd apps/server
npm test          # 单元测试（上报、派单、复访入档、超时升级、认领、误报）
npm run test:e2e  # HTTP 端到端
```
