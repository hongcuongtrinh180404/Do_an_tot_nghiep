export class ChatbotLearningError extends Error {
    code;
    constructor(code) {
        super(code);
        this.code = code;
    }
}
export class LearningFollowUpError extends Error {
    reason;
    constructor(reason) {
        super(reason);
        this.reason = reason;
    }
}
//# sourceMappingURL=my-learning.types.js.map