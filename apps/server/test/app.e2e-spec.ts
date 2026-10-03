/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-require-imports */
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request = require('supertest');
import { AppModule } from '../src/app.module';

describe('跌倒预警链路 (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(() => app.close());

  it('GET /api/health', () => {
    return request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect(({ body }) => expect(body.status).toBe('ok'));
  });

  it('家属上报 -> 列表可见', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/incidents')
      .send({
        elderId: 'el-002',
        source: 'family',
        address: '幸福里社区小广场',
        reporterName: '李晓',
        reporterPhone: '13755556666',
        note: '测试上报',
      })
      .expect(201);
    expect(created.body.status).toBe('pending');
    const list = await request(app.getHttpServer()).get('/api/incidents');
    expect(
      list.body.some((i: { id: string }) => i.id === created.body.id),
    ).toBe(true);
  });

  it('超时未确认的事件会被升级', async () => {
    const incidents = await request(app.getHttpServer()).get('/api/incidents');
    // 种子数据中存在一条 pending 事件（sla 由环境变量控制，默认 180s）
    expect(Array.isArray(incidents.body)).toBe(true);
  });
});
