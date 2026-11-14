import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { RoleEnum } from 'share-lib';
import { ParseObjectIdPipe } from '../../base/index.js';
import { LessonService } from '../services/lesson.service.js';

/** Public preview routes still enforce enrollment on non-preview lessons. */
@Injectable()
export class LessonAccessGuard implements CanActivate {
  private readonly objectIdPipe = new ParseObjectIdPipe();

  constructor(private readonly lessonService: LessonService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      params: { id: string }; user?: { id: string; role: RoleEnum };
    }>();
    const id = this.objectIdPipe.transform(request.params.id);
    await this.lessonService.getAccessibleLesson(id, request.user?.id, request.user?.role);
    return true;
  }
}
