import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ClientSession } from 'mongoose';
import { ICourse } from 'share-lib';
import { BaseMongoRepository } from '../../base/index.js';
import { CourseEntity } from '../schemas/course.schema.js';

@Injectable()
export class CourseRepository extends BaseMongoRepository<ICourse, CourseEntity> {
  constructor(
    @InjectModel(CourseEntity.name)
    courseModel: Model<CourseEntity>,
  ) {
    super(courseModel, (doc) => {
      const plain =
        typeof (doc as { toObject?: () => Record<string, unknown> }).toObject === 'function'
          ? (doc as { toObject: () => Record<string, unknown> }).toObject()
          : (doc as unknown as Record<string, unknown>);

      const rawId = plain._id;
      const id = typeof rawId === 'string' ? rawId : (rawId as { toString?: () => string })?.toString?.();
      const rawInstructorId = plain.instructorId;
      const instructorId =
        typeof rawInstructorId === 'string'
          ? rawInstructorId
          : (rawInstructorId as { toString?: () => string })?.toString?.();

      return {
        ...plain,
        id: id as string,
        instructorId: (instructorId ?? '') as string,
      } as unknown as ICourse;
    });
  }

  async findBySlug(slug: string, session?: ClientSession): Promise<ICourse | null> {
    const doc = await this.model
      .findOne({
        slug: slug.toLowerCase().trim(),
        deletedAt: null,
      })
      .session(session ?? null)
      .exec();

    return doc ? this.toDomain(doc) : null;
  }

  async findByInstructorId(
    instructorId: string,
    session?: ClientSession,
  ): Promise<ICourse[]> {
    const docs = await this.model
      .find({
        instructorId,
        deletedAt: null,
      })
      .sort({ createdAt: -1 })
      .session(session ?? null)
      .exec();

    return docs.map((doc) => this.toDomain(doc));
  }
}
