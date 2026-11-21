import { ICourse, IEnrollment, RoleEnum } from 'share-lib';
import { ApiResponse } from '../base/index.js';
import { EnrollmentService } from './services/enrollment.service.js';
import { RegisterFreeCourseDto } from './dto/register-free-course.dto.js';
export declare class EnrollmentController {
    private readonly enrollmentService;
    constructor(enrollmentService: EnrollmentService);
    getMyCourses(userId: string, role: RoleEnum): Promise<ApiResponse<ICourse[]>>;
    checkEnrollment(courseId: string, userId: string): Promise<ApiResponse<{
        isEnrolled: boolean;
    }>>;
    registerFreeCourse(userId: string, dto: RegisterFreeCourseDto): Promise<ApiResponse<IEnrollment>>;
}
