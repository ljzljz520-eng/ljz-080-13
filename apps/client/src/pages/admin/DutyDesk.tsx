import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Badge, Button, Table, Tag, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { api } from '../../api/client';
import type { DutyStats, IncidentSummary } from '../../api/types';
import { STATUS_META } from '../../api/types';
import { formatDateTime, relativeFromNow } from '../../utils/format';
import { usePolling } from '../../utils/usePolling';

export default function DutyDesk() {
  const navigate = useNavigate();
  const [list, setList] = useState<IncidentSummary[]>([]);
  const [stats, setStats] = useState<DutyStats | null>(null);

  useEffect(() => {
    api.listIncidents().then(setList).catch(() => undefined);
    api.stats().then(setStats).catch(() => undefined);
  }, []);
  usePolling(() => {
    api.listIncidents().then(setList).catch(() => undefined);
    api.stats().then(setStats).catch(() => undefined);
  }, 5000);

  const escalated = list.filter((i) => i.status === 'escalated');

  const columns: ColumnsType<IncidentSummary> = [
    {
      title: '事件编号',
      dataIndex: 'code',
      width: 160,
      render: (v: string) => <b>{v}</b>,
    },
    { title: '老人', dataIndex: 'elderName', width: 100 },
    {
      title: '位置',
      dataIndex: 'elderAddress',
      render: (v: string) => <span style={{ fontSize: 12.5 }}>{v}</span>,
    },
    {
      title: '来源',
      dataIndex: 'source',
      width: 110,
      render: (s: string) =>
        s === 'wristband' ? (
          <Tag color="volcano">⌚ 手环预警</Tag>
        ) : (
          <Tag color="orange">📱 家属上报</Tag>
        ),
    },
    {
      title: '上报时间',
      dataIndex: 'createdAt',
      width: 170,
      render: (v: string) => (
        <Tooltip title={relativeFromNow(v)}>{formatDateTime(v)}</Tooltip>
      ),
    },
    {
      title: '升级等待',
      dataIndex: 'escalatedAt',
      width: 150,
      render: (v?: string) =>
        v ? (
          <span style={{ color: '#722ed1', fontWeight: 600 }}>
            已等待 {relativeFromNow(v)}
          </span>
        ) : (
          '--'
        ),
    },
    {
      title: '操作',
      key: 'action',
      width: 140,
      render: (_, r) => (
        <Button
          type="primary"
          danger
          size="small"
          onClick={() => navigate(`/admin/incidents/${r.id}`)}
        >
          认领并处置
        </Button>
      ),
    },
  ];

  return (
    <>
      <header className="admin-topbar">
        <div className="page-title">📡 社区值班台 · 升级事件队列</div>
        <div className="top-right">
          <span>值班员 周倩</span>
          <Tag color="purple">7×24 值班</Tag>
        </div>
      </header>
      <div className="admin-content">
        <Alert
          style={{ marginBottom: 16 }}
          type="info"
          showIcon
          message={`管家未在规定时限内确认的跌倒预警会自动升级到值班台，当前待认领 ${
            stats?.escalated ?? 0
          } 起。值班台认领后可继续派单、联系家属并录入复访结果。`}
        />
        <div className="stat-row">
          <div className="stat-card stat-purple">
            <div className="s-label">待认领升级事件</div>
            <div className="s-value">{stats?.escalated ?? 0}</div>
          </div>
          <div className="stat-card stat-danger">
            <div className="s-label">管家待确认</div>
            <div className="s-value">{stats?.pending ?? 0}</div>
          </div>
          <div className="stat-card stat-warn">
            <div className="s-label">全线处置中</div>
            <div className="s-value">{stats?.acting ?? 0}</div>
          </div>
          <div className="stat-card stat-ok">
            <div className="s-label">今日已归档</div>
            <div className="s-value">{stats?.resolvedToday ?? 0}</div>
          </div>
          <div className="stat-card">
            <div className="s-label">今日误报</div>
            <div className="s-value" style={{ color: '#8c8c8c' }}>
              {stats?.falseAlarmToday ?? 0}
            </div>
          </div>
        </div>
        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">升级队列</span>
            <span className="panel-sub">按升级时间倒序，每 5 秒自动刷新</span>
          </div>
          <Table<IncidentSummary>
            rowKey="id"
            columns={columns}
            dataSource={escalated}
            locale={{
              emptyText: '🎉 暂无超时升级事件，各站响应正常',
            }}
            pagination={false}
          />
        </div>

        <div className="panel" style={{ marginTop: 16 }}>
          <div className="panel-head">
            <span className="panel-title">全线进行中事件（值班监控）</span>
          </div>
          <Table<IncidentSummary>
            rowKey="id"
            size="small"
            columns={[
              { title: '编号', dataIndex: 'code', width: 150 },
              { title: '老人', dataIndex: 'elderName', width: 90 },
              {
                title: '状态',
                dataIndex: 'status',
                width: 130,
                render: (s: keyof typeof STATUS_META) => (
                  <Badge
                    color={STATUS_META[s].color}
                    text={STATUS_META[s].label}
                  />
                ),
              },
              {
                title: '上报时间',
                dataIndex: 'createdAt',
                render: (v: string) => formatDateTime(v),
              },
            ]}
            dataSource={list.filter((i) =>
              ['pending', 'acting', 'dispatched', 'escalated'].includes(i.status),
            )}
            pagination={false}
            onRow={(r) => ({
              onClick: () => navigate(`/admin/incidents/${r.id}`),
              style: { cursor: 'pointer' },
            })}
          />
        </div>
      </div>
    </>
  );
}
