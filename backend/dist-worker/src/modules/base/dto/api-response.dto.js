export class ApiResponse {
    success;
    data;
    message;
    timestamp;
    constructor(data, message, success = true) {
        this.success = success;
        this.data = data;
        this.message = message;
        this.timestamp = new Date().toISOString();
    }
    static success(data, message) {
        return new ApiResponse(data, message, true);
    }
    static error(message, data = null) {
        return new ApiResponse(data, message, false);
    }
}
//# sourceMappingURL=api-response.dto.js.map