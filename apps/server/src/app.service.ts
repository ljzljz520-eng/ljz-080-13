import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  health() {
    return {
      service: '养老服务平台 · 跌倒预警链路',
      status: 'ok',
      time: new Date().toISOString(),
    };
  }
}
