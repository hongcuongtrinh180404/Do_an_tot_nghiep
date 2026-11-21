import { NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { ClsService } from 'nestjs-cls';
export declare class AuditContextInterceptor implements NestInterceptor {
    private readonly cls;
    constructor(cls: ClsService);
    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown>;
}
