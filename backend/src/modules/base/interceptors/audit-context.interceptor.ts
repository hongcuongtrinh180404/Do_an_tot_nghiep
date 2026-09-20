import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { ClsService } from 'nestjs-cls';
import { Request } from 'express';
import { randomUUID } from 'crypto';

interface AuthenticatedUser {
  id?: string;
  _id?: string | { toString(): string };
  userId?: string;
}

interface RequestWithUser extends Request {
  user?: AuthenticatedUser;
}

@Injectable()
export class AuditContextInterceptor implements NestInterceptor {
  constructor(private readonly cls: ClsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<RequestWithUser>();

    if (req) {
      // Extract User ID
      let userId = 'SYSTEM';
      if (req.user) {
        if (req.user.id) {
          userId = String(req.user.id);
        } else if (req.user._id) {
          userId = typeof req.user._id === 'string' ? req.user._id : req.user._id.toString();
        } else if (req.user.userId) {
          userId = String(req.user.userId);
        }
      } else if (req.headers && req.headers['x-user-id']) {
        const headerUser = req.headers['x-user-id'];
        userId = Array.isArray(headerUser) ? headerUser[0] : headerUser;
      }

      // Extract or generate Correlation ID
      let correlationId: string = randomUUID();
      if (req.headers && req.headers['x-correlation-id']) {
        const headerCorrelation = req.headers['x-correlation-id'];
        correlationId = Array.isArray(headerCorrelation) ? headerCorrelation[0] : headerCorrelation;
      }

      this.cls.set('userId', userId);
      this.cls.set('correlationId', correlationId);
    }

    return next.handle();
  }
}
