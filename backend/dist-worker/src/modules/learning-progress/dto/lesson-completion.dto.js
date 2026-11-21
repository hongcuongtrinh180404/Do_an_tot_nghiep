var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { ArrayMaxSize, ArrayNotEmpty, ArrayUnique, IsArray, IsMongoId, IsNumber, IsString, Length, Min } from 'class-validator';
export class SubmitLessonQuizAnswerDto {
    quizId;
    quizRevision;
    selectedOptionIds;
}
__decorate([
    IsMongoId(),
    __metadata("design:type", String)
], SubmitLessonQuizAnswerDto.prototype, "quizId", void 0);
__decorate([
    IsString(),
    Length(64, 64),
    __metadata("design:type", String)
], SubmitLessonQuizAnswerDto.prototype, "quizRevision", void 0);
__decorate([
    IsArray(),
    ArrayNotEmpty(),
    ArrayUnique(),
    ArrayMaxSize(100),
    IsString({ each: true }),
    __metadata("design:type", Array)
], SubmitLessonQuizAnswerDto.prototype, "selectedOptionIds", void 0);
export class CompleteLessonVideoDto {
    mediaVersion;
    positionSeconds;
}
__decorate([
    IsString(),
    Length(64, 64),
    __metadata("design:type", String)
], CompleteLessonVideoDto.prototype, "mediaVersion", void 0);
__decorate([
    IsNumber({ allowNaN: false, allowInfinity: false }),
    Min(0),
    __metadata("design:type", Number)
], CompleteLessonVideoDto.prototype, "positionSeconds", void 0);
//# sourceMappingURL=lesson-completion.dto.js.map