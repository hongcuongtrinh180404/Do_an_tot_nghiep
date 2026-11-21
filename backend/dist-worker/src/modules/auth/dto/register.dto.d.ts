import { IRegisterPayload } from 'share-lib';
export declare class RegisterDto implements IRegisterPayload {
    email: string;
    password: string;
    fullName?: string;
    firstName?: string;
    lastName?: string;
}
