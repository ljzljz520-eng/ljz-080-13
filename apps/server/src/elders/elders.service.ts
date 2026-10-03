import { Injectable, NotFoundException } from '@nestjs/common';
import { Caregiver, Elder, HealthRecord, ServiceVisit } from '../common/domain';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class EldersService {
  constructor(private readonly db: DatabaseService) {}

  list(): Promise<Elder[]> {
    return this.db.listElders();
  }

  listCaregivers(): Promise<Caregiver[]> {
    return this.db.listCaregivers();
  }

  async healthRecords(elderId?: string): Promise<HealthRecord[]> {
    return this.db.listHealthRecords(elderId);
  }

  async visits(elderId: string): Promise<ServiceVisit[]> {
    return this.db.listVisits(elderId);
  }

  /** 老人健康档案详情：基础信息 + 档案条目 + 服务记录 */
  async profile(elderId: string) {
    const elder = await this.db.getElder(elderId);
    if (!elder) throw new NotFoundException('老人不存在');
    const [records, visits] = await Promise.all([
      this.db.listHealthRecords(elderId),
      this.db.listVisits(elderId),
    ]);
    return { elder, records, visits };
  }
}
