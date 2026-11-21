var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { CourseApprovalActionEnum } from 'share-lib';
import { PaginationParamsDto } from '../../base/index.js';
export class QueryCourseApprovalHistoryDto extends PaginationParamsDto {
    action;
    courseId;
    search;
}
__decorate([
    IsOptional(),
    IsEnum(CourseApprovalActionEnum),
    __metadata("design:type", String)
], QueryCourseApprovalHistoryDto.prototype, "action", void 0);
__decorate([
    IsOptional(),
    IsString(),
    Transform(({ value }) => typeof value === 'string' && value.trim() ? value.trim() : undefined),
    __metadata("design:type", String)
], QueryCourseApprovalHistoryDto.prototype, "courseId", void 0);
__decorate([
    IsOptional(),
    IsString(),
    Transform(({ value }) => typeof value === 'string' && value.trim() ? value.trim() : undefined),
    __metadata("design:type", String)
], QueryCourseApprovalHistoryDto.prototype, "search", void 0);
//# sourceMappingURL=query-course-approval-history.dto.js.map