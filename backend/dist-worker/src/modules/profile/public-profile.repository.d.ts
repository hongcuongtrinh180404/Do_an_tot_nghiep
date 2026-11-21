import { Model, Types } from 'mongoose';
import { CourseEntity } from '../course/schemas/course.schema.js';
import { EnrollmentEntity } from '../enrollment/schemas/enrollment.schema.js';
import { type ProfileCursor } from './profile-cursor.util.js';
export declare const PROFILE_PAGE_SIZE = 5;
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
export declare class PublicProfileRepository {
    private readonly courses;
    private readonly enrollments;
    constructor(courses: Model<CourseEntity>, enrollments: Model<EnrollmentEntity>);
    private learningStages;
    private authorStages;
    private projectCourse;
    findLearning(userId: string, cursor: ProfileCursor | null): Promise<ProfileCourseRow[]>;
    findTeaching(userId: string, cursor: ProfileCursor | null): Promise<ProfileCourseRow[]>;
    countLearning(userId: string): Promise<number>;
    countTeaching(userId: string): Promise<number>;
}
