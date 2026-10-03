import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { FallAlertsService } from './fall-alerts.service';
import type {
  CallDto,
  DispatchDto,
  CreateAlertDto,
  ResolveDto,
} from './fall-alerts.service';

@Controller('fall-alerts')
export class FallAlertsController {
  constructor(private readonly service: FallAlertsService) {}

  /** 活跃预警列表（管家工作台 / 值班台共用） */
  @Get()
  list(
    @Query('status') status?: string,
    @Query('scope') scope?: 'active' | 'all',
  ) {
    return this.service.list(status, scope ?? 'active');
  }

  @Get('stats/overview')
  stats() {
    return this.service.stats();
  }

  @Get('workers/available')
  workers() {
    return this.service.listWorkers();
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.service.getDetail(id);
  }

  /** 手环 / 家属 上报疑似跌倒 */
  @Post()
  report(@Body() dto: CreateAlertDto) {
    return this.service.report(dto);
  }

  /** 管家确认接管 */
  @Post(':id/acknowledge')
  acknowledge(
    @Param('id') id: string,
    @Body('operator') operator = '值班管家',
  ) {
    return this.service.acknowledge(id, operator);
  }

  /** 派护工 */
  @Post(':id/dispatch')
  dispatch(@Param('id') id: string, @Body() dto: DispatchDto) {
    return this.service.dispatch(id, {
      workerId: dto.workerId,
      operator: dto.operator ?? '值班管家',
      note: dto.note,
    });
  }

  /** 拨打电话并登记结果 */
  @Post(':id/call')
  call(@Param('id') id: string, @Body() dto: CallDto) {
    return this.service.logCall(id, {
      ...dto,
      operator: dto.operator ?? '值班管家',
    });
  }

  /** 标记误报 */
  @Post(':id/false-alarm')
  falseAlarm(
    @Param('id') id: string,
    @Body() body: { operator?: string; reason?: string },
  ) {
    return this.service.markFalseAlarm(
      id,
      body.operator ?? '值班管家',
      body.reason ?? '',
    );
  }

  /** 社区值班台接单 */
  @Post(':id/duty-acknowledge')
  dutyAck(@Param('id') id: string, @Body('operator') operator = '社区值班员') {
    return this.service.dutyAcknowledge(id, operator);
  }

  /** 复访结案，结果写入老人健康档案 */
  @Post(':id/resolve')
  resolve(@Param('id') id: string, @Body() dto: ResolveDto) {
    return this.service.resolve(id, {
      ...dto,
      operator: dto.operator ?? '值班管家',
    });
  }
}
