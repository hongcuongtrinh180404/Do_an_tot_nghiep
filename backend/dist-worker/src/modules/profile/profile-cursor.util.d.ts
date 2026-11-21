import { Types, type PipelineStage } from 'mongoose';
import type { ProfileCourseType } from 'share-lib';
export interface ProfileCursor {
    at: Date;
    id: Types.ObjectId;
}
export declare function decodeProfileCursor(value: string | undefined, type: ProfileCourseType): ProfileCursor | null;
export declare function encodeProfileCursor(cursor: ProfileCursor, type: ProfileCourseType): string;
export declare function profileCursorStages(cursor: ProfileCursor | null, dateField: string, idField?: string): PipelineStage[];
