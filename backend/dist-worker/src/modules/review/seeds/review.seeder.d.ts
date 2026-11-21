import { ISeeder, ISeederOptions } from '../../../database/seeds/seeder.interface.js';
import { ReviewRepository } from '../repositories/review.repository.js';
import { CourseRepository } from '../../course/repositories/course.repository.js';
import { UserRepository } from '../../user/repositories/user.repository.js';
import { EnrollmentRepository } from '../../enrollment/repositories/enrollment.repository.js';
export declare class ReviewSeeder implements ISeeder {
    private readonly reviewRepository;
    private readonly courseRepository;
    private readonly userRepository;
    private readonly enrollmentRepository;
    readonly name = "ReviewSeeder";
    private readonly logger;
    constructor(reviewRepository: ReviewRepository, courseRepository: CourseRepository, userRepository: UserRepository, enrollmentRepository: EnrollmentRepository);
    run(options?: ISeederOptions): Promise<void>;
}
