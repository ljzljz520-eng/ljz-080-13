import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, DotLoading, Result, Space, Tag } from 'antd-mobile';
import { api, type AlertDetail } from '../../api';
import { formatClock, formatTime, relativeFromNow, remainMs, formatCountdown } from '../../utils';
import { STATUS_META, SOURCE_META, TIMELINE_META } from '../../styles/status';
import './h5.less';

export default function H5StatusPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<AlertDetail | null>(null);
  const [error, setError] = useState('');
  const [, setTick] = useState(0);
  const timerRef = useRef<number | undefined>(undefined);

  const load = useCallback(async () => {
    try {
      setDetail(await api.alertDetail(id));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [id]);

  useEffect(() => {
    load();
    timerRef.current = window.setInterval(load, 5000);
    const ticker = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => {
      window.clearInterval(timerRef.current);
      window.clearInterval(ticker);
    };
  }, [load]);

  if (error) {
    return (
      <div className="h5-page">
        <Result status="error" title="事件加载失败" description={error} />
        <div style={{ textAlign: 'center' }}>
          <a onClick={() => navigate('/h5')} className="h5-link">
            返回重新上报
          </a>
        </div>
      </div>
    );
  }
  if (!detail) {
    return (
      <div className="h5-page" style={{ paddingTop: 80, textAlign: 'center' }}>
        <DotLoading color="primary" style={{ fontSize: 32 }} />
      </div>
    );
  }

  const { alert: a, elder, contacts, worker, timeline } = detail;
  const meta = STATUS_META[a.status];
  const active = !['resolved', 'false_alarm'].includes(a.status);
  const rem = remainMs(a.slaDeadline);
  const primaryContact = contacts[0];

  return (
    <div className="h5-page">
      <div
        className="h5-status-hero"
        style={{
          background: active
            ? 'linear-gradient(135deg, #ff8a5c, #f43f5e)'
            : a.status === 'resolved'
              ? 'linear-gradient(135deg, #34d399, #059669)'
              : 'linear-gradient(135deg, #9ca3af, #6b7280)',
        }}
      >
        <div className="h5-status-label">{meta.label}</div>
        <div className="h5-status-title">
          {active ? '管家正在处理，请保持电话畅通' : a.status === 'resolved' ? '事件已处理完成' : '本次预警为误报'}
        </div>
        {active && (
          <div className="h5-sla">
            {a.status === 'escalated' ? '⏱ 已升级社区值班台，值班员正在接单' : `⏱ ${formatCountdown(rem)} · 超时自动升级`}
          </div>
        )}
      </div>

      <Space direction="vertical" block style={{ '--gap': '12px' }}>
        <Card className="h5-card" title="老人信息">
          <div className="h5-elder-row">
            <span className="elder-avatar" style={{ background: elder.photoColor, width: 42, height: 42 }}>
              {elder.name.slice(0, 1)}
            </span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 16 }}>{elder.name}</div>
              <div className="muted" style={{ fontSize: 12.5 }}>
                {elder.age} 岁 · {elder.address}
              </div>
            </div>
            <Tag fill="outline" color="primary" style={{ marginLeft: 'auto' }}>
              {SOURCE_META[a.source].icon} {SOURCE_META[a.source].label}
            </Tag>
          </div>
          <div className="h5-kv-row">
            <span className="muted">上报时间</span>
            <span>{formatTime(a.createdAt)}</span>
          </div>
          <div className="h5-kv-row">
            <span className="muted">跌倒位置</span>
            <span>{a.location}</span>
          </div>
          {a.reporterNote && (
            <div className="h5-kv-row">
              <span className="muted">现场描述</span>
              <span>{a.reporterNote}</span>
            </div>
          )}
        </Card>

        {primaryContact && (
          <Card className="h5-card" title="紧急联系人">
            <div className="h5-kv-row">
              <span>
                {primaryContact.name}（{primaryContact.relation}）
              </span>
              <a href={`tel:${primaryContact.phone}`} className="h5-tel">
                📞 {primaryContact.phone}
              </a>
            </div>
          </Card>
        )}

        {worker && (
          <Card className="h5-card" title="上门护工">
            <div className="h5-kv-row">
              <span>
                {worker.name} · {worker.title}
              </span>
              <a href={`tel:${worker.phone}`} className="h5-tel">
                📞 {worker.phone}
              </a>
            </div>
          </Card>
        )}

        {a.status === 'resolved' && (
          <Card className="h5-card" title="复访结果（已写入健康档案）">
            <div className="h5-revisit">
              <div>{a.revisitNote}</div>
              <div className="muted" style={{ marginTop: 8, fontSize: 12.5 }}>
                复访人：{a.revisitedBy} · {relativeFromNow(a.resolvedAt!)}
              </div>
            </div>
          </Card>
        )}

        <Card className="h5-card" title="处理进度">
          <div className="h5-timeline">
            {timeline.map((t) => (
              <div className="h5-tl-item" key={t.id}>
                <div
                  className="h5-tl-dot"
                  style={{ background: TIMELINE_META[t.type]?.color ?? '#999' }}
                />
                <div className="h5-tl-body">
                  <div className="h5-tl-title">
                    <span style={{ color: TIMELINE_META[t.type]?.color }}>
                      {TIMELINE_META[t.type]?.label ?? t.type}
                    </span>
                    <span className="muted" style={{ fontSize: 11.5 }}>
                      {formatClock(t.at)}
                    </span>
                  </div>
                  <div className="h5-tl-detail">{t.detail}</div>
                  <div className="muted h5-tl-actor">{t.actor}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </Space>
    </div>
  );
}
