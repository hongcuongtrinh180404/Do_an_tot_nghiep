import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { ClientSession } from 'mongoose';
import { ILesson, ISection, ILessonContent } from 'share-lib';
import { BaseService } from '../../base/index.js';
import { LessonRepository } from '../repositories/lesson.repository.js';
import { SectionRepository } from '../repositories/section.repository.js';

export interface CreateLessonInput {
  title: string;
  description?: string | null;
  order: number;
  content?: ILessonContent | null;
  isPreview?: boolean;
  userId?: string;
}

@Injectable()
export class LessonService extends BaseService<ILesson, string> {
  constructor(
    protected readonly lessonRepository: LessonRepository,
    protected readonly sectionRepository: SectionRepository,
    cls: ClsService,
  ) {
    super(lessonRepository, cls, LessonService.name);
  }

  async createLesson(
    sectionId: string,
    input: CreateLessonInput,
    session?: ClientSession,
  ): Promise<ILesson> {
    let section: ISection | null = null;
    try {
      section = await this.sectionRepository.findById(sectionId, session);
    } catch {
      throw new NotFoundException(`Không tìm thấy chương học với ID '${sectionId}'`);
    }

    if (!section || section.deletedAt) {
      throw new NotFoundException(`Không tìm thấy chương học với ID '${sectionId}'`);
    }

    if (input.order !== undefined && input.order < 0) {
      throw new BadRequestException('Thứ tự bài học không được nhỏ hơn 0');
    }

    const userId = input.userId ?? this.getCurrentUserId();

    return this.lessonRepository.create(
      {
        sectionId: section.id,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        order: input.order,
        content: input.content ?? null,
        isPreview: Boolean(input.isPreview),
        createdById: userId,
        updatedById: userId,
      },
      session,
    );
  }

  async getLessonsBySectionId(
    sectionId: string,
    session?: ClientSession,
  ): Promise<ILesson[]> {
    let section: ISection | null = null;
    try {
      section = await this.sectionRepository.findById(sectionId, session);
    } catch {
      throw new NotFoundException(`Không tìm thấy chương học với ID '${sectionId}'`);
    }

    if (!section || section.deletedAt) {
      throw new NotFoundException(`Không tìm thấy chương học với ID '${sectionId}'`);
    }

    return this.lessonRepository.findBySectionId(sectionId, session);
  }
}
