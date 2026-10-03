import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Badge, Button, Empty, Input, Segmented, Statistic, Tabs, Tooltip } from 'antd';
import {
  AlertOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  SendOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { api, type AlertDetail, type AlertStats } from '../../api';
import { formatTime, relativeFromNow } from '../../utils';
import { StatusTag, SourceTag } from '../../components/StatusTag';
import { Countdown } from '../../components/Countdown';
import './console.less';

type TabKey = 'active' | 'pending' | 'escalated' | 'history';

export default function AdminConsolePage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<AlertDetail[]>([]);
  const [stats, setStats] = useState<AlertStats | null>(null);
  const [tab, setTab] = useState<TabKey>('active');
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<number | undefined>(undefined);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, s] = await Promise.all([
        tab === 'history'
          ? api.listAlerts('all').then((r) =>
              r.filter((d) => ['resolved', 'false_alarm'].includes(d.alert.status)),
            )
          : tab === 'pending'
            ? api.listAlerts('active', 'pending')
            : tab === 'escalated'
              ? api.listAlerts('active', 'escalated')
              : api.listAlerts('active'),
        api.stats(),
      ]);
      setItems(list);
      setStats(s);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    load();
    timerRef.current = window.setInterval(load, 5000);
    return () => window.clearInterval(timerRef.current);
  }, [load]);

  const filtered = items.filter((d) => {
    if (!keyword.trim()) return true;
    const k = keyword.trim();
    return (
      d.elder.name.includes(k) ||
      d.elder.address.includes(k) ||
      d.alert.location.includes(k)
    );
  });

  const counts: Record<TabKey, number> = {
    active: stats?.active ?? 0,
    pending: stats?.pending ?? 0,
    escalated: stats?.escalated ?? 0,
    history: (stats?.resolved ?? 0) + (stats?.falseAlarm ?? 0),
  };

  return (
    <div className="console">
      <header className="console-topbar">
        <div className="console-brand">
          <span className="console-logo">🛡️</span>
          <div>
            <div className="console-title">颐年守护 · 管家工作台</div>
            <div className="console-sub">幸福里社区服务中心 · 值班管家</div>
          </div>
        </div>
        <div className="console-top-actions">
          <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>
            刷新
          </Button>
          <Button type="primary" onClick={() => navigate('/duty')}>
            前往社区值班台
          </Button>
        </div>
      </header>

      <div className="page">
        {stats && stats.overdue > 0 && (
          <Alert
            className="console-alert"
            type="error"
            showIcon
            banner
            message={`${stats.overdue} 条预警已超过确认时限，系统已升级至社区值班台`}
          />
        )}

        <div className="stat-grid">
          <div className="stat-card stat-todo">
            <AlertOutlined className="stat-icon" />
            <Statistic title="待确认" value={stats?.pending ?? '-'} valueStyle={{ color: '#b45309' }} />
          </div>
          <div className="stat-card">
            <SendOutlined className="stat-icon" style={{ color: '#1d4ed8' }} />
            <Statistic title="处置中" value={(stats?.dispatched ?? 0) + Math.max(0, (stats?.active ?? 0) - (stats?.pending ?? 0) - (stats?.dispatched ?? 0) - (stats?.escalated ?? 0))} valueStyle={{ color: '#1d4ed8' }} />
          </div>
          <div className="stat-card stat-esc">
            <ClockCircleOutlined className="stat-icon" />
            <Statistic title="已升级值班台" value={stats?.escalated ?? '-'} valueStyle={{ color: '#b91c1c' }} />
          </div>
          <div className="stat-card">
            <CheckCircleOutlined className="stat-icon" style={{ color: '#15803d' }} />
            <Statistic title="今日已结案" value={stats?.resolved ?? '-'} valueStyle={{ color: '#15803d' }} />
          </div>
        </div>

        <div className="console-toolbar">
          <Tabs
            activeKey={tab}
            onChange={(k) => setTab(k as TabKey)}
            items={[
              { key: 'active', label: <Badge count={counts.active} size="small">全部活跃</Badge> },
              { key: 'pending', label: <Badge count={counts.pending} size="small">待确认</Badge> },
              { key: 'escalated', label: <Badge count={counts.escalated} size="small" color="red">已升级</Badge> },
              { key: 'history', label: '历史事件' },
            ]}
          />
          <div className="toolbar-right">
            <Segmented
              options={[
                { label: '管家视图', value: 'manager' },
                { label: '大屏', value: 'board', disabled: true },
              ]}
              defaultValue="manager"
            />
            <Input.Search
              placeholder="搜索老人 / 位置 / 地址"
              allowClear
              style={{ width: 240 }}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>
        </div>

        <div className="alert-list">
          {filtered.length === 0 && !loading && (
            <Empty description="暂无相关预警" style={{ padding: '60px 0' }} />
          )}
          {filtered.map((d) => (
            <AlertRow key={d.alert.id} detail={d} onOpen={() => navigate(`/admin/alerts/${d.alert.id}`)} onProfile={() => navigate(`/admin/elders/${d.elder.id}`)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function AlertRow({
  detail,
  onOpen,
  onProfile,
}: {
  detail: AlertDetail;
  onOpen: () => void;
  onProfile: () => void;
}) {
  const { alert: a, elder, contacts, lastVisit } = detail;
  const active = !['resolved', 'false_alarm'].includes(a.status);
  const escalated = a.status === 'escalated';

  return (
    <div
      className={`alert-row card ${escalated ? 'alert-row-escalated' : ''}`}
      onClick={onOpen}
    >
      <div className="alert-row-left">
        <span className="elder-avatar" style={{ background: elder.photoColor }} onClick={(e) => { e.stopPropagation(); onProfile(); }}>
          {elder.name.slice(0, 1)}
        </span>
        <div className="alert-row-info">
          <div className="alert-row-name">
            <b>{elder.name}</b>
            <span className="muted">
              {elder.age} 岁 · {elder.gender === 'female' ? '女' : '男'}
            </span>
            <SourceTag source={a.source} />
            <StatusTag status={a.status} />
          </div>
          <div className="alert-row-meta">
            <Tooltip title={a.locationDetail ?? a.location}>
              📍 {a.location}
            </Tooltip>
            <span>🕐 {formatTime(a.createdAt)}</span>
            <span className="muted">· {relativeFromNow(a.createdAt)}</span>
          </div>
          <div className="alert-row-context">
            <span>
              最近上门：
              {lastVisit ? (
                <>
                  <b>{lastVisit.workerName}</b> · {lastVisit.serviceType} ·{' '}
                  {relativeFromNow(lastVisit.visitedAt)}
                </>
              ) : (
                <span className="muted">暂无记录</span>
              )}
            </span>
            <span>
              紧急联系人：
              {contacts[0] ? (
                <>
                  {contacts[0].name}（{contacts[0].relation}）{contacts[0].phone}
                </>
              ) : (
                <span className="muted">未登记</span>
              )}
            </span>
          </div>
        </div>
      </div>
      <div className="alert-row-right" onClick={(e) => e.stopPropagation()}>
        <div className="sla-box">
          <Countdown deadline={a.slaDeadline} active={active && !a.acknowledgedAt} />
          {a.acknowledgedAt && active && <div className="sla-acked">管家已接管</div>}
          {!active && a.resolvedAt && <div className="muted">结案于 {relativeFromNow(a.resolvedAt)}</div>}
        </div>
        <Button type={active ? 'primary' : 'default'} onClick={onOpen}>
          {active ? '进入处置' : '查看详情'}
        </Button>
      </div>
    </div>
  );
}
