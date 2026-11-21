var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
export class RejectInstructorApplicationDto {
    rejectionReason;
}
__decorate([
    IsNotEmpty({ message: 'Lý do từ chối không được để trống' }),
    IsString({ message: 'Lý do từ chối phải là chuỗi ký tự' }),
    MinLength(10, { message: 'Lý do từ chối phải có ít nhất 10 ký tự' }),
    MaxLength(1000, { message: 'Lý do từ chối không được vượt quá 1000 ký tự' }),
    Transform(({ value }) => typeof value === 'string' ? value.trim() : value),
    __metadata("design:type", String)
], RejectInstructorApplicationDto.prototype, "rejectionReason", void 0);
//# sourceMappingURL=reject-instructor-application.dto.js.map