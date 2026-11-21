import { IResetPasswordPayload } from 'share-lib';
export declare class ResetPasswordDto implements IResetPasswordPayload {
    token: string;
    password: string;
}
