import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, ClientSession } from 'mongoose';
import { ILesson } from 'share-lib';
import { BaseMongoRepository } from '../../base/index.js';
import { LessonEntity } from '../schemas/lesson.schema.js';

@Injectable()
export class LessonRepository extends BaseMongoRepository<ILesson, LessonEntity> {
  constructor(
    @InjectModel(LessonEntity.name)
    lessonModel: Model<LessonEntity>,
  ) {
    super(lessonModel, (doc) => {
      const plain =
        typeof (doc as { toObject?: () => Record<string, unknown> }).toObject === 'function'
          ? (doc as { toObject: () => Record<string, unknown> }).toObject()
          : (doc as unknown as Record<string, unknown>);

      const rawId = plain._id;
      const id = typeof rawId === 'string' ? rawId : (rawId as { toString?: () => string })?.toString?.();
      const rawSectionId = plain.sectionId;
      const sectionId =
        typeof rawSectionId === 'string'
          ? rawSectionId
          : (rawSectionId as { toString?: () => string })?.toString?.();

      return {
        ...plain,
        id: id as string,
        sectionId: (sectionId ?? '') as string,
        content: (plain.content ?? null) as ILesson['content'],
        isPreview: Boolean(plain.isPreview),
      } as unknown as ILesson;
    });
  }

  async findBySectionId(
    sectionId: string,
    session?: ClientSession,
  ): Promise<ILesson[]> {
    const sectionObjectId = Types.ObjectId.isValid(sectionId)
      ? new Types.ObjectId(sectionId)
      : sectionId;

    const docs = await this.model
      .find({
        sectionId: sectionObjectId,
        deletedAt: null,
      })
      .sort({
        order: 1,
        _id: 1,
      })
      .session(session ?? null)
      .exec();

    return docs.map((doc) => this.toDomain(doc));
  }
}
