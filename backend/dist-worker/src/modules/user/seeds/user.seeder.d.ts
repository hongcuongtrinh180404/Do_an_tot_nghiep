import { ISeeder, ISeederOptions } from '../../../database/seeds/seeder.interface.js';
import { UserRepository } from '../repositories/user.repository.js';
export declare class UserSeeder implements ISeeder {
    private readonly userRepository;
    readonly name = "UserSeeder";
    private readonly logger;
    private readonly saltRounds;
    constructor(userRepository: UserRepository);
    private generateUsername;
    run(options?: ISeederOptions): Promise<void>;
}
