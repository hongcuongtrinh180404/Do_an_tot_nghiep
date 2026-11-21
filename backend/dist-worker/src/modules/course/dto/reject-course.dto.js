var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
export class RejectCourseDto {
    reason;
}
__decorate([
    IsString({ message: 'Lý do yêu cầu chỉnh sửa phải là chuỗi ký tự' }),
    IsNotEmpty({ message: 'Vui lòng nhập lý do yêu cầu chỉnh sửa' }),
    MinLength(10, { message: 'Lý do yêu cầu chỉnh sửa phải có ít nhất 10 ký tự' }),
    Transform(({ value }) => typeof value === 'string' ? value.trim() : value),
    __metadata("design:type", String)
], RejectCourseDto.prototype, "reason", void 0);
//# sourceMappingURL=reject-course.dto.js.map