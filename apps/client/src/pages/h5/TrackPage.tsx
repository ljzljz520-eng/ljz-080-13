import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Empty } from 'antd-mobile';
import { api } from '../../api/client';
import type { IncidentSummary } from '../../api/types';
import { STATUS_META } from '../../api/types';
import { formatDateTime, relativeFromNow, formatCountdown, remainingSeconds } from '../../utils/format';
import { usePolling } from '../../utils/usePolling';
import { useEffect } from 'react';

export default function TrackPage() {
  const navigate = useNavigate();
  const [list, setList] = useState<IncidentSummary[]>([]);

  useEffect(() => {
    api.listIncidents().then(setList).catch(() => undefined);
  }, []);

  usePolling(() => {
    api.listIncidents().then(setList).catch(() => undefined);
  }, 6000);

  return (
    <>
      <div className="h5-header">
        <div className="h5-title">🧭 处置进度</div>
        <div className="h5-sub">
          每一次上报都会生成可追踪的事件单，确认、派单、上门、复访全程留痕。
        </div>
      </div>
      <div className="h5-body">
        {list.length === 0 && <Empty description="暂无事件" style={{ marginTop: 60 }} />}
        {list.map((i) => {
          const meta = STATUS_META[i.status];
          const remain =
            i.status === 'pending'
              ? remainingSeconds(i.createdAt, i.slaSeconds)
              : null;
          return (
            <div
              className="track-card"
              key={i.id}
              onClick={() => navigate(`/h5/incident/${i.id}`)}
            >
              <div className="track-head">
                <div>
                  <div className="t-name">{i.elderName}</div>
                  <div className="t-code">{i.code}</div>
                </div>
                <span className="badge" style={{ background: meta.color }}>
                  {meta.label}
                </span>
              </div>
              <div className="track-meta">
                {i.source === 'family' ? '📱 家属上报' : '⌚ 手环自动预警'} · 📍{' '}
                {i.elderAddress}
              </div>
              {remain !== null && (
                <div
                  className="track-meta"
                  style={{
                    color: remain > 0 ? '#e8765f' : '#722ed1',
                    fontWeight: 600,
                  }}
                >
                  {remain > 0
                    ? `⏳ 等待管家确认，剩余 ${formatCountdown(remain)}（超时自动升级值班台）`
                    : '⚠ 已超时，事件升级社区值班台'}
                </div>
              )}
              <div className="track-foot">
                <span>{formatDateTime(i.createdAt)}</span>
                <span>{relativeFromNow(i.createdAt)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
