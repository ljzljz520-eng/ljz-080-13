import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, Empty, Popconfirm, Space, Statistic, Tag } from 'antd';
import {
  AlertOutlined,
  ArrowLeftOutlined,
  PhoneOutlined,
  SendOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { api, type AlertDetail, type AlertStats } from '../../api';
import { formatTime, formatCountdown, remainMs } from '../../utils';
import { SourceTag, StatusTag } from '../../components/StatusTag';
import './duty.less';

export default function DutyDeskPage() {
  const navigate = useNavigate();
  const [escalated, setEscalated] = useState<AlertDetail[]>([]);
  const [stats, setStats] = useState<AlertStats | null>(null);
  const [now, setNow] = useState(Date.now());
  const timerRef = useRef<number | undefined>(undefined);

  const load = useCallback(async () => {
    const [list, s] = await Promise.all([
      api.listAlerts('active', 'escalated'),
      api.stats(),
    ]);
    setEscalated(list);
    setStats(s);
  }, []);

  useEffect(() => {
    load();
    timerRef.current = window.setInterval(load, 5000);
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      window.clearInterval(timerRef.current);
      window.clearInterval(tick);
    };
  }, [load]);

  return (
    <div className="duty-page">
      <div className="duty-siren" />
      <header className="duty-topbar">
        <div className="duty-brand">
          <span className="duty-logo">🚨</span>
          <div>
            <div className="duty-title">社区值班台 · 跌倒升级事件</div>
            <div className="duty-sub">24 小时值守 · 超时未确认事件自动进入此队列</div>
          </div>
        </div>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/')}>
          返回入口
        </Button>
      </header>

      <div className="page">
        <div className="duty-stats">
          <div className="duty-stat">
            <AlertOutlined className="duty-stat-icon" />
            <Statistic title="待值班台处置" value={escalated.filter((d) => !d.alert.dutyAckAt).length} valueStyle={{ color: '#b91c1c' }} />
          </div>
          <div className="duty-stat">
            <SafetyCertificateOutlined className="duty-stat-icon" style={{ background: '#ffe4e6', color: '#be123c' }} />
            <Statistic title="值班台已接单跟进" value={escalated.filter((d) => d.alert.dutyAckAt).length} valueStyle={{ color: '#be123c' }} />
          </div>
          <div className="duty-stat">
            <Statistic title="管家处置中（未升级）" value={(stats?.active ?? 0) - (stats?.escalated ?? 0)} valueStyle={{ color: '#1d4ed8' }} />
          </div>
          <div className="duty-stat duty-stat-note">
            <div className="muted" style={{ lineHeight: 1.8 }}>
              SLA 规定确认时限：<b>{stats?.slaSeconds ?? 300}</b> 秒。
              逾期事件由系统自动升级；值班台接单后可代行派工、电话、复访结案等全部处置。
            </div>
          </div>
        </div>

        <div className="duty-list">
          {escalated.length === 0 && (
            <div className="card duty-empty">
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="暂无升级事件，所有预警都在规定时限内得到了确认"
              />
            </div>
          )}
          {escalated.map((d) => (
            <DutyCard
              key={d.alert.id}
              detail={d}
              now={now}
              onAck={async () => {
                await api.dutyAck(d.alert.id);
                load();
              }}
              onOpen={() => navigate(`/admin/alerts/${d.alert.id}?from=duty`)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function DutyCard({
  detail,
  now,
  onAck,
  onOpen,
}: {
  detail: AlertDetail;
  now: number;
  onAck: () => void;
  onOpen: () => void;
}) {
  const { alert: a, elder, contacts, lastVisit } = detail;
  const overdueMs = remainMs(a.slaDeadline, now);
  const c = contacts[0];

  return (
    <div className={`card duty-card ${a.dutyAckAt ? 'duty-card-acked' : 'duty-card-new'}`}>
      <div className="duty-card-flag">
                {a.dutyAckAt ? <Tag color="magenta">值班台跟进中</Tag> : <Badge status="error" text={<span style={{ color: '#b91c1c', fontWeight: 700 }}>待接单</span>} />}
      </div>
      <div className="duty-card-body">
        <div className="duty-card-head">
          <Space>
            <span className="elder-avatar" style={{ background: elder.photoColor, width: 48, height: 48 }}>
              {elder.name.slice(0, 1)}
            </span>
            <div>
              <div className="duty-elder-name">
                <b>{elder.name}</b>
                <span className="muted">
                  {elder.age} 岁 · {elder.gender === 'female' ? '女' : '男'}
                </span>
                <SourceTag source={a.source} />
                <StatusTag status={a.status} />
              </div>
              <div className="duty-location">
                📍 {a.location} · <span className="muted">{elder.address}</span>
              </div>
            </div>
          </Space>
          <div className="duty-timer">
            <div className="duty-timer-label">已超时</div>
            <div className="duty-timer-value">{formatCountdown(overdueMs).replace('已超时 ', '')}</div>
            <div className="duty-timer-sub">触发于 {a.escalatedAt ? formatTime(a.escalatedAt) : '-'}</div>
          </div>
        </div>

        <div className="duty-meta-row">
          <div>
            <span className="muted">预警时间：</span>
            {formatTime(a.createdAt)}
          </div>
          <div>
            <span className="muted">最近上门：</span>
            {lastVisit ? (
              <>
                {lastVisit.workerName} · {lastVisit.serviceType}
              </>
            ) : (
              '暂无'
            )}
          </div>
          <div>
            <span className="muted">第一联系人：</span>
            {c ? (
              <a href={`tel:${c.phone}`}>
                {c.name}（{c.relation}）{c.phone}
              </a>
            ) : (
              '未登记'
            )}
          </div>
        </div>

        <div className="duty-actions">
          {!a.dutyAckAt && (
            <Popconfirm title="确认接单？接单后处置责任转移至社区值班台" onConfirm={onAck}>
              <Button type="primary" danger icon={<SafetyCertificateOutlined />}>
                值班台立即接单
              </Button>
            </Popconfirm>
          )}
          <Button icon={<PhoneOutlined />} href={c ? `tel:${c.phone}` : `tel:${elder.phone}`}>
            拨打{c ? '联系人' : '老人'}电话
          </Button>
          <Button type="primary" ghost icon={<SendOutlined />} onClick={onOpen}>
            进入处置台（派工 / 复访结案）
          </Button>
        </div>
      </div>
    </div>
  );
}

