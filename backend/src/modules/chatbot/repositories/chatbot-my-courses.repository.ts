import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, type PipelineStage } from 'mongoose';
import { CourseStatusEnum } from 'share-lib';
import { EnrollmentEntity } from '../../enrollment/schemas/enrollment.schema.js';
import { LessonEntity } from '../../course/schemas/lesson.schema.js';

export interface OwnedCourseRow {
  enrollmentId: string;
  id: string;
  title: string;
  enrolledAt: Date;
  publicDetail: boolean;
}
export interface OwnedCourseCursor { enrolledAt: Date; enrollmentId: string }
export const CHATBOT_LEARNING_BATCH_SIZE = 50;
export const CHATBOT_LEARNING_QUERY_MS = 1500;

/** Only read operations. Never populate an entire course, instructor or payment. */
@Injectable()
export class ChatbotMyCoursesRepository {
  constructor(
    @InjectModel(EnrollmentEntity.name) private readonly enrollments: Model<EnrollmentEntity>,
    @InjectModel(LessonEntity.name) private readonly lessons: Model<LessonEntity>,
  ) {}

  async batch(userId: string, options: {
    keyword?: string; courseId?: string; after?: OwnedCourseCursor;
  } = {}): Promise<OwnedCourseRow[]> {
    const { after, keyword, courseId } = options;
    const pipeline: PipelineStage[] = [
      { $match: {
        userId: new Types.ObjectId(userId), deletedAt: null,
        ...(courseId ? { courseId: new Types.ObjectId(courseId) } : {}),
        ...(after ? { $or: [
          { enrolledAt: { $lt: after.enrolledAt } },
          { enrolledAt: after.enrolledAt, _id: { $lt: new Types.ObjectId(after.enrollmentId) } },
        ] } : {}),
      } },
      { $sort: { enrolledAt: -1, _id: -1 } },
      { $lookup: {
        from: 'courses', localField: 'courseId', foreignField: '_id',
        pipeline: [
          { $match: { deletedAt: null, ...(keyword ? {
            title: { $regex: keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' },
          } : {}) } },
          { $project: { title: 1, status: 1 } },
        ],
        as: 'course',
      } },
      { $unwind: '$course' },
      { $limit: CHATBOT_LEARNING_BATCH_SIZE },
      { $project: {
        _id: 0, enrollmentId: { $toString: '$_id' }, id: { $toString: '$course._id' },
        title: '$course.title', enrolledAt: 1,
        publicDetail: { $eq: ['$course.status', CourseStatusEnum.PUBLISHED] },
      } },
    ];
    return this.enrollments.aggregate<OwnedCourseRow>(pipeline)
      .option({ maxTimeMS: CHATBOT_LEARNING_QUERY_MS }).exec();
  }

  async resumeTitle(courseId: string, lessonId: string): Promise<string | null> {
    const [lesson] = await this.lessons.aggregate<{ title: string }>([
      { $match: { _id: new Types.ObjectId(lessonId), deletedAt: null } },
      { $lookup: { from: 'sections', localField: 'sectionId', foreignField: '_id', as: 'section' } },
      { $unwind: '$section' },
      { $match: { 'section.courseId': new Types.ObjectId(courseId), 'section.deletedAt': null } },
      { $project: { _id: 0, title: 1 } },
    ]).option({ maxTimeMS: CHATBOT_LEARNING_QUERY_MS }).exec();
    return lesson?.title ?? null;
  }
}
