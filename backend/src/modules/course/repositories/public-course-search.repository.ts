import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CourseStatusEnum, type CourseLevelEnum } from 'share-lib';
import type {
  PublicCourseSearchFilters,
  PublicCourseSearchItem,
} from '../interfaces/public-course-search.interface.js';
import { CourseEntity } from '../schemas/course.schema.js';
import { CourseCategoryEntity } from '../schemas/course-category.schema.js';

export const PUBLIC_COURSE_SEARCH_TIMEOUT_MS = 3000;

interface SearchDocument {
  _id: Types.ObjectId;
  title: string;
  price: number;
  level: CourseLevelEnum;
  categoryId: { name: string } | null;
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
    // Visibility is mandatory and cannot be overridden by tool arguments.
    const query: Record<string, unknown> = {
      status: CourseStatusEnum.PUBLISHED,
      deletedAt: null,
    };
    if (filters.keyword) {
      const escaped = filters.keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const matchingCategories = await this.categories
        .find({
          name: { $regex: escaped, $options: 'i' },
          isActive: true,
          deletedAt: null,
        })
        .select('_id')
        .maxTimeMS(PUBLIC_COURSE_SEARCH_TIMEOUT_MS)
        .lean<Array<{ _id: Types.ObjectId }>>()
        .exec();
      query.$or = [
        { title: { $regex: escaped, $options: 'i' } },
        {
          categoryId: {
            $in: matchingCategories.map((category) => category._id),
          },
        },
      ];
    }
    if (filters.level) query.level = filters.level;

    if (filters.isFree === true) {
      query.price = 0;
    } else {
      const price: Record<string, number> = { $gte: filters.minPrice ?? 0 };
      if (filters.isFree === false) price.$gt = 0;
      if (filters.maxPrice !== undefined) {
        price[filters.maxPriceExclusive ? '$lt' : '$lte'] = filters.maxPrice;
      }
      query.price = price;
    }

    const [total, docs] = await Promise.all([
      this.courses
        .countDocuments(query)
        .maxTimeMS(PUBLIC_COURSE_SEARCH_TIMEOUT_MS)
        .exec(),
      this.courses
        .find(query)
        // Do not fetch descriptions, private lesson content, instructor PII or audit data.
        .select('_id title price level categoryId')
        .sort({ createdAt: -1, _id: -1 })
        .skip((filters.page - 1) * filters.limit)
        .limit(filters.limit)
        .populate({
          path: 'categoryId',
          select: 'name',
          match: { isActive: true, deletedAt: null },
          options: { maxTimeMS: PUBLIC_COURSE_SEARCH_TIMEOUT_MS },
        })
        .maxTimeMS(PUBLIC_COURSE_SEARCH_TIMEOUT_MS)
        .lean<SearchDocument[]>()
        .exec(),
    ]);
    return {
      total,
      items: docs.map((doc) => ({
        id: doc._id.toString(),
        title: doc.title,
        price: doc.price,
        level: doc.level,
        categoryName: doc.categoryId?.name ?? null,
        url: `/courses/${encodeURIComponent(doc._id.toString())}`,
      })),
    };
  }
}
