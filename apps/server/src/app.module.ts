import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CommonModule } from './common/common.module';
import { EldersModule } from './elders/elders.module';
import { FallAlertsModule } from './fall-alerts/fall-alerts.module';

@Module({
  imports: [CommonModule, EldersModule, FallAlertsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
