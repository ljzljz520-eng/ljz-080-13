import type { AlertStatus } from '../api';

export const STATUS_META: Record<
  AlertStatus,
  { label: string; color: string; bg: string }
> = {
  pending: { label: '待确认', color: '#b45309', bg: '#fef3c7' },
  dispatched: { label: '已派护工', color: '#1d4ed8', bg: '#dbeafe' },
  calling: { label: '电话联系中', color: '#6d28d9', bg: '#ede9fe' },
  escalated: { label: '已升级值班台', color: '#b91c1c', bg: '#fee2e2' },
  resolved: { label: '复访完成', color: '#15803d', bg: '#dcfce7' },
  false_alarm: { label: '误报', color: '#52525b', bg: '#f4f4f5' },
};

export const SOURCE_META: Record<string, { label: string; icon: string }> = {
  wristband: { label: '智能手环', icon: '⌚' },
  family: { label: '家属上报', icon: '👪' },
  community: { label: '社区上报', icon: '🏘️' },
};

export const RESULT_META: Record<string, string> = {
  confirmed_fall: '确认跌倒',
  minor_injury: '轻微受伤',
  serious_injury: '严重受伤',
  no_fall: '未发生跌倒',
  hospitalized: '已送医',
};

export const CALL_RESULT_META: Record<string, { label: string; color: string }> = {
  connected: { label: '已接通', color: '#15803d' },
  no_answer: { label: '无人接听', color: '#b91c1c' },
  busy: { label: '占线', color: '#b45309' },
  voicemail: { label: '语音留言', color: '#6d28d9' },
};

export const TIMELINE_META: Record<string, { label: string; color: string }> = {
  created: { label: '预警触发', color: '#b45309' },
  acknowledged: { label: '管家确认', color: '#1d4ed8' },
  dispatched: { label: '派护工', color: '#0e7490' },
  called: { label: '拨打电话', color: '#6d28d9' },
  marked_false: { label: '标记误报', color: '#52525b' },
  escalated: { label: '超时升级', color: '#b91c1c' },
  duty_acknowledged: { label: '值班台接单', color: '#be123c' },
  resolved: { label: '复访结案', color: '#15803d' },
};
