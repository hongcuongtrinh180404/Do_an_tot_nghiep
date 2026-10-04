import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, ClientSession } from 'mongoose';
import { ICourseMindmap } from 'share-lib';
import { BaseMongoRepository } from '../../base/index.js';
import { CourseMindmapEntity } from '../schemas/course-mindmap.schema.js';

@Injectable()
export class CourseMindmapRepository extends BaseMongoRepository<ICourseMindmap, CourseMindmapEntity> {
  constructor(
    @InjectModel(CourseMindmapEntity.name)
    courseMindmapModel: Model<CourseMindmapEntity>,
  ) {
    super(courseMindmapModel, (doc) => {
      const plain =
        typeof (doc as { toObject?: () => Record<string, unknown> }).toObject === 'function'
          ? (doc as { toObject: () => Record<string, unknown> }).toObject()
          : (doc as unknown as Record<string, unknown>);

      const rawId = plain._id;
      const id = typeof rawId === 'string' ? rawId : (rawId as { toString?: () => string })?.toString?.();
      const rawCourseId = plain.courseId;
      const courseId =
        typeof rawCourseId === 'string'
          ? rawCourseId
          : (rawCourseId as { toString?: () => string })?.toString?.();

      return {
        ...plain,
        id: id as string,
        courseId: (courseId ?? '') as string,
        mindmapData: (plain.mindmapData ?? {}) as Record<string, unknown>,
      } as unknown as ICourseMindmap;
    });
  }

  async findByCourseId(
    courseId: string,
    session?: ClientSession,
  ): Promise<ICourseMindmap | null> {
    const courseObjectId = Types.ObjectId.isValid(courseId)
      ? new Types.ObjectId(courseId)
      : courseId;

    const doc = await this.model
      .findOne({
        courseId: courseObjectId,
        deletedAt: null,
      })
      .session(session ?? null)
      .exec();

    return doc ? this.toDomain(doc) : null;
  }

  async upsertByCourseId(
    courseId: string,
    mindmapData: Record<string, unknown>,
    userId?: string,
    session?: ClientSession,
  ): Promise<ICourseMindmap> {
    const courseObjectId = Types.ObjectId.isValid(courseId)
      ? new Types.ObjectId(courseId)
      : courseId;

    const userObjectId = userId && Types.ObjectId.isValid(userId)
      ? new Types.ObjectId(userId)
      : null;

    const doc = await this.model
      .findOneAndUpdate(
        {
          courseId: courseObjectId,
          deletedAt: null,
        },
        {
          $set: {
            mindmapData,
            updatedById: userObjectId,
            deletedAt: null,
          },
          $setOnInsert: {
            createdById: userObjectId,
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

    if (!doc) {
      throw new Error(`Failed to upsert mindmap for course ID: ${courseId}`);
    }

    return this.toDomain(doc);
  }
}
