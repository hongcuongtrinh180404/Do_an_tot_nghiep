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
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { LessonQuizAnswerEntity, LessonVideoCompletionEntity } from '../schemas/lesson-completion.schema.js';
let LessonCompletionRepository = class LessonCompletionRepository {
    answers;
    videos;
    constructor(answers, videos) {
        this.answers = answers;
        this.videos = videos;
    }
    async findAnswers(userId, lessonId) {
        const docs = await this.answers.find({ userId, lessonId, deletedAt: null }).lean().exec();
        return docs.map((doc) => ({
            quizId: String(doc.quizId), quizRevision: doc.quizRevision,
            selectedOptionIds: doc.selectedOptionIds, isCorrect: doc.isCorrect,
            correctOptionIds: doc.correctOptionIds, submittedAt: doc.submittedAt,
        }));
    }
    async findAnswersForCourse(userId, courseId) {
        const docs = await this.answers.find({ userId, courseId, deletedAt: null }).lean().exec();
        return docs.map((doc) => ({
            lessonId: String(doc.lessonId), quizId: String(doc.quizId), quizRevision: doc.quizRevision,
            selectedOptionIds: doc.selectedOptionIds, isCorrect: doc.isCorrect,
            correctOptionIds: doc.correctOptionIds, submittedAt: doc.submittedAt,
        }));
    }
    async findVideoCompletionsForCourse(userId, courseId) {
        const docs = await this.videos.find({ userId, courseId, deletedAt: null }).select({ lessonId: 1, mediaVersion: 1 }).lean().exec();
        return docs.map((doc) => ({ lessonId: String(doc.lessonId), mediaVersion: doc.mediaVersion }));
    }
    async findAnswersForCourses(userId, courseIds, maxTimeMS) {
        if (courseIds.length === 0)
            return [];
        const query = this.answers.find({ userId, courseId: { $in: courseIds }, deletedAt: null })
            .select({ courseId: 1, lessonId: 1, quizId: 1, quizRevision: 1, selectedOptionIds: 1,
            isCorrect: 1, correctOptionIds: 1, submittedAt: 1 }).lean();
        if (maxTimeMS)
            query.maxTimeMS(maxTimeMS);
        const docs = await query.exec();
        return docs.map((doc) => ({
            courseId: String(doc.courseId), lessonId: String(doc.lessonId),
            quizId: String(doc.quizId), quizRevision: doc.quizRevision,
            selectedOptionIds: doc.selectedOptionIds, isCorrect: doc.isCorrect,
            correctOptionIds: doc.correctOptionIds, submittedAt: doc.submittedAt,
        }));
    }
    async findVideoCompletionsForCourses(userId, courseIds, maxTimeMS) {
        if (courseIds.length === 0)
            return [];
        const query = this.videos.find({ userId, courseId: { $in: courseIds }, deletedAt: null })
            .select({ courseId: 1, lessonId: 1, mediaVersion: 1 }).lean();
        if (maxTimeMS)
            query.maxTimeMS(maxTimeMS);
        const docs = await query.exec();
        return docs.map((doc) => ({
            courseId: String(doc.courseId), lessonId: String(doc.lessonId), mediaVersion: doc.mediaVersion,
        }));
    }
    async saveAnswer(userId, courseId, lessonId, answer, quiz) {
        const filter = { userId, lessonId, quizId: answer.quizId, quizRevision: answer.quizRevision };
        try {
            await this.answers.updateOne(filter, { $setOnInsert: {
                    ...filter, courseId, selectedOptionIds: answer.selectedOptionIds,
                    isCorrect: answer.isCorrect, correctOptionIds: answer.correctOptionIds,
                    submittedAt: answer.submittedAt, quizSnapshot: quiz, createdById: userId,
                } }, { upsert: true }).exec();
        }
        catch (error) {
            if (error.code !== 11000)
                throw error;
        }
    }
    async hasVideoEnded(userId, lessonId, mediaVersion) {
        return Boolean(await this.videos.exists({ userId, lessonId, mediaVersion, deletedAt: null }));
    }
    async saveVideoEnded(userId, courseId, lessonId, mediaVersion) {
        const filter = { userId, lessonId, mediaVersion };
        try {
            await this.videos.updateOne(filter, { $setOnInsert: {
                    ...filter, courseId, endedAt: new Date(), createdById: userId,
                } }, { upsert: true }).exec();
        }
        catch (error) {
            if (error.code !== 11000)
                throw error;
        }
    }
};
LessonCompletionRepository = __decorate([
    Injectable(),
    __param(0, InjectModel(LessonQuizAnswerEntity.name)),
    __param(1, InjectModel(LessonVideoCompletionEntity.name)),
    __metadata("design:paramtypes", [Model,
        Model])
], LessonCompletionRepository);
export { LessonCompletionRepository };
//# sourceMappingURL=lesson-completion.repository.js.map