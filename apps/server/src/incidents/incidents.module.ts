import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { EscalationScheduler } from './escalation.scheduler';
import { IncidentsController } from './incidents.controller';
import { IncidentsService } from './incidents.service';

@Module({
  imports: [DatabaseModule],
  controllers: [IncidentsController],
  providers: [IncidentsService, EscalationScheduler],
  exports: [IncidentsService],
})
export class IncidentsModule {}
