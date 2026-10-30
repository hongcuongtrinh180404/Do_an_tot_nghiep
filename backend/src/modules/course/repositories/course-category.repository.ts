import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ClientSession } from 'mongoose';
import { ICourseCategory } from 'share-lib';
import { BaseMongoRepository } from '../../base/index.js';
import { CourseCategoryEntity } from '../schemas/course-category.schema.js';

@Injectable()
export class CourseCategoryRepository extends BaseMongoRepository<
  ICourseCategory,
  CourseCategoryEntity
> {
  constructor(
    @InjectModel(CourseCategoryEntity.name)
    courseCategoryModel: Model<CourseCategoryEntity>,
  ) {
    super(courseCategoryModel, (doc) => {
      const plain =
        typeof (doc as { toObject?: () => Record<string, unknown> }).toObject === 'function'
          ? (doc as { toObject: () => Record<string, unknown> }).toObject()
          : (doc as unknown as Record<string, unknown>);

      const rawId = plain._id;
      const id = typeof rawId === 'string' ? rawId : (rawId as { toString?: () => string })?.toString?.();

      return {
        ...plain,
        id: id as string,
      } as unknown as ICourseCategory;
    });
  }

  async findBySlug(slug: string, session?: ClientSession): Promise<ICourseCategory | null> {
    const doc = await this.model
      .findOne({
        slug: slug.toLowerCase().trim(),
        deletedAt: null,
      })
      .session(session ?? null)
      .exec();

    return doc ? this.toDomain(doc) : null;
  }

  /**
   * Dùng cho seeder: tìm cả danh mục đã xóa mềm để có thể restore khi refresh.
   */
  async findBySlugIncludingDeleted(
    slug: string,
    session?: ClientSession,
  ): Promise<ICourseCategory | null> {
    const doc = await this.model
      .findOne({ slug: slug.toLowerCase().trim() })
      .session(session ?? null)
      .exec();

    return doc ? this.toDomain(doc) : null;
  }

  async findAllSorted(session?: ClientSession): Promise<ICourseCategory[]> {
    const docs = await this.model
      .find({ deletedAt: null })
      .sort({ order: 1, name: 1 })
      .session(session ?? null)
      .exec();

    return docs.map((doc) => this.toDomain(doc));
  }
}
