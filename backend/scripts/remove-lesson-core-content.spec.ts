import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import mongoose from 'mongoose';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { removeLessonCoreContent } from './remove-lesson-core-content.js';

const directories: string[] = [];
async function backupDirectory() {
  const parent = join(tmpdir(), 'opencode');
  await mkdir(parent, { recursive: true });
  const directory = await mkdtemp(join(parent, 'lesson-core-cleanup-test-'));
  directories.push(directory);
  return directory;
}
afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

function createCollection(lessons: mongoose.mongo.Document[]) {
  const matches = (lesson: mongoose.mongo.Document, filter: mongoose.mongo.Document) =>
    (!filter.description || Object.hasOwn(lesson, 'description'))
    && (!filter._id || filter._id.$in.some((id: unknown) => String(id) === String(lesson._id)));
  const collection = {
    dbName: 'cleanup_test',
    collectionName: 'lessons',
    countDocuments: vi.fn(async (filter) => lessons.filter((lesson) => matches(lesson, filter)).length),
    find: vi.fn((filter) => ({
      toArray: async () => lessons.filter((lesson) => matches(lesson, filter)).map((lesson) => ({ ...lesson })),
    })),
    updateMany: vi.fn(async (filter, update) => {
      expect(update).toEqual({ $unset: { description: '' } });
      let modifiedCount = 0;
      for (const lesson of lessons) {
        if (matches(lesson, filter)) {
          delete lesson.description;
          modifiedCount++;
        }
      }
      return { acknowledged: true, matchedCount: modifiedCount, modifiedCount };
    }),
  };
  return { collection: collection as unknown as mongoose.mongo.Collection, updateMany: collection.updateMany };
}

describe('Retired lesson core content cleanup', () => {
  it('defaults to a read-only dry-run without backup files', async () => {
    const directory = await backupDirectory();
    const { collection, updateMany } = createCollection([{ _id: new mongoose.Types.ObjectId(), description: 'Old point' }]);
    expect(await removeLessonCoreContent(collection, { backupDirectory: directory })).toMatchObject({
      dryRun: true, affectedLessons: 1, modifiedLessons: 0, remainingLessons: 1, backupPath: null,
    });
    expect(updateMany).not.toHaveBeenCalled();
    expect(await readdir(directory)).toEqual([]);
  });

  it('backs up all lessons, removes only description and is safe to re-run', async () => {
    const directory = await backupDirectory();
    const lessons: mongoose.mongo.Document[] = [
      ...[null, '', '[{"id":"point","text":"Old point"}]', 'Legacy plain text'].map((description, index) => ({
        _id: new mongoose.Types.ObjectId(), sectionId: new mongoose.Types.ObjectId(),
        title: `Lesson ${index}`, order: index, description,
        content: index === 0 ? null : { type: 'video', url: '/video.mp4', duration: 120 },
        materials: [{ title: 'Slides', url: '/slides.pdf' }],
        updatedAt: new Date('2026-11-16T00:00:00Z'),
        deletedAt: index === 3 ? new Date('2026-11-15T00:00:00Z') : null,
      })),
      { _id: new mongoose.Types.ObjectId(), title: 'Already migrated' },
    ];
    const before = lessons.map((lesson) => ({ ...lesson }));
    const { collection, updateMany } = createCollection(lessons);
    const result = await removeLessonCoreContent(collection, { apply: true, backupDirectory: directory });
    expect(result).toMatchObject({ totalLessons: 5, affectedLessons: 4, modifiedLessons: 4, remainingLessons: 0 });
    const backup = mongoose.mongo.BSON.EJSON.parse(await readFile(result.backupPath!, 'utf8'), { relaxed: true });
    expect(backup.collection).toBe('lessons');
    expect(backup.lessons).toEqual(before.slice(0, 4));
    expect(lessons).toEqual(before.map((lesson) => {
      const expected = { ...lesson };
      delete expected.description;
      return expected;
    }));
    expect(await removeLessonCoreContent(collection, { apply: true, backupDirectory: directory }))
      .toMatchObject({ affectedLessons: 0, modifiedLessons: 0, remainingLessons: 0, backupPath: null });
    expect(updateMany).toHaveBeenCalledTimes(1);
    expect(await readdir(directory)).toHaveLength(1);
  });

  it('refuses to clean the courses collection', async () => {
    const { collection, updateMany } = createCollection([]);
    Object.defineProperty(collection, 'collectionName', { value: 'courses' });
    await expect(removeLessonCoreContent(collection, { apply: true })).rejects.toThrow('Only the lessons collection');
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('does not write when the backup cannot be created', async () => {
    const directory = await backupDirectory();
    const invalidPath = join(directory, 'file');
    await writeFile(invalidPath, 'not a directory');
    const { collection, updateMany } = createCollection([{ _id: new mongoose.Types.ObjectId(), description: null }]);
    await expect(removeLessonCoreContent(collection, { apply: true, backupDirectory: invalidPath })).rejects.toThrow();
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('detects incomplete cleanup', async () => {
    const { collection, updateMany } = createCollection([{ _id: new mongoose.Types.ObjectId(), description: null }]);
    updateMany.mockResolvedValueOnce({ acknowledged: true, matchedCount: 1, modifiedCount: 0 });
    await expect(removeLessonCoreContent(collection, { apply: true, backupDirectory: await backupDirectory() }))
      .rejects.toThrow('still contain description');
  });

  it('detects accidental changes to unrelated lesson fields', async () => {
    const lesson = { _id: new mongoose.Types.ObjectId(), description: 'Old', title: 'Keep this title' };
    const { collection, updateMany } = createCollection([lesson]);
    updateMany.mockImplementationOnce(async () => {
      delete (lesson as Partial<typeof lesson>).description;
      lesson.title = 'Changed unexpectedly';
      return { acknowledged: true, matchedCount: 1, modifiedCount: 1 };
    });
    await expect(removeLessonCoreContent(collection, { apply: true, backupDirectory: await backupDirectory() }))
      .rejects.toThrow('Other fields changed');
  });
});
