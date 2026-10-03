import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, Segmented, Table, Tag, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { api } from '../../api/client';
import type { DutyStats, IncidentSummary } from '../../api/types';
import { STATUS_META } from '../../api/types';
import { formatDateTime, relativeFromNow } from '../../utils/format';
import { usePolling } from '../../utils/usePolling';

type Filter = 'active' | 'pending' | 'all';

export default function Workbench() {
  const navigate = useNavigate();
  const [list, setList] = useState<IncidentSummary[]>([]);
  const [stats, setStats] = useState<DutyStats | null>(null);
  const [filter, setFilter] = useState<Filter>('active');
  const [now, setNow] = useState(0);

  useEffect(() => {
    api.stats().then(setStats).catch(() => undefined);
    api.listIncidents().then(setList).catch(() => undefined);
  }, []);

  usePolling(() => {
    api.listIncidents().then(setList).catch(() => undefined);
    api.stats().then(setStats).catch(() => undefined);
  }, 5000);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const data = useMemo(() => {
    let rows = [...list];
    if (filter === 'active') {
      rows = rows.filter((i) =>
        ['pending', 'acting', 'dispatched', 'escalated'].includes(i.status),
      );
    } else if (filter === 'pending') {
      rows = rows.filter((i) => i.status === 'pending' || i.status === 'escalated');
    }
    return rows;
  }, [list, filter]);

  const columns: ColumnsType<IncidentSummary> = [
    {
      title: '事件编号',
      dataIndex: 'code',
      width: 158,
      render: (code: string) => <b style={{ fontSize: 12.5 }}>{code}</b>,
    },
    {
      title: '老人',
      dataIndex: 'elderName',
      width: 96,
      render: (v: string, r) => (
        <span>
          <b>{v}</b>
          <div style={{ fontSize: 11.5, color: '#98a1ae' }}>{r.elderAddress}</div>
        </span>
      ),
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
      title: '状态',
      dataIndex: 'status',
      width: 120,
      render: (s: keyof typeof STATUS_META) => (
        <Badge color={STATUS_META[s].color} text={STATUS_META[s].label} />
      ),
    },
    {
      title: '上报时间',
      dataIndex: 'createdAt',
      width: 170,
      render: (v: string) => (
        <Tooltip title={relativeFromNow(v)}>
          <span style={{ fontSize: 12.5 }}>{formatDateTime(v)}</span>
        </Tooltip>
      ),
    },
    {
      title: '确认倒计时',
      key: 'sla',
      width: 150,
      render: (_, r) => {
        if (r.acknowledgedAt) {
          return <span style={{ color: '#52c41a', fontSize: 12.5 }}>✓ 已确认</span>;
        }
        const remain =
          r.slaSeconds - Math.floor((now - new Date(r.createdAt).getTime()) / 1000);
        if (r.status === 'escalated' || remain <= 0) {
          return (
            <span className="countdown-cell overtime">
              ⚠ 已升级值班台
            </span>
          );
        }
        const mm = String(Math.floor(remain / 60)).padStart(2, '0');
        const ss = String(remain % 60).padStart(2, '0');
        return (
          <span className={`countdown-cell ${remain <= 30 ? 'urgent' : ''}`}>
            {mm}:{ss}
          </span>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 110,
      render: (_, r) => (
        <Button
          type={r.status === 'pending' ? 'primary' : 'default'}
          size="small"
          onClick={() => navigate(`/admin/incidents/${r.id}`)}
        >
          {r.status === 'pending' ? '立即处置' : '查看 / 处置'}
        </Button>
      ),
    },
  ];

  return (
    <>
      <header className="admin-topbar">
        <div className="page-title">🚨 跌倒预警工作台</div>
        <div className="top-right">
          <span>管家 林敏</span>
          <Tag color="cyan">幸福里社区站</Tag>
        </div>
      </header>
      <div className="admin-content">
        <div className="stat-row">
          <div className="stat-card stat-danger">
            <div className="s-label">待确认（倒计时中）</div>
            <div className="s-value">{stats?.pending ?? '-'}</div>
            <div className="s-foot">须在确认时限内接单</div>
          </div>
          <div className="stat-card stat-warn">
            <div className="s-label">处置中 / 已派单</div>
            <div className="s-value">{stats?.acting ?? '-'}</div>
            <div className="s-foot">管家跟进与护工上门</div>
          </div>
          <div className="stat-card stat-purple">
            <div className="s-label">已升级值班台</div>
            <div className="s-value">{stats?.escalated ?? '-'}</div>
            <div className="s-foot">超时未确认自动升级</div>
          </div>
          <div className="stat-card stat-ok">
            <div className="s-label">今日复访归档</div>
            <div className="s-value">{stats?.resolvedToday ?? '-'}</div>
            <div className="s-foot">已写入老人健康档案</div>
          </div>
          <div className="stat-card">
            <div className="s-label">今日误报</div>
            <div className="s-value" style={{ color: '#8c8c8c' }}>
              {stats?.falseAlarmToday ?? '-'}
            </div>
            <div className="s-foot">电话核实后关闭</div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">预警事件列表</span>
            <span className="panel-sub">
              数据每 5 秒自动刷新，确认倒计时每秒更新
            </span>
            <div className="panel-right">
              <Segmented
                value={filter}
                onChange={(v) => setFilter(v as Filter)}
                options={[
                  { label: '进行中', value: 'active' },
                  { label: '待确认/已升级', value: 'pending' },
                  { label: '全部', value: 'all' },
                ]}
              />
            </div>
          </div>
          <Table<IncidentSummary>
            rowKey="id"
            size="middle"
            columns={columns}
            dataSource={data}
            pagination={{ pageSize: 8, hideOnSinglePage: true }}
            rowClassName={(r) =>
              r.status === 'pending' ? 'row-pending' : ''
            }
          />
        </div>
      </div>
    </>
  );
}
