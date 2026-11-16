import { mkdir, mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import mongoose from 'mongoose';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { purgeSoftDeletedQuizzes } from './purge-soft-deleted-quizzes.js';

const directories: string[] = [];

async function createBackupDirectory() {
  const parent = join(tmpdir(), 'opencode');
  await mkdir(parent, { recursive: true });
  const directory = await mkdtemp(join(parent, 'quiz-hard-delete-test-'));
  directories.push(directory);
  return directory;
}

afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

function createCollection(quizzes: mongoose.mongo.Document[]) {
  const isSoftDeleted = (quiz: mongoose.mongo.Document) => quiz.deletedAt != null;
  const matches = (quiz: mongoose.mongo.Document, filter: mongoose.mongo.Document) => {
    if (filter.deletedAt?.$ne === null && !isSoftDeleted(quiz)) return false;
    if (filter._id?.$in) {
      return filter._id.$in.some((id: unknown) => String(id) === String(quiz._id));
    }
    return true;
  };
  const collection = {
    dbName: 'cleanup_test',
    collectionName: 'lesson_quizzes',
    countDocuments: vi.fn(async (filter: mongoose.mongo.Document) =>
      quizzes.filter((quiz) => matches(quiz, filter)).length,
    ),
    find: vi.fn((filter: mongoose.mongo.Document) => ({
      toArray: async () =>
        quizzes.filter((quiz) => matches(quiz, filter)).map((quiz) => ({ ...quiz })),
    })),
    deleteMany: vi.fn(async (filter: mongoose.mongo.Document) => {
      const toDelete = quizzes.filter((quiz) => matches(quiz, filter));
      for (const quiz of toDelete) {
        quizzes.splice(quizzes.indexOf(quiz), 1);
      }
      return { acknowledged: true, deletedCount: toDelete.length };
    }),
  };
  return {
    collection: collection as unknown as mongoose.mongo.Collection,
    deleteMany: collection.deleteMany,
  };
}

describe('Soft-deleted quiz purge', () => {
  it('defaults to dry-run without writes or backup files', async () => {
    const backupDirectory = await createBackupDirectory();
    const quizzes = [
      { _id: new mongoose.Types.ObjectId(), question: 'Active', deletedAt: null },
      { _id: new mongoose.Types.ObjectId(), question: 'Deleted', deletedAt: new Date() },
    ];
    const { collection, deleteMany } = createCollection(quizzes);

    expect(
      await purgeSoftDeletedQuizzes(collection, { backupDirectory }),
    ).toMatchObject({
      dryRun: true,
      totalQuizzes: 2,
      affectedQuizzes: 1,
      deletedQuizzes: 0,
      remainingQuizzes: 1,
      backupPath: null,
    });
    expect(deleteMany).not.toHaveBeenCalled();
    expect(quizzes).toHaveLength(2);
    expect(await readdir(backupDirectory)).toEqual([]);
  });

  it('backs up and permanently removes only soft-deleted quizzes', async () => {
    const backupDirectory = await createBackupDirectory();
    const active = {
      _id: new mongoose.Types.ObjectId(),
      question: 'Active',
      deletedAt: null,
    };
    const deleted = {
      _id: new mongoose.Types.ObjectId(),
      question: 'Deleted',
      deletedAt: new Date('2026-11-15T00:00:00.000Z'),
    };
    const quizzes = [active, deleted];
    const { collection, deleteMany } = createCollection(quizzes);

    const result = await purgeSoftDeletedQuizzes(collection, {
      apply: true,
      backupDirectory,
    });

    expect(result).toMatchObject({
      dryRun: false,
      totalQuizzes: 2,
      affectedQuizzes: 1,
      deletedQuizzes: 1,
      remainingQuizzes: 0,
    });
    expect(result.backupPath).toBeTruthy();
    expect(deleteMany).toHaveBeenCalledOnce();
    expect(quizzes).toEqual([active]);

    const backup = JSON.parse(await readFile(result.backupPath!, 'utf8'));
    expect(backup.collection).toBe('lesson_quizzes');
    expect(backup.quizzes).toHaveLength(1);
    expect(backup.quizzes[0].question).toBe('Deleted');

    const rerun = await purgeSoftDeletedQuizzes(collection, {
      apply: true,
      backupDirectory,
    });
    expect(rerun).toMatchObject({
      affectedQuizzes: 0,
      deletedQuizzes: 0,
      remainingQuizzes: 0,
      backupPath: null,
    });
    expect(deleteMany).toHaveBeenCalledOnce();
  });
});
