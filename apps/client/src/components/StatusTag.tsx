import { Tag } from 'antd';
import type { AlertStatus } from '../api';
import { STATUS_META, SOURCE_META } from '../styles/status';

export function StatusTag({ status }: { status: AlertStatus }) {
  const m = STATUS_META[status];
  return (
    <Tag
      style={{
        color: m.color,
        background: m.bg,
        border: 'none',
        borderRadius: 999,
        padding: '2px 12px',
        fontWeight: 600,
        fontSize: 12.5,
      }}
    >
      {m.label}
    </Tag>
  );
}

export function SourceTag({ source }: { source: string }) {
  const m = SOURCE_META[source] ?? { label: source, icon: '❓' };
  return (
    <Tag style={{ borderRadius: 999, fontSize: 12.5 }}>
      {m.icon} {m.label}
    </Tag>
  );
}
