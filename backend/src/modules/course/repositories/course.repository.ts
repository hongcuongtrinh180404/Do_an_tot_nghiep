import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ClientSession } from 'mongoose';
import { ICourse, ICourseCategorySummary, CourseStatusEnum } from 'share-lib';
import { BaseMongoRepository } from '../../base/index.js';
import { CourseEntity } from '../schemas/course.schema.js';

const CATEGORY_POPULATE = {
  path: 'categoryId',
  select: 'name slug imageUrl isActive',
};

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

      const rawCategoryId = plain.categoryId as unknown;
      let categoryId: string | null = null;
      let category: ICourseCategorySummary | null = null;

      // Populated category documents have a `name` field; a raw Mongoose
      // ObjectId is also an object but must not be treated as populated data.
      const isPopulatedCategory =
        rawCategoryId !== null &&
        typeof rawCategoryId === 'object' &&
        'name' in rawCategoryId;

      if (isPopulatedCategory) {
        const populated = rawCategoryId as {
          _id?: unknown;
          name?: string;
          slug?: string;
          imageUrl?: string | null;
        };
        const populatedId = populated._id;
        categoryId =
          typeof populatedId === 'string'
            ? populatedId
            : ((populatedId as { toString?: () => string })?.toString?.() ?? null);
        if (categoryId) {
          category = {
            id: categoryId,
            name: populated.name ?? '',
            slug: populated.slug ?? '',
            imageUrl: populated.imageUrl ?? null,
          };
        }
      } else if (rawCategoryId !== null && rawCategoryId !== undefined) {
        categoryId =
          typeof rawCategoryId === 'string'
            ? rawCategoryId
            : ((rawCategoryId as { toString?: () => string }).toString?.() ?? null);
      }

      return {
        ...plain,
        id: id as string,
        instructorId: (instructorId ?? '') as string,
        categoryId,
        category,
      } as unknown as ICourse;
    });
  }

  async findById(id: string, session?: ClientSession): Promise<ICourse | null> {
    const doc = await this.model
      .findOne({ _id: id, deletedAt: null })
      .populate(CATEGORY_POPULATE)
      .session(session ?? null)
      .exec();

    return doc ? this.toDomain(doc) : null;
  }

  async findBySlug(slug: string, session?: ClientSession): Promise<ICourse | null> {
    const doc = await this.model
      .findOne({
        slug: slug.toLowerCase().trim(),
        deletedAt: null,
      })
      .populate(CATEGORY_POPULATE)
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
      .populate(CATEGORY_POPULATE)
      .session(session ?? null)
      .exec();

    return docs.map((doc) => this.toDomain(doc));
  }

  async countByCategoryId(categoryId: string): Promise<number> {
    return this.model.countDocuments({ categoryId, deletedAt: null }).exec();
  }

  async countByCategoryIds(
    options: { onlyPublished?: boolean } = {},
  ): Promise<Map<string, number>> {
    const match: Record<string, unknown> = {
      deletedAt: null,
      categoryId: { $ne: null },
    };

    if (options.onlyPublished) {
      match.status = CourseStatusEnum.PUBLISHED;
    }

    const rows = await this.model
      .aggregate<{ _id: unknown; count: number }>([
        { $match: match },
        { $group: { _id: '$categoryId', count: { $sum: 1 } } },
      ])
      .exec();

    return new Map(rows.map((row) => [String(row._id), Number(row.count)]));
  }

  async findConflictingSlugs(
    baseSlug: string,
    excludeCourseId: string,
    session?: ClientSession,
  ): Promise<string[]> {
    const escaped = baseSlug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`^${escaped}(-[0-9]+)?$`, 'i');

    const filter: Record<string, unknown> = {
      slug: regex,
      deletedAt: null,
    };

    if (excludeCourseId) {
      filter._id = { $ne: excludeCourseId };
    }

    const docs = await this.model
      .find(filter)
      .select('slug')
      .session(session ?? null)
      .lean()
      .exec();

    return docs.map((d) => (d as unknown as { slug: string }).slug);
  }
}
