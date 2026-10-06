import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, ClientSession } from 'mongoose';
import { ISection } from 'share-lib';
import { BaseMongoRepository } from '../../base/index.js';
import { SectionEntity } from '../schemas/section.schema.js';

@Injectable()
export class SectionRepository extends BaseMongoRepository<ISection, SectionEntity> {
  constructor(
    @InjectModel(SectionEntity.name)
    sectionModel: Model<SectionEntity>,
  ) {
    super(sectionModel, (doc) => {
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
      } as unknown as ISection;
    });
  }

  async findByCourseId(
    courseId: string,
    session?: ClientSession,
  ): Promise<ISection[]> {
    const courseObjectId = Types.ObjectId.isValid(courseId)
      ? new Types.ObjectId(courseId)
      : courseId;

    const docs = await this.model
      .find({
        courseId: courseObjectId,
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

  async reorderSections(
    courseId: string,
    sectionIds: string[],
    userId?: string,
    session?: ClientSession,
  ): Promise<ISection[]> {
    const courseObjectId = Types.ObjectId.isValid(courseId)
      ? new Types.ObjectId(courseId)
      : courseId;

    const operations = sectionIds.map((id, index) => {
      const sectionObjectId = Types.ObjectId.isValid(id)
        ? new Types.ObjectId(id)
        : id;

      return {
        updateOne: {
          filter: {
            _id: sectionObjectId,
            courseId: courseObjectId,
            deletedAt: null,
          },
          update: {
            $set: {
              order: index,
              ...(userId ? { updatedById: userId } : {}),
            },
          },
        },
      };
    });

    if (operations.length > 0) {
      await this.model.bulkWrite(operations, { session: session ?? undefined });
    }

    return this.findByCourseId(courseId, session);
  }

  async shiftOrdersAfterDelete(
    courseId: string,
    fromOrder: number,
    userId?: string,
    session?: ClientSession,
  ): Promise<number> {
    const courseObjectId = Types.ObjectId.isValid(courseId)
      ? new Types.ObjectId(courseId)
      : courseId;

    const result = await this.model.updateMany(
      {
        courseId: courseObjectId,
        order: { $gt: fromOrder },
        deletedAt: null,
      },
      {
        $inc: { order: -1 },
        ...(userId ? { $set: { updatedById: userId } } : {}),
      },
      { session: session ?? undefined },
    );

    return result.modifiedCount;
  }
}
