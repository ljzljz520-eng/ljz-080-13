import { Module } from '@nestjs/common';
import { FallAlertsController } from './fall-alerts.controller';
import { FallAlertsService } from './fall-alerts.service';
import { EscalationScheduler } from './escalation.scheduler';

@Module({
  controllers: [FallAlertsController],
  providers: [FallAlertsService, EscalationScheduler],
  exports: [FallAlertsService],
})
export class FallAlertsModule {}
