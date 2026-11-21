import type { IPlaybackHeartbeat, IStartPlaybackSession } from 'share-lib';
export declare class StartPlaybackSessionDto implements IStartPlaybackSession {
    sessionId: string;
    lessonId: string;
}
export declare class PlaybackHeartbeatDto implements IPlaybackHeartbeat {
    sessionId: string;
    sequence: number;
    watchedMs: number;
    positionSeconds: number;
}
