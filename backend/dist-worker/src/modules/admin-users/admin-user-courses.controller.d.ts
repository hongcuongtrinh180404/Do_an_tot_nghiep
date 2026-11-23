import { type IAdminUserEnrolledCourse, type IAdminUserTeaching } from 'share-lib';
import { ApiResponse } from '../base/index.js';
import { AdminUserCoursesService } from './services/admin-user-courses.service.js';
export declare class AdminUserCoursesController {
    private readonly service;
    constructor(service: AdminUserCoursesService);
    getEnrolledCourses(userId: string): Promise<ApiResponse<IAdminUserEnrolledCourse[]>>;
    getTeaching(userId: string): Promise<ApiResponse<IAdminUserTeaching>>;
}
