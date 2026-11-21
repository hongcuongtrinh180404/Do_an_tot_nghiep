export declare class ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
    timestamp: string;
    constructor(data: T, message?: string, success?: boolean);
    static success<T>(data: T, message?: string): ApiResponse<T>;
    static error<T>(message: string, data?: T): ApiResponse<T>;
}
