import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { IJwtPayload, IUserProfile } from 'share-lib';
import { UserService } from '../../user/services/user.service.js';
declare const JwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtStrategy extends JwtStrategy_base {
    private readonly userService;
    constructor(configService: ConfigService, userService: UserService);
    validate(payload: IJwtPayload): Promise<IUserProfile>;
}
export {};
