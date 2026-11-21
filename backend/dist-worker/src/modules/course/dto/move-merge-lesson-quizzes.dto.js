var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { IsNotEmpty, IsNumber, Min } from 'class-validator';
export class MoveMergeLessonQuizzesDto {
    sourceTimestamp;
    targetTimestamp;
}
__decorate([
    IsNotEmpty({ message: 'Mốc thời gian nguồn không được để trống' }),
    IsNumber({}, { message: 'Mốc thời gian nguồn phải là số giây' }),
    Min(0, { message: 'Mốc thời gian nguồn không được âm' }),
    __metadata("design:type", Number)
], MoveMergeLessonQuizzesDto.prototype, "sourceTimestamp", void 0);
__decorate([
    IsNotEmpty({ message: 'Mốc thời gian đích không được để trống' }),
    IsNumber({}, { message: 'Mốc thời gian đích phải là số giây' }),
    Min(0, { message: 'Mốc thời gian đích không được âm' }),
    __metadata("design:type", Number)
], MoveMergeLessonQuizzesDto.prototype, "targetTimestamp", void 0);
//# sourceMappingURL=move-merge-lesson-quizzes.dto.js.map