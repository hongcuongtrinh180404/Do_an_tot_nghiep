var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiResponse } from '../base/index.js';
import { Public } from '../auth/decorators/public.decorator.js';
import { ProfileCoursesDto } from './dto/profile-courses.dto.js';
import { PublicProfileService } from './public-profile.service.js';
let PublicProfileController = class PublicProfileController {
    profiles;
    constructor(profiles) {
        this.profiles = profiles;
    }
    async getCourses(username, query) {
        return ApiResponse.success(await this.profiles.getCourses(username, query), 'Lấy khóa học hồ sơ thành công');
    }
};
__decorate([
    Get(':username/courses'),
    Public(),
    __param(0, Param('username')),
    __param(1, Query()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, ProfileCoursesDto]),
    __metadata("design:returntype", Promise)
], PublicProfileController.prototype, "getCourses", null);
PublicProfileController = __decorate([
    Controller('users/public'),
    __metadata("design:paramtypes", [PublicProfileService])
], PublicProfileController);
export { PublicProfileController };
//# sourceMappingURL=public-profile.controller.js.map