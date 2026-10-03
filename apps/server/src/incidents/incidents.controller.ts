import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  AcknowledgeDto,
  CallDto,
  ClaimDto,
  CreateIncidentDto,
  DispatchDto,
  FalseAlarmDto,
  RevisitDto,
} from './dto';
import { IncidentsService } from './incidents.service';

@Controller('incidents')
export class IncidentsController {
  constructor(private readonly incidents: IncidentsService) {}

  /** 预警列表（工作台 / 值班台共用） */
  @Get()
  list() {
    return this.incidents.listSummaries();
  }

  @Get('stats')
  stats() {
    return this.incidents.stats();
  }

  /** 聚合详情：位置、时间、最近一次上门、紧急联系人同一页 */
  @Get(':id')
  detail(@Param('id') id: string) {
    return this.incidents.getDetail(id);
  }

  /** 老人手环 / 家属 H5 上报 */
  @Post()
  create(@Body() dto: CreateIncidentDto) {
    return this.incidents.create(dto);
  }

  /** 管家确认 */
  @Post(':id/acknowledge')
  acknowledge(@Param('id') id: string, @Body() dto: AcknowledgeDto) {
    return this.incidents.acknowledge(id, dto);
  }

  /** 派护工 */
  @Post(':id/dispatch')
  dispatch(@Param('id') id: string, @Body() dto: DispatchDto) {
    return this.incidents.dispatch(id, dto);
  }

  /** 拨打电话登记 */
  @Post(':id/calls')
  logCall(@Param('id') id: string, @Body() dto: CallDto) {
    return this.incidents.logCall(id, dto);
  }

  /** 标记误报 */
  @Post(':id/false-alarm')
  falseAlarm(@Param('id') id: string, @Body() dto: FalseAlarmDto) {
    return this.incidents.markFalseAlarm(id, dto);
  }

  /** 复访结果（同步写入健康档案） */
  @Post(':id/revisit')
  revisit(@Param('id') id: string, @Body() dto: RevisitDto) {
    return this.incidents.submitRevisit(id, dto);
  }

  /** 社区值班台认领升级事件 */
  @Post(':id/claim')
  claim(@Param('id') id: string, @Body() dto: ClaimDto) {
    return this.incidents.claim(id, dto);
  }
}
