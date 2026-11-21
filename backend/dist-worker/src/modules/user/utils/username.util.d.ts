export declare const USERNAME_MAX_LENGTH = 30;
export declare const USERNAME_FALLBACK = "user";
export declare const USERNAME_PATTERN: RegExp;
export declare function buildUsernameBase(email: string): string;
export declare function buildUsernameWithSuffix(base: string, suffix: number | string): string;
export declare function generateUsername(email: string, isTaken: (candidate: string) => Promise<boolean>): Promise<string>;
export declare function isUsernameDuplicateKeyError(error: unknown): boolean;
