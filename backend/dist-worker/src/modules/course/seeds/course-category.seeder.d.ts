import { ISeeder, ISeederOptions } from '../../../database/seeds/seeder.interface.js';
import { CourseCategoryRepository } from '../repositories/course-category.repository.js';
export declare class CourseCategorySeeder implements ISeeder {
    private readonly courseCategoryRepository;
    readonly name = "CourseCategorySeeder";
    private readonly logger;
    constructor(courseCategoryRepository: CourseCategoryRepository);
    run(options?: ISeederOptions): Promise<void>;
}
