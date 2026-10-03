import { FallAlertsService } from './fall-alerts.service';
import { DataStore } from '../common/data-store';

describe('FallAlertsService 跌倒预警链路', () => {
  let store: DataStore;
  let service: FallAlertsService;

  beforeEach(() => {
    store = new DataStore();
    store.onModuleInit();
    service = new FallAlertsService(store);
  });

  it('上报后详情应聚合位置、时间、最近上门、紧急联系人', () => {
    const detail = service.report({
      elderId: 'eld_001',
      source: 'family',
      location: '卫生间',
      reporterName: '王强',
      reporterNote: '敲门无人应',
    });
    expect(detail.alert.status).toBe('pending');
    expect(detail.elder.name).toBe('王秀兰');
    expect(detail.contacts.length).toBeGreaterThan(0);
    expect(detail.contacts[0].name).toBe('王强');
    expect(detail.lastVisit).not.toBeNull();
    expect(detail.lastVisit?.serviceType).toBe('助浴服务');
    expect(detail.timeline[0].type).toBe('created');
  });

  it('管家可以派护工，事件状态变为 dispatched', () => {
    const a = store.alerts.find((x) => x.status === 'pending')!;
    const detail = service.dispatch(a.id, {
      workerId: 'wkr_01',
      operator: '管家',
    });
    expect(detail.alert.status).toBe('dispatched');
    expect(detail.worker?.name).toBe('陈护工');
    expect(detail.timeline.some((t) => t.type === 'dispatched')).toBe(true);
  });

  it('标记误报后事件关闭且不会被升级', () => {
    const a = store.alerts.find((x) => x.status === 'pending')!;
    service.markFalseAlarm(a.id, '管家', '手环误触发');
    const escalated = service.escalateOverdue();
    expect(escalated.some((e) => e.id === a.id)).toBe(false);
    expect(store.alerts.find((x) => x.id === a.id)!.status).toBe('false_alarm');
  });

  it('超过 SLA 未确认的 pending 事件会升级到值班台', () => {
    const a = store.createAlert({
      elderId: 'eld_002',
      source: 'wristband',
      location: '客厅',
    });
    a.slaDeadline = new Date(Date.now() - 1000).toISOString();
    const escalated = service.escalateOverdue();
    expect(escalated.map((e) => e.id)).toContain(a.id);
    expect(store.alerts.find((x) => x.id === a.id)!.status).toBe('escalated');
  });

  it('已确认（已派工）的事件即使超时也不升级', () => {
    const a = store.createAlert({
      elderId: 'eld_002',
      source: 'family',
      location: '花园',
    });
    service.acknowledge(a.id, '管家');
    a.slaDeadline = new Date(Date.now() - 1000).toISOString();
    expect(service.escalateOverdue().map((e) => e.id)).not.toContain(a.id);
  });

  it('复访结案必须写入老人健康档案，而不是只写时间线', () => {
    const a = store.createAlert({
      elderId: 'eld_001',
      source: 'wristband',
      location: '卧室',
    });
    const before = store.records.filter((r) => r.elderId === 'eld_001').length;

    const detail = service.resolve(a.id, {
      revisitResult: 'confirmed_fall',
      revisitNote: '老人自述滑倒，无外伤，已扶起观察。',
      revisitedBy: '陈护工',
      operator: '管家',
    });

    expect(detail.alert.status).toBe('resolved');
    expect(detail.healthRecordId).toBeTruthy();
    const after = store.records.filter((r) => r.elderId === 'eld_001');
    expect(after.length).toBe(before + 1);
    const rec = after.find((r) => r.alertId === a.id);
    expect(rec).toBeDefined();
    expect(rec?.content).toContain('老人自述滑倒');
    expect(rec?.type).toBe('fall');
  });

  it('缺少复访说明时拒绝结案', () => {
    const a = store.alerts.find((x) => x.status === 'pending')!;
    expect(() =>
      service.resolve(a.id, {
        revisitResult: 'no_fall',
        revisitNote: '   ',
        revisitedBy: '陈护工',
        operator: '管家',
      }),
    ).toThrow();
  });
});
