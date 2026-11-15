/**
 * Remove only the retired course field, including on soft-deleted courses.
 * Uses the native collection so Mongoose strict mode cannot strip the $unset.
 *
 * Dry-run: pnpm --filter backend cleanup:course-short-description
 * Apply:   pnpm --filter backend cleanup:course-short-description --apply --expect-db=thc_datn
 *
 * Apply writes an Extended JSON backup before updating anything, then verifies
 * that every other field is unchanged. Re-running after cleanup is a no-op.
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

export async function removeCourseShortDescriptions(
  collection: mongoose.mongo.Collection,
  {
    apply = false,
    backupDirectory = join(tmpdir(), 'opencode'),
  }: CleanupOptions = {},
) {
  const filter = { shortDescription: { $exists: true } };
  const [totalCourses, affectedCourses] = await Promise.all([
    collection.countDocuments({}),
    collection.countDocuments(filter),
  ]);
  const summary = {
    dryRun: !apply,
    totalCourses,
    affectedCourses,
    modifiedCourses: 0,
    remainingCourses: affectedCourses,
    backupPath: null as string | null,
  };

  if (!apply || affectedCourses === 0) return summary;

  const courses = await collection.find(filter).toArray();
  if (courses.length === 0) {
    return { ...summary, remainingCourses: 0 };
  }

  await mkdir(backupDirectory, { recursive: true });
  const backupPath = join(
    backupDirectory,
    `course-short-description-backup-${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID()}.json`,
  );
  await writeFile(
    backupPath,
    mongoose.mongo.BSON.EJSON.stringify(
      {
        database: collection.dbName,
        collection: collection.collectionName,
        backedUpAt: new Date(),
        courses,
      },
      null,
      2,
      { relaxed: false },
    ),
    { encoding: 'utf8', flag: 'wx' },
  );
  console.log(`Backup: ${backupPath}`);

  // Limit writes to the backed-up documents; never delete a course or update
  // timestamps, audit fields, detailed descriptions, or related collections.
  const ids = courses.map((course) => course._id);
  const result = await collection.updateMany(
    { _id: { $in: ids }, ...filter },
    { $unset: { shortDescription: '' } },
  );
  const remainingCourses = await collection.countDocuments(filter);
  if (remainingCourses !== 0) {
    throw new Error(`${remainingCourses} course(s) still contain shortDescription; backup: ${backupPath}`);
  }

  const updatedCourses = await collection.find({ _id: { $in: ids } }).toArray();
  const updatedById = new Map(updatedCourses.map((course) => [String(course._id), course]));
  for (const course of courses) {
    const expected = { ...course };
    delete expected.shortDescription;
    if (!isDeepStrictEqual(updatedById.get(String(course._id)), expected)) {
      throw new Error(`Other fields changed on course ${String(course._id)}; inspect backup: ${backupPath}`);
    }
  }

  return {
    ...summary,
    modifiedCourses: result.modifiedCount,
    remainingCourses,
    backupPath,
  };
}

async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not configured');

  const apply = process.argv.includes('--apply');
  const dbName = process.env.MONGODB_DB_NAME || 'thc_datn';
  const expectedDb = process.argv.find((argument) => argument.startsWith('--expect-db='))?.slice('--expect-db='.length);
  if (apply && expectedDb !== dbName) {
    throw new Error(`Apply requires --expect-db=${dbName}; no data was changed`);
  }

  await mongoose.connect(uri, { dbName, serverSelectionTimeoutMS: 10000 });
  const db = mongoose.connection.db;
  if (!db) throw new Error('MongoDB connection is unavailable');

  console.log(`Target: ${mongoose.connection.host}/${db.databaseName}/courses (${apply ? 'APPLY' : 'DRY RUN'})`);
  const result = await removeCourseShortDescriptions(db.collection('courses'), { apply });
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
