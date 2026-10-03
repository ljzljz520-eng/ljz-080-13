import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  health() {
    return {
      status: 'ok',
      service: 'elderly-care-platform',
      time: new Date().toISOString(),
    };
  }
}
