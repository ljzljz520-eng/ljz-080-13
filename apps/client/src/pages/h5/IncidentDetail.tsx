import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, Result, Tag } from 'antd-mobile';
import { api } from '../../api/client';
import type { IncidentDetail } from '../../api/types';
import { OUTCOME_LABEL, STATUS_META } from '../../api/types';
import { formatDateTime, formatCountdown, remainingSeconds } from '../../utils/format';
import { usePolling } from '../../utils/usePolling';

const TIMELINE_META: Record<string, { title: string; color: string }> = {
  created: { title: '事件上报', color: '#f5222d' },
  acknowledged: { title: '管家已确认', color: '#fa8c16' },
  dispatched: { title: '已派护工上门', color: '#1677ff' },
  called: { title: '电话联系', color: '#13c2c2' },
  escalated: { title: '超时升级值班台', color: '#722ed1' },
  claimed: { title: '值班台认领', color: '#9254de' },
  false_alarm: { title: '标记误报', color: '#8c8c8c' },
  revisited: { title: '复访完成 · 已入健康档案', color: '#52c41a' },
};

export default function IncidentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<IncidentDetail | null>(null);

  useEffect(() => {
    if (id) api.incident(id).then(setData).catch(() => undefined);
  }, [id]);

  usePolling(() => {
    if (id && (!data || ['pending', 'acting', 'dispatched', 'escalated'].includes(data.status))) {
      api.incident(id).then(setData).catch(() => undefined);
    }
  }, 5000);

  if (!data) {
    return (
      <div className="h5-body" style={{ color: '#98a1ae', paddingTop: 40, textAlign: 'center' }}>
        加载中…
      </div>
    );
  }

  const remain =
    data.status === 'pending'
      ? remainingSeconds(data.createdAt, data.slaSeconds)
      : null;
  const done = data.status === 'revisited' || data.status === 'false_alarm';

  return (
    <>
      <div className="h5-header">
        <div className="h5-title">
          <span onClick={() => navigate(-1)} style={{ fontSize: 16 }}>
            ‹
          </span>
          事件详情
          <span
            className="badge"
            style={{
              marginLeft: 'auto',
              background: STATUS_META[data.status].color,
            }}
          >
            {STATUS_META[data.status].label}
          </span>
        </div>
        <div className="h5-sub">
          {data.code} · {data.source === 'family' ? '家属上报' : '手环自动预警'}
        </div>
      </div>

      <div className="h5-body">
        {remain !== null && (
          <Card
            style={{
              marginBottom: 10,
              border: `1px solid ${remain > 0 ? '#ffd8cf' : '#e3d6f5'}`,
              background: remain > 0 ? '#fff6f3' : '#f7f2fd',
            }}
          >
            <div
              style={{
                color: remain > 0 ? '#e8473b' : '#722ed1',
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              {remain > 0 ? (
                <>
                  ⏳ 等待管家确认，剩余{' '}
                  <span className="countdown-tag">{formatCountdown(remain)}</span>
                  ，超时自动升级社区值班台
                </>
              ) : (
                <>⚠ 已超过确认时限，社区值班台接管处置中</>
              )}
            </div>
          </Card>
        )}

        <Card title="👵 老人信息" style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 14, lineHeight: 1.9 }}>
            <b>{data.elder.name}</b>（{data.elder.gender} · {data.elder.age} 岁）
            <br />
            📍 {data.address}
            <br />
            🕐 发生时间：{formatDateTime(data.occurredAt)}
            {data.sensorConfidence !== undefined && (
              <>
                <br />⌚ 手环置信度：{data.sensorConfidence}%
              </>
            )}
          </div>
        </Card>

        <Card title="📋 处置时间线" style={{ marginBottom: 10 }}>
          <div className="timeline-mini">
            {[...data.timeline].reverse().map((t) => {
              const meta = TIMELINE_META[t.type] ?? {
                title: t.type,
                color: '#8c8c8c',
              };
              return (
                <div className="tl-row" key={t.id}>
                  <span className="tl-dot" style={{ background: meta.color }} />
                  <div className="tl-body">
                    <div className="tl-title">{meta.title}</div>
                    {t.detail && <div className="tl-detail">{t.detail}</div>}
                    <div className="tl-time">
                      {formatDateTime(t.at)} · {t.actor}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {data.revisit && (
          <Card title="🏥 复访结果（已同步健康档案）" style={{ marginBottom: 10 }}>
            <Result
              status={data.revisit.hospitalAdvised ? 'warning' : 'success'}
              title={OUTCOME_LABEL[data.revisit.outcome]}
              description={
                <div style={{ lineHeight: 1.8, textAlign: 'left' }}>
                  {data.revisit.note}
                  <div style={{ marginTop: 8 }}>
                    {data.revisit.measures.map((m) => (
                      <Tag
                        key={m}
                        fill="outline"
                        style={{ marginBottom: 6, '--text-color': '#0e7c86' }}
                      >
                        {m}
                      </Tag>
                    ))}
                  </div>
                  {data.revisit.hospitalAdvised && (
                    <div style={{ color: '#e8473b', fontWeight: 600 }}>
                      ⚠ 护工建议就医，已通知家属
                    </div>
                  )}
                  <div style={{ color: '#98a1ae', fontSize: 12, marginTop: 8 }}>
                    上门护工：{data.revisit.caregiverName} · 记录人：
                    {data.revisit.by}
                  </div>
                </div>
              }
            />
          </Card>
        )}

        {done && !data.revisit && (
          <Card>
            <Result
              status="info"
              title="该事件为误报"
              description="管家已电话核实老人安全，事件关闭，不计入跌倒健康档案。"
            />
          </Card>
        )}
      </div>
    </>
  );
}
