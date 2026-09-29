import { describe, it, expect } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ParseObjectIdPipe } from '../pipes/parse-object-id.pipe.js';

describe('ParseObjectIdPipe', () => {
  const pipe = new ParseObjectIdPipe();

  it('should return valid MongoDB ObjectId string unchanged', () => {
    const validId = new Types.ObjectId().toString();
    const result = pipe.transform(validId);
    expect(result).toBe(validId);
  });

  it('should throw BadRequestException when id is invalid', () => {
    expect(() => pipe.transform('invalid-id')).toThrow(BadRequestException);
    expect(() => pipe.transform('12345')).toThrow(BadRequestException);
    expect(() => pipe.transform('')).toThrow(BadRequestException);
  });

  it('should include user-friendly error message in exception', () => {
    try {
      pipe.transform('bad_id');
      expect.fail('Should have thrown BadRequestException');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).message).toContain("ID 'bad_id' không phải là MongoDB ObjectId hợp lệ");
    }
  });
});
