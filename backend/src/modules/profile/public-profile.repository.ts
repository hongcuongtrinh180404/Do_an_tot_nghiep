import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, type PipelineStage } from 'mongoose';
import { CourseStatusEnum } from 'share-lib';
import { CourseEntity } from '../course/schemas/course.schema.js';
import { EnrollmentEntity } from '../enrollment/schemas/enrollment.schema.js';
import { profileCursorStages, type ProfileCursor } from './profile-cursor.util.js';

export const PROFILE_PAGE_SIZE = 5;

export interface ProfileCourseRow {
  id: string;
  title: string;
  slug: string;
  thumbnailUrl: string | null;
  instructorName: string;
  instructorUsername: string | null;
  sortId: Types.ObjectId;
  sortDate: Date;
}

@Injectable()
export class PublicProfileRepository {
  constructor(
    @InjectModel(CourseEntity.name) private readonly courses: Model<CourseEntity>,
    @InjectModel(EnrollmentEntity.name) private readonly enrollments: Model<EnrollmentEntity>,
  ) {}

  private learningStages(userId: string): PipelineStage[] {
    return [
      { $match: { userId: new Types.ObjectId(userId), deletedAt: null } },
      { $lookup: { from: this.courses.collection.name, localField: 'courseId', foreignField: '_id', as: 'course' } },
      { $unwind: '$course' },
      { $match: { 'course.deletedAt': null, 'course.status': CourseStatusEnum.PUBLISHED } },
    ];
  }

  private authorStages(path: string): PipelineStage[] {
    return [
      {
        $lookup: {
          from: 'users',
          let: { instructorId: `$${path}instructorId` },
          pipeline: [
            { $match: { $expr: { $eq: ['$_id', '$$instructorId'] }, deletedAt: null } },
            { $project: { _id: 0, fullName: 1, username: 1 } },
          ],
          as: 'author',
        },
      },
    ];
  }

  private projectCourse(path: string, dateField: string, sortId = '$_id'): PipelineStage.Project {
    return {
      $project: {
        _id: 0,
        id: { $toString: path ? `$${path}_id` : '$_id' },
        title: `$${path}title`,
        slug: `$${path}slug`,
        thumbnailUrl: { $ifNull: [`$${path}thumbnailUrl`, null] },
        instructorName: { $ifNull: [{ $arrayElemAt: ['$author.fullName', 0] }, 'Giảng viên'] },
        instructorUsername: { $ifNull: [{ $arrayElemAt: ['$author.username', 0] }, null] },
        sortId,
        sortDate: `$${dateField}`,
      },
    };
  }

  async findLearning(userId: string, cursor: ProfileCursor | null): Promise<ProfileCourseRow[]> {
    return this.enrollments.aggregate<ProfileCourseRow>([
      ...this.learningStages(userId),
      ...profileCursorStages(cursor, 'enrolledAt', 'courseId'),
      { $sort: { enrolledAt: -1, courseId: -1 } },
      { $limit: PROFILE_PAGE_SIZE + 1 },
      ...this.authorStages('course.'),
      this.projectCourse('course.', 'enrolledAt', '$courseId'),
    ]).exec();
  }

  async findTeaching(userId: string, cursor: ProfileCursor | null): Promise<ProfileCourseRow[]> {
    return this.courses.aggregate<ProfileCourseRow>([
      { $match: { instructorId: new Types.ObjectId(userId), status: CourseStatusEnum.PUBLISHED, deletedAt: null } },
      ...profileCursorStages(cursor, 'createdAt'),
      { $sort: { createdAt: -1, _id: -1 } },
      { $limit: PROFILE_PAGE_SIZE + 1 },
      ...this.authorStages(''),
      this.projectCourse('', 'createdAt'),
    ]).exec();
  }

  async countLearning(userId: string): Promise<number> {
    const [result] = await this.enrollments.aggregate<{ total: number }>([
      ...this.learningStages(userId), { $count: 'total' },
    ]).exec();
    return result?.total ?? 0;
  }

  async countTeaching(userId: string): Promise<number> {
    return this.courses.countDocuments({
      instructorId: userId, status: CourseStatusEnum.PUBLISHED, deletedAt: null,
    }).exec();
  }
}
