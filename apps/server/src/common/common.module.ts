import { Global, Module } from '@nestjs/common';
import { DataStore } from './data-store';

// 全局单例数据层，保证各模块共享同一份演示数据
@Global()
@Module({
  providers: [DataStore],
  exports: [DataStore],
})
export class CommonModule {}
