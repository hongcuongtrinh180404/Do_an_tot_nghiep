import { describe, expect, it, vi } from 'vitest';
import { Model, Types } from 'mongoose';
import { LearningProgressEntity, type LearningProgressState } from '../schemas/learning-progress.schema.js';
import { LearningProgressRepository } from '../repositories/learning-progress.repository.js';
import { LessonRepository } from '../../course/repositories/lesson.repository.js';
import { LessonEntity } from '../../course/schemas/lesson.schema.js';
import { LessonContentTypeEnum } from 'share-lib';

describe('Learning progress persistence', () => {
  it('atomically fences on user, course, revision and deletion while committing the cursor and total together', async () => {
    const exec = vi.fn().mockResolvedValue({ modifiedCount: 1 });
    const updateOne = vi.fn().mockReturnValue({ exec });
    const repository = new LearningProgressRepository({ updateOne } as unknown as Model<LearningProgressEntity>);
    const state = { id: 'progress', userId: 'student', courseId: 'course', revision: 3 } as LearningProgressState;
    const changes = { watchedMs: 30_000, lastSequence: 2, sessionClosed: true, lastPositionSeconds: 70 };
    expect(await repository.compareAndSet(state, changes)).toBe(true);
    expect(updateOne).toHaveBeenCalledWith(
      { _id: 'progress', userId: 'student', courseId: 'course', revision: 3, deletedAt: null },
      { $set: { ...changes, updatedById: 'student' }, $inc: { revision: 1 } },
    );
    exec.mockResolvedValue({ modifiedCount: 0 });
    expect(await repository.compareAndSet(state, changes)).toBe(false);
  });

  it('tolerates only unique-index races on first creation, not other database errors', async () => {
    const exec = vi.fn().mockRejectedValue({ code: 11000 });
    const repository = new LearningProgressRepository({ updateOne: () => ({ exec }) } as unknown as Model<LearningProgressEntity>);
    await expect(repository.ensureExists('student', 'course')).resolves.toBeUndefined();
    exec.mockRejectedValue(new Error('database unavailable'));
    await expect(repository.ensureExists('student', 'course')).rejects.toThrow('database unavailable');
  });

  it('aggregates only current video lessons under current sections, across all requested courses in one query', async () => {
    const aggregate = vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue([]) });
    const repository = new LessonRepository({ aggregate } as unknown as Model<LessonEntity>);
    const id = new Types.ObjectId().toString();
    await repository.getCourseVideoStats([id]);
    const pipeline = aggregate.mock.calls[0][0];
    expect(pipeline[0]).toEqual({ $match: { deletedAt: null, 'content.type': LessonContentTypeEnum.VIDEO } });
    expect(pipeline[3]).toEqual({ $match: { 'section.deletedAt': null, 'section.courseId': { $in: [new Types.ObjectId(id)] } } });
    expect(pipeline[4].$group).toHaveProperty('missingDurationCount');
    expect(pipeline[4].$group).toHaveProperty('totalSeconds');
    aggregate.mockClear();
    expect(await repository.getCourseVideoStats([])).toEqual([]);
    expect(aggregate).not.toHaveBeenCalled();
  });
});
