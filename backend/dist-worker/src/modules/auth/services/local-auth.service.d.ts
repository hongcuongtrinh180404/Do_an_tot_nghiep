import { IUser } from 'share-lib';
import { UserService } from '../../user/services/user.service.js';
export declare class LocalAuthService {
    private readonly userService;
    private readonly saltRounds;
    constructor(userService: UserService);
    hashPassword(password: string): Promise<string>;
    comparePassword(plain: string, hash: string): Promise<boolean>;
    validateUser(email: string, plainPassword: string): Promise<IUser>;
}
