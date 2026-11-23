export class ChatbotBusinessError extends Error {
    code;
    constructor(code) {
        super(code);
        this.code = code;
    }
}
export class BusinessFollowUpError extends Error {
    reason;
    constructor(reason) {
        super(reason);
        this.reason = reason;
    }
}
//# sourceMappingURL=instructor-business.types.js.map