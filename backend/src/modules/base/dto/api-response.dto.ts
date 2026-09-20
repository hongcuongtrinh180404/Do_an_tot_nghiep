export class ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;

  constructor(data: T, message?: string, success = true) {
    this.success = success;
    this.data = data;
    this.message = message;
    this.timestamp = new Date().toISOString();
  }

  static success<T>(data: T, message?: string): ApiResponse<T> {
    return new ApiResponse<T>(data, message, true);
  }

  static error<T>(message: string, data: T = null as unknown as T): ApiResponse<T> {
    return new ApiResponse<T>(data, message, false);
  }
}
