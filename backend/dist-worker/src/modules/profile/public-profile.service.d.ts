import { type IPublicProfileCourses } from 'share-lib';
import { UserService } from '../user/services/user.service.js';
import { LearningProgressService } from '../learning-progress/services/learning-progress.service.js';
import { PublicProfileRepository } from './public-profile.repository.js';
import { ProfileCoursesDto } from './dto/profile-courses.dto.js';
export declare class PublicProfileService {
    private readonly users;
    private readonly profiles;
    private readonly progress;
    constructor(users: UserService, profiles: PublicProfileRepository, progress: LearningProgressService);
    getCourses(username: string, query: ProfileCoursesDto): Promise<IPublicProfileCourses>;
}
