import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { EldersController } from './elders.controller';
import { EldersService } from './elders.service';

@Module({
  imports: [DatabaseModule],
  controllers: [EldersController],
  providers: [EldersService],
})
export class EldersModule {}
