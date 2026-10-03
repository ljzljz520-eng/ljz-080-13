import { IncidentsService } from './incidents.service';
import { InMemoryStore } from '../database/in-memory.store';

describe('IncidentsService 跌倒预警链路', () => {
  let service: IncidentsService;

  beforeEach(() => {
    service = new IncidentsService(new InMemoryStore());
  });

  it('家属上报创建 pending 事件', async () => {
    const detail = await service.create({
      elderId: 'el-002',
      source: 'family',
      address: '家中',
      reporterName: '李晓',
    });
    expect(detail.status).toBe('pending');
    // 聚合详情包含老人、紧急联系人与最近上门服务
    expect(detail.elder.emergencyContacts.length).toBeGreaterThan(0);
    expect(detail.latestVisit).toBeDefined();
  });

  it('派单即确认，复访结果写入健康档案', async () => {
    const created = await service.create({
      elderId: 'el-002',
      source: 'family',
      address: '家中',
    });
    const dispatched = await service.dispatch(created.id, {
      caregiverId: 'cg-002',
      by: '管家 林敏',
      etaMinutes: 8,
    });
    expect(dispatched.status).toBe('dispatched');
    expect(dispatched.acknowledgedAt).toBeDefined();

    const revisited = await service.submitRevisit(created.id, {
      by: '管家 林敏',
      outcome: 'minor',
      injuryFound: true,
      measures: ['擦伤包扎'],
      hospitalAdvised: false,
      note: '轻微擦伤',
    });
    expect(revisited.status).toBe('revisited');
    // 健康档案确实新增（数据层为复访结果最终落点）
    const dbRecords = await (
      service as unknown as {
        db: { listHealthRecords: (id?: string) => Promise<unknown[]> };
      }
    ).db.listHealthRecords(created.elderId);
    expect(dbRecords.length).toBeGreaterThan(0);
  });

  it('超过 SLA 未确认的事件自动升级值班台', async () => {
    const created = await service.create({
      elderId: 'el-001',
      source: 'wristband',
      address: '卫生间',
      sensorConfidence: 90,
    });
    const future =
      new Date(created.createdAt).getTime() + (created.slaSeconds + 10) * 1000;
    const escalated = await service.escalateOverdue(future);
    expect(escalated.some((i) => i.id === created.id)).toBe(true);
    const detail = await service.getDetail(created.id);
    expect(detail.status).toBe('escalated');
    expect(detail.escalatedReason).toContain('自动升级');

    const claimed = await service.claim(created.id, { by: '值班员 周倩' });
    expect(claimed.status).toBe('acting');
    expect(claimed.claimedBy).toBe('值班员 周倩');
  });

  it('误报关闭且不产生健康档案', async () => {
    const created = await service.create({
      elderId: 'el-003',
      source: 'wristband',
      address: '客厅',
    });
    const before = await (
      service as unknown as {
        db: { listHealthRecords: (id?: string) => Promise<unknown[]> };
      }
    ).db.listHealthRecords(created.elderId);
    const closed = await service.markFalseAlarm(created.id, {
      by: '管家 林敏',
      reason: '手环脱落',
    });
    expect(closed.status).toBe('false_alarm');
    const after = await (
      service as unknown as {
        db: { listHealthRecords: (id?: string) => Promise<unknown[]> };
      }
    ).db.listHealthRecords(created.elderId);
    expect(after.length).toBe(before.length);
  });
});
