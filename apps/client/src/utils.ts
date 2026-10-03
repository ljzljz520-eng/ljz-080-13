export function formatTime(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export function formatClock(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export function relativeFromNow(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const abs = Math.abs(diff);
  const min = Math.floor(abs / 60000);
  if (min < 1) return '刚刚';
  if (min < 60) return diff >= 0 ? `${min} 分钟前` : `${min} 分钟后`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return diff >= 0 ? `${hr} 小时前` : `${hr} 小时后`;
  return `${Math.floor(hr / 24)} 天${diff >= 0 ? '前' : '后'}`;
}

/** 距离截止还剩多少毫秒（负 = 已超时） */
export function remainMs(deadlineIso: string, now = Date.now()): number {
  return new Date(deadlineIso).getTime() - now;
}

export function formatCountdown(ms: number): string {
  const overdue = ms < 0;
  const s = Math.max(0, Math.round(Math.abs(ms) / 1000));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${overdue ? '已超时 ' : '剩余 '}${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}
