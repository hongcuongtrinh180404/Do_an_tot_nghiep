var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Injectable } from '@nestjs/common';
import { ParseObjectIdPipe } from '../../base/index.js';
import { LessonService } from '../services/lesson.service.js';
let LessonAccessGuard = class LessonAccessGuard {
    lessonService;
    objectIdPipe = new ParseObjectIdPipe();
    constructor(lessonService) {
        this.lessonService = lessonService;
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const id = this.objectIdPipe.transform(request.params.id);
        await this.lessonService.getAccessibleLesson(id, request.user?.id, request.user?.role);
        return true;
    }
};
LessonAccessGuard = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [LessonService])
], LessonAccessGuard);
export { LessonAccessGuard };
//# sourceMappingURL=lesson-access.guard.js.map