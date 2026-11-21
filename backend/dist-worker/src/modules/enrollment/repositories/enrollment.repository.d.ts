import { Model, ClientSession } from 'mongoose';
import { IEnrollment } from 'share-lib';
import { BaseMongoRepository } from '../../base/index.js';
import { EnrollmentEntity } from '../schemas/enrollment.schema.js';
export declare class EnrollmentRepository extends BaseMongoRepository<IEnrollment, EnrollmentEntity> {
    constructor(enrollmentModel: Model<EnrollmentEntity>);
    findByUserAndCourse(userId: string, courseId: string, session?: ClientSession): Promise<IEnrollment | null>;
    ensureIndexes(): Promise<void>;
    hasRevokedEnrollment(userId: string, courseId: string, orderId: string, session: ClientSession): Promise<boolean>;
    findUserEnrollments(userId: string, session?: ClientSession): Promise<IEnrollment[]>;
    countByCourseId(courseId: string): Promise<number>;
    countByCourseIds(courseIds: string[]): Promise<Map<string, number>>;
}
