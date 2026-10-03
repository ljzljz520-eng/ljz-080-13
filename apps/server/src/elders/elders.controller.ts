import { Controller, Get, Param } from '@nestjs/common';
import { EldersService } from './elders.service';

@Controller()
export class EldersController {
  constructor(private readonly elders: EldersService) {}

  @Get('elders')
  list() {
    return this.elders.list();
  }

  @Get('caregivers')
  caregivers() {
    return this.elders.listCaregivers();
  }

  @Get('health-records')
  records() {
    return this.elders.healthRecords();
  }

  @Get('elders/:id/profile')
  profile(@Param('id') id: string) {
    return this.elders.profile(id);
  }
}
