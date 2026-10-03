import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { FallAlertsService } from './fall-alerts.service';

/**
 * 超时升级调度器：
 * 每隔 SCAN_INTERVAL_MS 扫描一次，超过 SLA 仍未被确认的预警
 * 自动升级至社区值班台。
 *
 * 生产环境可替换为 @nestjs/schedule + 数据库行锁，
 * 或由 Supabase pg_cron / Edge Functions 触发升级逻辑。
 */
@Injectable()
export class EscalationScheduler implements OnModuleInit {
  private readonly logger = new Logger('EscalationScheduler');
  private timer?: NodeJS.Timeout;
  private readonly interval = Number(process.env.SCAN_INTERVAL_MS ?? 5000);

  constructor(private readonly alertsService: FallAlertsService) {}

  onModuleInit() {
    this.timer = setInterval(() => this.scan(), this.interval);
    this.logger.log(`超时升级扫描已启动，间隔 ${this.interval}ms`);
  }

  scan() {
    const escalated = this.alertsService.escalateOverdue();
    for (const a of escalated) {
      this.logger.warn(
        `预警 ${a.id} 超过 SLA 未确认，已升级至社区值班台（老人 ${a.elderId}，位置 ${a.location}）`,
      );
    }
  }
}
