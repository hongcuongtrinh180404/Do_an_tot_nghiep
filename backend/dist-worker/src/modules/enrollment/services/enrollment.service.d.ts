import { ClsService } from 'nestjs-cls';
import { ClientSession } from 'mongoose';
import { IEnrollment, ICourse, RoleEnum } from 'share-lib';
import { BaseService } from '../../base/index.js';
import { EnrollmentRepository } from '../repositories/enrollment.repository.js';
import { CourseRepository } from '../../course/repositories/course.repository.js';
import { UserRepository } from '../../user/repositories/user.repository.js';
export declare class EnrollmentService extends BaseService<IEnrollment, string> {
    protected readonly enrollmentRepository: EnrollmentRepository;
    protected readonly courseRepository: CourseRepository;
    protected readonly userRepository: UserRepository;
    constructor(enrollmentRepository: EnrollmentRepository, courseRepository: CourseRepository, userRepository: UserRepository, cls: ClsService);
    checkEnrollment(userId: string, courseId: string, session?: ClientSession): Promise<boolean>;
    getMyPurchasedCourses(userId: string, _userRole?: RoleEnum, session?: ClientSession): Promise<ICourse[]>;
    registerFreeCourse(userId: string, courseId: string): Promise<IEnrollment>;
    private createFreeEnrollment;
}
