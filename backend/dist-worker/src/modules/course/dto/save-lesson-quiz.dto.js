var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { IsInt, Min, ValidateIf } from 'class-validator';
import { QuizQuestionContentDto } from './sync-lesson-quizzes.dto.js';
export class SaveLessonQuizDto extends QuizQuestionContentDto {
    timestamp;
}
__decorate([
    ValidateIf((_object, value) => value !== null),
    IsInt(),
    Min(0),
    __metadata("design:type", Object)
], SaveLessonQuizDto.prototype, "timestamp", void 0);
export class UpdateQuizTimestampDto {
    timestamp;
}
__decorate([
    ValidateIf((_object, value) => value !== null),
    IsInt(),
    Min(0),
    __metadata("design:type", Object)
], UpdateQuizTimestampDto.prototype, "timestamp", void 0);
//# sourceMappingURL=save-lesson-quiz.dto.js.map