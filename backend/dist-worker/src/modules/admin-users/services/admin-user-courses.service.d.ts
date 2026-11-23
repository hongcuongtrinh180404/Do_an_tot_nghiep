import { type IAdminUserEnrolledCourse, type IAdminUserTeaching } from 'share-lib';
import { UserService } from '../../user/services/user.service.js';
import { LearningProgressService } from '../../learning-progress/services/learning-progress.service.js';
import { AdminUserCoursesRepository } from '../repositories/admin-user-courses.repository.js';
export declare class AdminUserCoursesService {
    private readonly users;
    private readonly courses;
    private readonly learning;
    constructor(users: UserService, courses: AdminUserCoursesRepository, learning: LearningProgressService);
    getEnrolledCourses(userId: string): Promise<IAdminUserEnrolledCourse[]>;
    getTeaching(userId: string): Promise<IAdminUserTeaching>;
}
