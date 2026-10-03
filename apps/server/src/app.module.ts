import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { EldersModule } from './elders/elders.module';
import { IncidentsModule } from './incidents/incidents.module';

@Module({
  imports: [DatabaseModule, IncidentsModule, EldersModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
