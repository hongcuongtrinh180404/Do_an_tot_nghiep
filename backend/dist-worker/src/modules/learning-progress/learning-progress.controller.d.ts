import { ApiResponse } from '../base/index.js';
import { PlaybackHeartbeatDto, StartPlaybackSessionDto } from './dto/playback-session.dto.js';
import { LearningProgressService } from './services/learning-progress.service.js';
export declare class LearningProgressController {
    private readonly service;
    constructor(service: LearningProgressService);
    getMyProgress(userId: string): Promise<ApiResponse<import("share-lib").ICourseLearningProgress[]>>;
    getProgress(userId: string, courseId: string): Promise<ApiResponse<import("share-lib").ICourseLearningProgress | null>>;
    startSession(userId: string, courseId: string, dto: StartPlaybackSessionDto): Promise<ApiResponse<import("share-lib").IPlaybackSessionResponse>>;
    heartbeat(userId: string, courseId: string, dto: PlaybackHeartbeatDto): Promise<ApiResponse<import("share-lib").IPlaybackSessionResponse>>;
    endSession(userId: string, courseId: string, dto: PlaybackHeartbeatDto): Promise<ApiResponse<import("share-lib").IPlaybackSessionResponse>>;
}
