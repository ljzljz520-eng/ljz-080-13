import { useEffect, useState } from 'react';
import { formatCountdown, remainMs } from '../utils';

/** 每秒刷新的 SLA 倒计时；超时后变红 */
export function Countdown({
  deadline,
  active,
}: {
  deadline: string;
  active: boolean;
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);

  if (!active) return <span className="muted">—</span>;
  const ms = remainMs(deadline, now);
  return (
    <span
      style={{
        fontVariantNumeric: 'tabular-nums',
        fontWeight: 700,
        color: ms < 0 ? '#b91c1c' : ms < 60_000 ? '#b45309' : '#1d4ed8',
      }}
    >
      {ms < 0 && '⚠ '}
      {formatCountdown(ms)}
    </span>
  );
}
