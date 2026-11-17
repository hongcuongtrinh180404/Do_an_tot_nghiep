import { BadRequestException } from '@nestjs/common';
import { Types, type PipelineStage } from 'mongoose';
import type { ProfileCourseType } from 'share-lib';

export interface ProfileCursor {
  at: Date;
  id: Types.ObjectId;
}

export function decodeProfileCursor(value: string | undefined, type: ProfileCourseType): ProfileCursor | null {
  if (!value) return null;
  try {
    if (!/^[a-zA-Z0-9_-]+$/.test(value)) throw new Error();
    const decoded: unknown = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
    if (
      !decoded || typeof decoded !== 'object' ||
      !('type' in decoded) || decoded.type !== type ||
      !('at' in decoded) || typeof decoded.at !== 'string' ||
      !('id' in decoded) || typeof decoded.id !== 'string' ||
      !/^[a-f0-9]{24}$/i.test(decoded.id)
    ) throw new Error();
    const at = new Date(decoded.at);
    if (!Number.isFinite(at.getTime())) throw new Error();
    return { at, id: new Types.ObjectId(decoded.id) };
  } catch {
    throw new BadRequestException('Vị trí tải thêm khóa học không hợp lệ');
  }
}

export function encodeProfileCursor(cursor: ProfileCursor, type: ProfileCourseType): string {
  return Buffer.from(JSON.stringify({
    at: cursor.at.toISOString(), id: cursor.id.toHexString(), type,
  })).toString('base64url');
}

export function profileCursorStages(cursor: ProfileCursor | null, dateField: string, idField = '_id'): PipelineStage[] {
  return cursor ? [{
    $match: {
      $or: [
        { [dateField]: { $lt: cursor.at } },
        { [dateField]: cursor.at, [idField]: { $lt: cursor.id } },
      ],
    },
  }] : [];
}
