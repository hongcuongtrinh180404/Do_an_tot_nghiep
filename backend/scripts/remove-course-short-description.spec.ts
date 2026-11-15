import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import mongoose from 'mongoose';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { removeCourseShortDescriptions } from './remove-course-short-description.js';

const directories: string[] = [];

async function createBackupDirectory() {
  const parent = join(tmpdir(), 'opencode');
  await mkdir(parent, { recursive: true });
  const directory = await mkdtemp(join(parent, 'course-field-cleanup-test-'));
  directories.push(directory);
  return directory;
}

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

function createCollection(courses: mongoose.mongo.Document[]) {
  const matches = (course: mongoose.mongo.Document, filter: mongoose.mongo.Document) =>
    (!filter.shortDescription || Object.hasOwn(course, 'shortDescription'))
    && (!filter._id || filter._id.$in.some((id: unknown) => String(id) === String(course._id)));
  const collection = {
    dbName: 'cleanup_test',
    collectionName: 'courses',
    countDocuments: vi.fn(async (filter) => courses.filter((course) => matches(course, filter)).length),
    find: vi.fn((filter) => ({
      toArray: async () => courses.filter((course) => matches(course, filter)).map((course) => ({ ...course })),
    })),
    updateMany: vi.fn(async (filter, update) => {
      expect(update).toEqual({ $unset: { shortDescription: '' } });
      let modifiedCount = 0;
      for (const course of courses) {
        if (matches(course, filter)) {
          delete course.shortDescription;
          modifiedCount++;
        }
      }
      return { acknowledged: true, matchedCount: modifiedCount, modifiedCount };
    }),
  };
  return { collection: collection as unknown as mongoose.mongo.Collection, updateMany: collection.updateMany };
}

describe('Retired course field cleanup', () => {
  it('defaults to dry-run without writes or backup files', async () => {
    const backupDirectory = await createBackupDirectory();
    const courses = [{ _id: new mongoose.Types.ObjectId(), shortDescription: 'Old summary' }];
    const { collection, updateMany } = createCollection(courses);

    expect(await removeCourseShortDescriptions(collection, { backupDirectory })).toMatchObject({
      dryRun: true, totalCourses: 1, affectedCourses: 1, modifiedCourses: 0, remainingCourses: 1, backupPath: null,
    });
    expect(updateMany).not.toHaveBeenCalled();
    expect(courses[0]).toHaveProperty('shortDescription', 'Old summary');
    expect(await readdir(backupDirectory)).toEqual([]);
  });

  it('backs up and unsets all values across every status and soft-deleted courses, preserving other fields', async () => {
    const backupDirectory = await createBackupDirectory();
    const courses: mongoose.mongo.Document[] = [
      ...['draft', 'pending_approval', 'published', 'archived'].map((status, index) => ({
        _id: new mongoose.Types.ObjectId(),
        title: `Course ${status}`,
        status,
        shortDescription: [null, '', 'Old summary', 'Archived summary'][index],
        description: '<p>Keep the full description</p>',
        price: 499000,
        originalPrice: null,
        ratingAvg: 4.5,
        reviewCount: 12,
        updatedAt: new Date('2026-11-15T00:00:00.000Z'),
        deletedAt: status === 'archived' ? new Date('2026-11-14T00:00:00.000Z') : null,
      })),
      { _id: new mongoose.Types.ObjectId(), title: 'Already migrated', description: 'Unchanged' },
    ];
    const before = courses.map((course) => ({ ...course }));
    const { collection, updateMany } = createCollection(courses);

    const result = await removeCourseShortDescriptions(collection, { apply: true, backupDirectory });

    expect(result).toMatchObject({ dryRun: false, totalCourses: 5, affectedCourses: 4, modifiedCourses: 4, remainingCourses: 0 });
    const backup = mongoose.mongo.BSON.EJSON.parse(await readFile(result.backupPath!, 'utf8'), { relaxed: true });
    expect(backup.database).toBe('cleanup_test');
    expect(backup.collection).toBe('courses');
    expect(backup.courses).toEqual(before.slice(0, 4));
    expect(updateMany).toHaveBeenCalledWith(
      { _id: { $in: before.slice(0, 4).map((course) => course._id) }, shortDescription: { $exists: true } },
      { $unset: { shortDescription: '' } },
    );
    expect(courses).toEqual(before.map((course) => {
      const expected = { ...course };
      delete expected.shortDescription;
      return expected;
    }));

    const again = await removeCourseShortDescriptions(collection, { apply: true, backupDirectory });
    expect(again).toMatchObject({ affectedCourses: 0, modifiedCourses: 0, remainingCourses: 0, backupPath: null });
    expect(updateMany).toHaveBeenCalledTimes(1);
    expect(await readdir(backupDirectory)).toHaveLength(1);
  });

  it('does not update the database when the backup cannot be written', async () => {
    const directory = await createBackupDirectory();
    const backupDirectory = join(directory, 'not-a-directory');
    await writeFile(backupDirectory, 'block backup creation');
    const { collection, updateMany } = createCollection([{ _id: new mongoose.Types.ObjectId(), shortDescription: null }]);

    await expect(removeCourseShortDescriptions(collection, { apply: true, backupDirectory })).rejects.toThrow();
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('fails verification rather than reporting success when the field was not removed', async () => {
    const backupDirectory = await createBackupDirectory();
    const { collection, updateMany } = createCollection([{ _id: new mongoose.Types.ObjectId(), shortDescription: null }]);
    updateMany.mockResolvedValueOnce({ acknowledged: true, matchedCount: 1, modifiedCount: 0 });

    await expect(removeCourseShortDescriptions(collection, { apply: true, backupDirectory }))
      .rejects.toThrow('still contain shortDescription');
    expect(await readdir(backupDirectory)).toHaveLength(1);
  });
});
