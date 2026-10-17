import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, ClientSession } from 'mongoose';
import type { ILessonMindmap, ILessonMindmapData } from 'share-lib';
import { BaseMongoRepository } from '../../base/index.js';
import { LessonMindmapEntity } from '../schemas/lesson-mindmap.schema.js';

@Injectable()
export class LessonMindmapRepository extends BaseMongoRepository<ILessonMindmap, LessonMindmapEntity> {
  constructor(
    @InjectModel(LessonMindmapEntity.name)
    lessonMindmapModel: Model<LessonMindmapEntity>,
  ) {
    super(lessonMindmapModel, (doc) => {
      const plain =
        typeof (doc as { toObject?: () => Record<string, unknown> }).toObject === 'function'
          ? (doc as { toObject: () => Record<string, unknown> }).toObject()
          : (doc as unknown as Record<string, unknown>);

      const rawId = plain._id;
      const id = typeof rawId === 'string' ? rawId : (rawId as { toString?: () => string })?.toString?.();
      const rawLessonId = plain.lessonId;
      const lessonId =
        typeof rawLessonId === 'string'
          ? rawLessonId
          : (rawLessonId as { toString?: () => string })?.toString?.();

      return {
        ...plain,
        id: (id ?? '') as string,
        lessonId: (lessonId ?? '') as string,
        mindmap: plain.mindmap as ILessonMindmapData,
        draftMindmap: plain.draftMindmap as ILessonMindmapData | null,
      } as unknown as ILessonMindmap;
    });
  }

  async findByLessonId(
    lessonId: string,
    session?: ClientSession,
  ): Promise<ILessonMindmap | null> {
    const lessonObjectId = Types.ObjectId.isValid(lessonId)
      ? new Types.ObjectId(lessonId)
      : lessonId;

    const doc = await this.model
      .findOne({
        lessonId: lessonObjectId,
        deletedAt: null,
      } as Record<string, unknown>)
      .session(session ?? null)
      .exec();

    return doc ? this.toDomain(doc as unknown as LessonMindmapEntity) : null;
  }

  async saveDraftByLessonId(
    lessonId: string,
    draftData: ILessonMindmapData,
    userId?: string,
    session?: ClientSession,
  ): Promise<ILessonMindmap> {
    const lessonObjectId = Types.ObjectId.isValid(lessonId)
      ? new Types.ObjectId(lessonId)
      : lessonId;

    const updateQuery: Record<string, unknown> = {
      $set: {
        draftMindmap: draftData,
        updatedById: userId ?? 'SYSTEM',
      },
      $setOnInsert: {
        lessonId: lessonObjectId,
        mindmap: draftData,
        createdById: userId ?? 'SYSTEM',
        deletedAt: null,
      },
    };

    const doc = await this.model
      .findOneAndUpdate(
        { lessonId: lessonObjectId, deletedAt: null } as Record<string, unknown>,
        updateQuery,
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
          session: session ?? null,
        },
      )
      .exec();

    return this.toDomain(doc as unknown as LessonMindmapEntity);
  }

  async applyDraftByLessonId(
    lessonId: string,
    userId?: string,
    session?: ClientSession,
  ): Promise<ILessonMindmap | null> {
    const lessonObjectId = Types.ObjectId.isValid(lessonId)
      ? new Types.ObjectId(lessonId)
      : lessonId;

    const existing = await this.model
      .findOne({ lessonId: lessonObjectId, deletedAt: null } as Record<string, unknown>)
      .session(session ?? null)
      .exec();

    const plain = existing as unknown as { draftMindmap?: ILessonMindmapData | null };
    if (!plain || !plain.draftMindmap) {
      return null;
    }

    const doc = await this.model
      .findOneAndUpdate(
        { lessonId: lessonObjectId, deletedAt: null } as Record<string, unknown>,
        {
          $set: {
            mindmap: plain.draftMindmap,
            draftMindmap: null,
            updatedById: userId ?? 'SYSTEM',
          },
        },
        {
          new: true,
          session: session ?? null,
        },
      )
      .exec();

    return doc ? this.toDomain(doc as unknown as LessonMindmapEntity) : null;
  }

  async upsertOfficialByLessonId(
    lessonId: string,
    mindmapData: ILessonMindmapData,
    userId?: string,
    session?: ClientSession,
  ): Promise<ILessonMindmap> {
    const lessonObjectId = Types.ObjectId.isValid(lessonId)
      ? new Types.ObjectId(lessonId)
      : lessonId;

    const doc = await this.model
      .findOneAndUpdate(
        { lessonId: lessonObjectId, deletedAt: null } as Record<string, unknown>,
        {
          $set: {
            mindmap: mindmapData,
            draftMindmap: null,
            updatedById: userId ?? 'SYSTEM',
          },
          $setOnInsert: {
            lessonId: lessonObjectId,
            createdById: userId ?? 'SYSTEM',
            deletedAt: null,
          },
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
          session: session ?? null,
        },
      )
      .exec();

    return this.toDomain(doc as unknown as LessonMindmapEntity);
  }
}
