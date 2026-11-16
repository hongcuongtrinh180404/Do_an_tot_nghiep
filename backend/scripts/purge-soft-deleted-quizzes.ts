/**
 * Permanently remove quiz documents that were soft-deleted before hard-delete behavior.
 *
 * Dry-run: pnpm --filter backend cleanup:soft-deleted-quizzes
 * Apply:   pnpm --filter backend cleanup:soft-deleted-quizzes --apply --expect-db=thc_datn
 *
 * Apply writes an Extended JSON backup before deleting anything. Re-running after cleanup is a no-op.
 */
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import mongoose from 'mongoose';

interface PurgeOptions {
  apply?: boolean;
  backupDirectory?: string;
}

export async function purgeSoftDeletedQuizzes(
  collection: mongoose.mongo.Collection,
  {
    apply = false,
    backupDirectory = join(tmpdir(), 'opencode'),
  }: PurgeOptions = {},
) {
  const filter = { deletedAt: { $ne: null } };
  const [totalQuizzes, affectedQuizzes] = await Promise.all([
    collection.countDocuments({}),
    collection.countDocuments(filter),
  ]);
  const summary = {
    dryRun: !apply,
    totalQuizzes,
    affectedQuizzes,
    deletedQuizzes: 0,
    remainingQuizzes: affectedQuizzes,
    backupPath: null as string | null,
  };

  if (!apply || affectedQuizzes === 0) return summary;

  const quizzes = await collection.find(filter).toArray();
  if (quizzes.length === 0) {
    return { ...summary, remainingQuizzes: 0 };
  }

  await mkdir(backupDirectory, { recursive: true });
  const backupPath = join(
    backupDirectory,
    `soft-deleted-quizzes-backup-${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID()}.json`,
  );
  await writeFile(
    backupPath,
    mongoose.mongo.BSON.EJSON.stringify(
      {
        database: collection.dbName,
        collection: collection.collectionName,
        backedUpAt: new Date(),
        quizzes,
      },
      null,
      2,
      { relaxed: false },
    ),
    { encoding: 'utf8', flag: 'wx' },
  );
  console.log(`Backup: ${backupPath}`);

  const ids = quizzes.map((quiz) => quiz._id);
  const result = await collection.deleteMany({ _id: { $in: ids }, ...filter });
  const remainingQuizzes = await collection.countDocuments(filter);
  if (remainingQuizzes !== 0) {
    throw new Error(
      `${remainingQuizzes} soft-deleted quiz(zes) remain; backup: ${backupPath}`,
    );
  }

  return {
    ...summary,
    deletedQuizzes: result.deletedCount,
    remainingQuizzes,
    backupPath,
  };
}

async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not configured');

  const apply = process.argv.includes('--apply');
  const dbName = process.env.MONGODB_DB_NAME || 'thc_datn';
  const expectedDb = process.argv
    .find((argument) => argument.startsWith('--expect-db='))
    ?.slice('--expect-db='.length);
  if (apply && expectedDb !== dbName) {
    throw new Error(`Apply requires --expect-db=${dbName}; no data was changed`);
  }

  await mongoose.connect(uri, { dbName, serverSelectionTimeoutMS: 10000 });
  const db = mongoose.connection.db;
  if (!db) throw new Error('MongoDB connection is unavailable');

  console.log(
    `Target: ${mongoose.connection.host}/${db.databaseName}/lesson_quizzes (${apply ? 'APPLY' : 'DRY RUN'})`,
  );
  const result = await purgeSoftDeletedQuizzes(db.collection('lesson_quizzes'), {
    apply,
  });
  console.log(JSON.stringify(result, null, 2));
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main()
    .catch((error: unknown) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await mongoose.disconnect();
    });
}
