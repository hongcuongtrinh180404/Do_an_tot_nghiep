import { Module, Global } from '@nestjs/common';
import { ClsModule } from 'nestjs-cls';
import { AuditContextInterceptor } from './interceptors/audit-context.interceptor.js';
import { TransformInterceptor } from './interceptors/transform.interceptor.js';

@Global()
@Module({
  imports: [ClsModule],
  providers: [AuditContextInterceptor, TransformInterceptor],
  exports: [AuditContextInterceptor, TransformInterceptor, ClsModule],
})
export class BaseModule {}
