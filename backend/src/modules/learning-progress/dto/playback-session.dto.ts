import { IsInt, IsMongoId, IsNumber, IsUUID, Max, Min } from 'class-validator';
import type { IPlaybackHeartbeat, IStartPlaybackSession } from 'share-lib';

export class StartPlaybackSessionDto implements IStartPlaybackSession {
  @IsUUID('4')
  sessionId: string;

  @IsMongoId()
  lessonId: string;
}

export class PlaybackHeartbeatDto implements IPlaybackHeartbeat {
  @IsUUID('4')
  sessionId: string;

  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  sequence: number;

  @IsInt()
  @Min(0)
  @Max(Number.MAX_SAFE_INTEGER)
  watchedMs: number;

  @IsNumber({ allowInfinity: false, allowNaN: false })
  @Min(0)
  @Max(Number.MAX_SAFE_INTEGER / 1000)
  positionSeconds: number;
}
