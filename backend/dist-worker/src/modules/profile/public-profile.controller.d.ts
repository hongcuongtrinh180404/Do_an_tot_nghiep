import type { IPublicProfileCourses } from 'share-lib';
import { ApiResponse } from '../base/index.js';
import { ProfileCoursesDto } from './dto/profile-courses.dto.js';
import { PublicProfileService } from './public-profile.service.js';
export declare class PublicProfileController {
    private readonly profiles;
    constructor(profiles: PublicProfileService);
    getCourses(username: string, query: ProfileCoursesDto): Promise<ApiResponse<IPublicProfileCourses>>;
}
