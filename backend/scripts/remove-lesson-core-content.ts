/**
 * Retire lessons.description (the old manually entered key points), including
 * soft-deleted lessons. Never touch courses.description or AI learning content.
 *
 * Dry-run: pnpm --filter backend cleanup:lesson-core-content
 * Apply:   pnpm --filter backend cleanup:lesson-core-content --apply --expect-db=thc_datn
 */
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import mongoose from 'mongoose';

interface CleanupOptions {
  apply?: boolean;
  backupDirectory?: string;
}

export async function removeLessonCoreContent(
  collection: mongoose.mongo.Collection,
  { apply = false, backupDirectory = join(tmpdir(), 'opencode') }: CleanupOptions = {},
) {
  if (collection.collectionName !== 'lessons') {
    throw new Error('Only the lessons collection may be cleaned');
  }
  const filter = { description: { $exists: true } };
  const [totalLessons, affectedLessons] = await Promise.all([
    collection.countDocuments({}),
    collection.countDocuments(filter),
  ]);
  const summary = {
    dryRun: !apply,
    totalLessons,
    affectedLessons,
    modifiedLessons: 0,
    remainingLessons: affectedLessons,
    backupPath: null as string | null,
  };
  if (!apply || affectedLessons === 0) return summary;

  const lessons = await collection.find(filter).toArray();
  if (lessons.length === 0) return { ...summary, remainingLessons: 0 };

  await mkdir(backupDirectory, { recursive: true });
  const backupPath = join(
    backupDirectory,
    `lesson-core-content-backup-${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID()}.json`,
  );
  await writeFile(
    backupPath,
    mongoose.mongo.BSON.EJSON.stringify(
      { database: collection.dbName, collection: collection.collectionName, backedUpAt: new Date(), lessons },
      null, 2, { relaxed: false },
    ),
    { encoding: 'utf8', flag: 'wx' },
  );
  console.log(`Backup: ${backupPath}`);

  // Native collection intentionally avoids Mongoose timestamps/strict-mode changes.
  // Only backed-up documents are eligible for this one-field update.
  const ids = lessons.map((lesson) => lesson._id);
  const result = await collection.updateMany(
    { _id: { $in: ids }, ...filter },
    { $unset: { description: '' } },
  );
  const remainingLessons = await collection.countDocuments(filter);
  if (remainingLessons !== 0) {
    throw new Error(`${remainingLessons} lesson(s) still contain description; backup: ${backupPath}`);
  }
  const updatedLessons = await collection.find({ _id: { $in: ids } }).toArray();
  const updatedById = new Map(updatedLessons.map((lesson) => [String(lesson._id), lesson]));
  for (const lesson of lessons) {
    const expected = { ...lesson };
    delete expected.description;
    if (!isDeepStrictEqual(updatedById.get(String(lesson._id)), expected)) {
      throw new Error(`Other fields changed on lesson ${String(lesson._id)}; inspect backup: ${backupPath}`);
    }
  }
  return { ...summary, modifiedLessons: result.modifiedCount, remainingLessons, backupPath };
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not configured');
  const apply = process.argv.includes('--apply');
  const dbName = process.env.MONGODB_DB_NAME || 'thc_datn';
  const expectedDb = process.argv.find((argument) => argument.startsWith('--expect-db='))?.slice('--expect-db='.length);
  if (apply && expectedDb !== dbName) {
    throw new Error(`Apply requires --expect-db=${dbName}; no data was changed`);
  }

  const client = new mongoose.mongo.MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
  try {
    await client.connect();
    const db = client.db(dbName);
    console.log(`Target: ${db.databaseName}/lessons (${apply ? 'APPLY' : 'DRY RUN'})`);
    console.log(JSON.stringify(await removeLessonCoreContent(db.collection('lessons'), { apply }), null, 2));
  } finally {
    await client.close();
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
