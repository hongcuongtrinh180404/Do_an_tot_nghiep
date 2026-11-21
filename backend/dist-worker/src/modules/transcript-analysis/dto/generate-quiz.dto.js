var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { IsBoolean, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Transform } from 'class-transformer';
export class GenerateQuizDto {
    saveAsDraft = false;
    count = 10;
    targetLanguage = 'vi';
}
__decorate([
    IsOptional(),
    IsBoolean(),
    Transform(({ value }) => {
        if (value === 'true' || value === true)
            return true;
        if (value === 'false' || value === false)
            return false;
        return value;
    }),
    __metadata("design:type", Boolean)
], GenerateQuizDto.prototype, "saveAsDraft", void 0);
__decorate([
    IsOptional(),
    IsNumber(),
    Min(1),
    Max(20),
    Transform(({ value }) => {
        if (typeof value === 'string')
            return parseInt(value, 10);
        return value;
    }),
    __metadata("design:type", Number)
], GenerateQuizDto.prototype, "count", void 0);
__decorate([
    IsOptional(),
    IsString(),
    Transform(({ value }) => (typeof value === 'string' ? value.trim() : value)),
    __metadata("design:type", String)
], GenerateQuizDto.prototype, "targetLanguage", void 0);
//# sourceMappingURL=generate-quiz.dto.js.map