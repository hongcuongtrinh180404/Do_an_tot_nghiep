import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { CourseLevelEnum } from 'share-lib';
import type {
  PublicCourseSearchFilters,
  PublicCourseSearchItem,
} from '../interfaces/public-course-search.interface.js';
import { CourseEntity } from '../schemas/course.schema.js';
import { CourseCategoryEntity } from '../schemas/course-category.schema.js';
import { publicCourseSearchPipeline } from '../utils/public-course-search.pipeline.js';

export const PUBLIC_COURSE_SEARCH_TIMEOUT_MS = 3000;

interface SearchDocument {
  _id: Types.ObjectId;
  title: string;
  price: number;
  level: CourseLevelEnum;
  categoryName: string | null;
}

/** Narrow read-only access: no generic repository or mutation methods exposed. */
@Injectable()
export class PublicCourseSearchRepository {
  constructor(
    @InjectModel(CourseEntity.name)
    private readonly courses: Model<CourseEntity>,
    @InjectModel(CourseCategoryEntity.name)
    private readonly categories: Model<CourseCategoryEntity>,
  ) {}

  async search(
    filters: PublicCourseSearchFilters,
  ): Promise<{ items: PublicCourseSearchItem[]; total: number }> {
    const [result] = await this.courses
      .aggregate<{
        metadata: Array<{ total: number }>;
        items: SearchDocument[];
      }>(publicCourseSearchPipeline(filters, this.categories.collection.name))
      .option({
        maxTimeMS: PUBLIC_COURSE_SEARCH_TIMEOUT_MS,
        allowDiskUse: false,
      })
      .exec();
    return {
      total: result?.metadata[0]?.total ?? 0,
      items: (result?.items ?? []).map((doc) => ({
        id: doc._id.toString(),
        title: doc.title,
        price: doc.price,
        level: doc.level,
        categoryName: doc.categoryName ?? null,
        url: `/courses/${encodeURIComponent(doc._id.toString())}`,
      })),
    };
  }
}
