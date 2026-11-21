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
import { RoleEnum } from 'share-lib';
import { UserService } from '../user/services/user.service.js';
import { LearningProgressService } from '../learning-progress/services/learning-progress.service.js';
import { PublicProfileRepository, PROFILE_PAGE_SIZE } from './public-profile.repository.js';
import { decodeProfileCursor, encodeProfileCursor } from './profile-cursor.util.js';
let PublicProfileService = class PublicProfileService {
    users;
    profiles;
    progress;
    constructor(users, profiles, progress) {
        this.users = users;
        this.profiles = profiles;
        this.progress = progress;
    }
    async getCourses(username, query) {
        const user = await this.users.findPublicUserByUsername(username);
        const cursor = decodeProfileCursor(query.cursor, query.type);
        const instructor = user.role === RoleEnum.INSTRUCTOR;
        const [rows, learning, teaching] = await Promise.all([
            query.type === 'learning'
                ? this.profiles.findLearning(user.id, cursor)
                : instructor ? this.profiles.findTeaching(user.id, cursor) : [],
            this.profiles.countLearning(user.id),
            instructor ? this.profiles.countTeaching(user.id) : 0,
        ]);
        const page = rows.slice(0, PROFILE_PAGE_SIZE);
        const courseIds = page.map((course) => course.id);
        const progress = query.type === 'learning' && courseIds.length
            ? await this.progress.getProgressForCourses(user.id, courseIds)
            : [];
        const progressByCourse = new Map(progress.map((summary) => [summary.courseId, summary]));
        const items = page.map((course) => {
            const summary = progressByCourse.get(course.id);
            return {
                id: course.id, title: course.title, slug: course.slug,
                thumbnailUrl: course.thumbnailUrl,
                instructorName: course.instructorName,
                instructorUsername: course.instructorUsername,
                progress: summary ? { percent: summary.progressPercent, status: summary.status } : null,
            };
        });
        const last = page.at(-1);
        return {
            items,
            nextCursor: rows.length > PROFILE_PAGE_SIZE && last
                ? encodeProfileCursor({ at: last.sortDate, id: last.sortId }, query.type)
                : null,
            counts: { learning, teaching },
        };
    }
};
PublicProfileService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [UserService,
        PublicProfileRepository,
        LearningProgressService])
], PublicProfileService);
export { PublicProfileService };
//# sourceMappingURL=public-profile.service.js.map