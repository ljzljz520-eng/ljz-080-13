import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { IncidentsService } from './incidents.service';

/**
 * 升级巡检：每隔 FALL_SCAN_INTERVAL_MS 毫秒扫描一次，
 * 超过确认时限（FALL_ACK_SLA_SECONDS）仍无人确认的事件自动升级社区值班台。
 */
@Injectable()
export class EscalationScheduler
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(EscalationScheduler.name);
  private timer?: ReturnType<typeof setInterval>;
  private readonly intervalMs = Number(
    process.env.FALL_SCAN_INTERVAL_MS ?? 5000,
  );

  constructor(private readonly incidents: IncidentsService) {}

  onApplicationBootstrap() {
    this.timer = setInterval(() => {
      this.incidents
        .escalateOverdue()
        .then((escalated) => {
          if (escalated.length) {
            this.logger.warn(
              `本轮升级 ${escalated.length} 起超时预警：${escalated
                .map((i) => i.code)
                .join(', ')}`,
            );
          }
        })
        .catch((err) =>
          this.logger.error(`升级巡检失败：${(err as Error).message}`),
        );
    }, this.intervalMs);
  }

  onApplicationShutdown() {
    if (this.timer) clearInterval(this.timer);
  }
}
