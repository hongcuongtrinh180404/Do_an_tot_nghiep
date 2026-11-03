import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ClientSession } from 'mongoose';
import {
  ICourse,
  ICourseCategorySummary,
  ICourseInstructorSummary,
  CourseStatusEnum,
} from 'share-lib';
import { BaseMongoRepository, PaginationResult } from '../../base/index.js';
import { CourseEntity } from '../schemas/course.schema.js';
import { QueryCoursesAdminDto } from '../dto/query-courses-admin.dto.js';
import { QueryPublicCoursesDto } from '../dto/query-public-courses.dto.js';

const CATEGORY_POPULATE = {
  path: 'categoryId',
  select: 'name slug imageUrl isActive',
};

const INSTRUCTOR_POPULATE = {
  path: 'instructorId',
  select: 'fullName email avatarUrl',
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

      const rawInstructor = plain.instructorId as unknown;
      let instructorId = '';
      let instructor: ICourseInstructorSummary | null = null;

      if (
        rawInstructor !== null &&
        typeof rawInstructor === 'object' &&
        'email' in rawInstructor
      ) {
        const popInst = rawInstructor as {
          _id?: unknown;
          fullName?: string;
          email?: string;
          avatarUrl?: string | null;
        };
        const popId = popInst._id;
        instructorId =
          typeof popId === 'string'
            ? popId
            : ((popId as { toString?: () => string })?.toString?.() ?? '');
        instructor = {
          id: instructorId,
          fullName: popInst.fullName ?? '',
          email: popInst.email ?? '',
          avatarUrl: popInst.avatarUrl ?? null,
        };
      } else if (rawInstructor !== null && rawInstructor !== undefined) {
        instructorId =
          typeof rawInstructor === 'string'
            ? rawInstructor
            : ((rawInstructor as { toString?: () => string }).toString?.() ?? '');
      }

      const rawRequesterId = plain.approvalRequestedById;
      const approvalRequestedById = typeof rawRequesterId === 'string'
        ? rawRequesterId
        : (rawRequesterId as { toString?: () => string } | null)?.toString?.() ?? null;

      const rawReviewedById = plain.reviewedById;
      const reviewedById = typeof rawReviewedById === 'string'
        ? rawReviewedById
        : (rawReviewedById as { toString?: () => string } | null)?.toString?.() ?? null;

      const rawCategoryId = plain.categoryId as unknown;
      let categoryId: string | null = null;
      let category: ICourseCategorySummary | null = null;

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
        instructorId,
        instructor,
        approvalRequestedById,
        reviewedById,
        categoryId,
        category,
        rejectionReason: (plain.rejectionReason as string | undefined) ?? null,
        reviewedAt: (plain.reviewedAt as Date | undefined) ?? null,
      } as unknown as ICourse;
    });
  }

  async findById(id: string, session?: ClientSession): Promise<ICourse | null> {
    const doc = await this.model
      .findOne({ _id: id, deletedAt: null })
      .populate(CATEGORY_POPULATE)
      .populate(INSTRUCTOR_POPULATE)
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
      .populate(INSTRUCTOR_POPULATE)
      .session(session ?? null)
      .exec();

    return doc ? this.toDomain(doc) : null;
  }

  async requestApproval(course: ICourse, userId: string): Promise<ICourse | null> {
    const doc = await this.model.findOneAndUpdate(
      {
        _id: course.id,
        deletedAt: null,
        status: CourseStatusEnum.DRAFT,
        updatedAt: new Date(course.updatedAt),
      },
      {
        $set: {
          status: CourseStatusEnum.PENDING_APPROVAL,
          approvalRequestedAt: new Date(),
          approvalRequestedById: userId,
          updatedById: userId,
          rejectionReason: null,
        },
      },
      { new: true, runValidators: true },
    )
      .populate(CATEGORY_POPULATE)
      .populate(INSTRUCTOR_POPULATE)
      .exec();

    return doc ? this.toDomain(doc) : null;
  }

  async approveCourse(
    courseId: string,
    adminId: string,
    session?: ClientSession,
  ): Promise<ICourse | null> {
    const doc = await this.model.findOneAndUpdate(
      {
        _id: courseId,
        deletedAt: null,
        status: CourseStatusEnum.PENDING_APPROVAL,
      },
      {
        $set: {
          status: CourseStatusEnum.PUBLISHED,
          reviewedAt: new Date(),
          reviewedById: adminId,
          updatedById: adminId,
          rejectionReason: null,
        },
      },
      { new: true, runValidators: true },
    )
      .populate(CATEGORY_POPULATE)
      .populate(INSTRUCTOR_POPULATE)
      .session(session ?? null)
      .exec();

    return doc ? this.toDomain(doc) : null;
  }

  async rejectCourse(
    courseId: string,
    adminId: string,
    reason: string,
    session?: ClientSession,
  ): Promise<ICourse | null> {
    const doc = await this.model.findOneAndUpdate(
      {
        _id: courseId,
        deletedAt: null,
        status: CourseStatusEnum.PENDING_APPROVAL,
      },
      {
        $set: {
          status: CourseStatusEnum.DRAFT,
          rejectionReason: reason.trim(),
          reviewedAt: new Date(),
          reviewedById: adminId,
          updatedById: adminId,
        },
      },
      { new: true, runValidators: true },
    )
      .populate(CATEGORY_POPULATE)
      .populate(INSTRUCTOR_POPULATE)
      .session(session ?? null)
      .exec();

    return doc ? this.toDomain(doc) : null;
  }

  async findAdminCoursesWithPagination(
    queryDto: QueryCoursesAdminDto,
    session?: ClientSession,
  ): Promise<PaginationResult<ICourse>> {
    const filterQuery: Record<string, unknown> = {
      deletedAt: null,
    };

    if (queryDto.search) {
      const escaped = queryDto.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filterQuery.title = { $regex: escaped, $options: 'i' };
    }

    if (queryDto.status) {
      filterQuery.status = queryDto.status;
    }

    if (queryDto.categoryId) {
      filterQuery.categoryId = queryDto.categoryId;
    }

    if (queryDto.instructorId) {
      filterQuery.instructorId = queryDto.instructorId;
    }

    const page = queryDto.page || 1;
    const limit = queryDto.limit || 10;
    const skip = (page - 1) * limit;

    const sortObj = this.buildSortObject(queryDto.sort);

    const [total, docs] = await Promise.all([
      this.model.countDocuments(filterQuery).session(session ?? null).exec(),
      this.model
        .find(filterQuery)
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .populate(CATEGORY_POPULATE)
        .populate(INSTRUCTOR_POPULATE)
        .session(session ?? null)
        .exec(),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items: docs.map((doc) => this.toDomain(doc)),
      total,
      page,
      limit,
      totalPages,
    };
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
      .populate(INSTRUCTOR_POPULATE)
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

  async findPublicCoursesWithPagination(
    queryDto: QueryPublicCoursesDto,
    categoryId?: string | null,
    session?: ClientSession,
  ): Promise<PaginationResult<ICourse>> {
    const filterQuery: Record<string, unknown> = {
      status: CourseStatusEnum.PUBLISHED,
      deletedAt: null,
    };

    if (queryDto.q) {
      const escaped = queryDto.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filterQuery.$or = [
        { title: { $regex: escaped, $options: 'i' } },
        { shortDescription: { $regex: escaped, $options: 'i' } },
      ];
    }

    if (categoryId) {
      filterQuery.categoryId = categoryId;
    }

    if (queryDto.level) {
      filterQuery.level = queryDto.level;
    }

    if (queryDto.priceRange) {
      switch (queryDto.priceRange) {
        case 'free':
          filterQuery.price = 0;
          break;
        case 'under-200':
          filterQuery.price = { $gt: 0, $lt: 200000 };
          break;
        case '200-500':
          filterQuery.price = { $gte: 200000, $lt: 500000 };
          break;
        case 'above-500':
          filterQuery.price = { $gte: 500000 };
          break;
        case 'discount':
          filterQuery.originalPrice = { $gt: 0 };
          filterQuery.$expr = { $gt: ['$originalPrice', '$price'] };
          break;
      }
    }

    const page = queryDto.page || 1;
    const limit = queryDto.limit || 10;
    const skip = (page - 1) * limit;

    let sortObj: Record<string, 1 | -1> = { createdAt: -1 };
    if (queryDto.sort === 'price-asc') {
      sortObj = { price: 1, createdAt: -1 };
    } else if (queryDto.sort === 'price-desc') {
      sortObj = { price: -1, createdAt: -1 };
    }

    const [total, docs] = await Promise.all([
      this.model.countDocuments(filterQuery).session(session ?? null).exec(),
      this.model
        .find(filterQuery)
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .populate(CATEGORY_POPULATE)
        .populate(INSTRUCTOR_POPULATE)
        .session(session ?? null)
        .exec(),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items: docs.map((doc) => this.toDomain(doc)),
      total,
      page,
      limit,
      totalPages,
    };
  }

  async findPublicCourseDetail(
    idOrSlug: string,
    session?: ClientSession,
  ): Promise<ICourse | null> {
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(idOrSlug);
    const filterQuery: Record<string, unknown> = {
      status: CourseStatusEnum.PUBLISHED,
      deletedAt: null,
      ...(isObjectId ? { $or: [{ _id: idOrSlug }, { slug: idOrSlug }] } : { slug: idOrSlug }),
    };

    const doc = await this.model
      .findOne(filterQuery)
      .populate(CATEGORY_POPULATE)
      .populate(INSTRUCTOR_POPULATE)
      .session(session ?? null)
      .exec();

    return doc ? this.toDomain(doc) : null;
  }
}
