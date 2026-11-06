import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ClientSession } from 'mongoose';
import {
  IEnrollment,
  ICourse,
  ICourseInstructorSummary,
  ICourseCategorySummary,
} from 'share-lib';
import { BaseMongoRepository } from '../../base/index.js';
import { EnrollmentEntity } from '../schemas/enrollment.schema.js';

const COURSE_POPULATE = {
  path: 'courseId',
  populate: [
    {
      path: 'categoryId',
      select: 'name slug imageUrl isActive',
    },
    {
      path: 'instructorId',
      select: 'fullName email avatarUrl',
    },
  ],
};

@Injectable()
export class EnrollmentRepository extends BaseMongoRepository<IEnrollment, EnrollmentEntity> {
  constructor(
    @InjectModel(EnrollmentEntity.name)
    enrollmentModel: Model<EnrollmentEntity>,
  ) {
    super(enrollmentModel, (doc) => {
      const plain =
        typeof (doc as { toObject?: () => Record<string, unknown> }).toObject === 'function'
          ? (doc as { toObject: () => Record<string, unknown> }).toObject()
          : (doc as unknown as Record<string, unknown>);

      const rawId = plain._id;
      const id = typeof rawId === 'string' ? rawId : (rawId as { toString?: () => string })?.toString?.();
      const rawUserId = plain.userId;
      const userId = typeof rawUserId === 'string' ? rawUserId : (rawUserId as { toString?: () => string })?.toString?.() ?? '';

      const rawCourse = plain.courseId as unknown;
      let courseId = '';
      let course: ICourse | null = null;

      const isPopulatedCourse =
        rawCourse !== null &&
        typeof rawCourse === 'object' &&
        'title' in rawCourse;

      if (isPopulatedCourse) {
        const popCourse = rawCourse as Record<string, unknown>;
        const popId = popCourse._id;
        courseId = typeof popId === 'string' ? popId : (popId as { toString?: () => string })?.toString?.() ?? '';

        // Map instructor
        const rawInstructor = popCourse.instructorId as unknown;
        let popInstructorId = '';
        let instructor: ICourseInstructorSummary | null = null;

        if (
          rawInstructor !== null &&
          typeof rawInstructor === 'object' &&
          'fullName' in rawInstructor
        ) {
          const popInst = rawInstructor as {
            _id?: unknown;
            fullName?: string;
            email?: string;
            avatarUrl?: string | null;
          };
          const popInstId = popInst._id;
          popInstructorId =
            typeof popInstId === 'string'
              ? popInstId
              : ((popInstId as { toString?: () => string })?.toString?.() ?? '');
          instructor = {
            id: popInstructorId,
            fullName: popInst.fullName ?? '',
            email: popInst.email ?? '',
            avatarUrl: popInst.avatarUrl ?? null,
          };
        } else if (rawInstructor !== null && rawInstructor !== undefined) {
          popInstructorId =
            typeof rawInstructor === 'string'
              ? rawInstructor
              : ((rawInstructor as { toString?: () => string }).toString?.() ?? '');
        }

        // Map category
        const rawCategory = popCourse.categoryId as unknown;
        let popCategoryId: string | null = null;
        let category: ICourseCategorySummary | null = null;

        if (
          rawCategory !== null &&
          typeof rawCategory === 'object' &&
          'name' in rawCategory
        ) {
          const popCat = rawCategory as {
            _id?: unknown;
            name?: string;
            slug?: string;
            imageUrl?: string | null;
          };
          const popCatId = popCat._id;
          popCategoryId =
            typeof popCatId === 'string'
              ? popCatId
              : ((popCatId as { toString?: () => string })?.toString?.() ?? null);
          if (popCategoryId) {
            category = {
              id: popCategoryId,
              name: popCat.name ?? '',
              slug: popCat.slug ?? '',
              imageUrl: popCat.imageUrl ?? null,
            };
          }
        } else if (rawCategory !== null && rawCategory !== undefined) {
          popCategoryId =
            typeof rawCategory === 'string'
              ? rawCategory
              : ((rawCategory as { toString?: () => string }).toString?.() ?? null);
        }

        course = {
          ...popCourse,
          id: courseId,
          instructorId: popInstructorId,
          instructor,
          categoryId: popCategoryId,
          category,
        } as unknown as ICourse;
      } else if (rawCourse !== null && rawCourse !== undefined) {
        courseId = typeof rawCourse === 'string' ? rawCourse : (rawCourse as { toString?: () => string }).toString?.() ?? '';
      }

      const rawOrderId = plain.orderId;
      const orderId = typeof rawOrderId === 'string' ? rawOrderId : (rawOrderId as { toString?: () => string } | null)?.toString?.() ?? null;

      return {
        ...plain,
        id: id as string,
        userId,
        courseId,
        orderId,
        course,
      } as unknown as IEnrollment;
    });
  }

  async findByUserAndCourse(
    userId: string,
    courseId: string,
    session?: ClientSession,
  ): Promise<IEnrollment | null> {
    const doc = await this.model
      .findOne({
        userId,
        courseId,
        deletedAt: null,
      })
      .session(session ?? null)
      .exec();

    return doc ? this.toDomain(doc) : null;
  }

  async findUserEnrollments(
    userId: string,
    session?: ClientSession,
  ): Promise<IEnrollment[]> {
    const docs = await this.model
      .find({
        userId,
        deletedAt: null,
      })
      .sort({ enrolledAt: -1 })
      .populate(COURSE_POPULATE)
      .session(session ?? null)
      .exec();

    return docs.map((doc) => this.toDomain(doc));
  }

  async countByCourseId(courseId: string): Promise<number> {
    return this.model.countDocuments({ courseId, deletedAt: null }).exec();
  }
}

