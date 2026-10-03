import { Controller, Get, Param, Query } from '@nestjs/common';
import { EldersService } from './elders.service';

@Controller('elders')
export class EldersController {
  constructor(private readonly eldersService: EldersService) {}

  @Get()
  list(@Query('keyword') keyword?: string) {
    return this.eldersService.list(keyword);
  }

  @Get(':id')
  profile(@Param('id') id: string) {
    return this.eldersService.getProfile(id);
  }

  @Get(':id/health-records')
  records(@Param('id') id: string) {
    return this.eldersService.getHealthRecords(id);
  }
}
