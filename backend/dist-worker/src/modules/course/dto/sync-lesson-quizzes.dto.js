var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Type, Transform } from 'class-transformer';
import { IsArray, IsBoolean, IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateNested, } from 'class-validator';
import { QuizQuestionTypeEnum } from 'share-lib';
export class QuizOptionDto {
    id;
    label;
    text;
    isCorrect;
}
__decorate([
    IsString(),
    IsNotEmpty(),
    Transform(({ value }) => (typeof value === 'string' ? value.trim() : value)),
    __metadata("design:type", String)
], QuizOptionDto.prototype, "id", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    Transform(({ value }) => (typeof value === 'string' ? value.trim() : value)),
    __metadata("design:type", String)
], QuizOptionDto.prototype, "label", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    Transform(({ value }) => (typeof value === 'string' ? value.trim() : value)),
    __metadata("design:type", String)
], QuizOptionDto.prototype, "text", void 0);
__decorate([
    IsBoolean(),
    __metadata("design:type", Boolean)
], QuizOptionDto.prototype, "isCorrect", void 0);
export class QuizQuestionContentDto {
    question;
    questionType;
    options;
    explanation;
    explanationTimestamp;
}
__decorate([
    IsString(),
    IsNotEmpty(),
    Transform(({ value }) => (typeof value === 'string' ? value.trim() : value)),
    __metadata("design:type", String)
], QuizQuestionContentDto.prototype, "question", void 0);
__decorate([
    IsEnum(QuizQuestionTypeEnum),
    __metadata("design:type", String)
], QuizQuestionContentDto.prototype, "questionType", void 0);
__decorate([
    IsArray(),
    ValidateNested({ each: true }),
    Type(() => QuizOptionDto),
    __metadata("design:type", Array)
], QuizQuestionContentDto.prototype, "options", void 0);
__decorate([
    IsOptional(),
    IsString(),
    Transform(({ value }) => (typeof value === 'string' ? value.trim() : value)),
    __metadata("design:type", Object)
], QuizQuestionContentDto.prototype, "explanation", void 0);
__decorate([
    IsOptional(),
    IsInt(),
    Min(0),
    __metadata("design:type", Object)
], QuizQuestionContentDto.prototype, "explanationTimestamp", void 0);
export class QuizQuestionItemDto extends QuizQuestionContentDto {
    timestamp;
    id;
    order;
}
__decorate([
    IsOptional(),
    IsInt(),
    Min(0),
    __metadata("design:type", Object)
], QuizQuestionItemDto.prototype, "timestamp", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], QuizQuestionItemDto.prototype, "id", void 0);
__decorate([
    IsInt(),
    Min(1),
    __metadata("design:type", Number)
], QuizQuestionItemDto.prototype, "order", void 0);
export class SyncLessonQuizzesAtTimestampDto {
    timestamp;
    questions;
    quizzes;
}
__decorate([
    IsNumber(),
    Min(0),
    __metadata("design:type", Number)
], SyncLessonQuizzesAtTimestampDto.prototype, "timestamp", void 0);
__decorate([
    IsArray(),
    ValidateNested({ each: true }),
    Type(() => QuizQuestionItemDto),
    Transform(({ value, obj }) => {
        if (Array.isArray(value))
            return value;
        if (Array.isArray(obj?.quizzes))
            return obj.quizzes;
        return value;
    }),
    __metadata("design:type", Array)
], SyncLessonQuizzesAtTimestampDto.prototype, "questions", void 0);
__decorate([
    IsOptional(),
    IsArray(),
    ValidateNested({ each: true }),
    Type(() => QuizQuestionItemDto),
    __metadata("design:type", Array)
], SyncLessonQuizzesAtTimestampDto.prototype, "quizzes", void 0);
//# sourceMappingURL=sync-lesson-quizzes.dto.js.map