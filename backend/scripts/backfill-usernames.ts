/**
 * Rebuild every non-deleted user's handle from their email. Run once during maintenance:
 *
 * Preview: pnpm --filter backend backfill:usernames
 * Apply:   pnpm --filter backend backfill:usernames --apply --expect-db=thc_datn
 *
 * A backup of the old handles is written before changes. Two phases also handle
 * swapped/occupied old handles without dropping the unique index. If interrupted,
 * re-run: assignments depend on email and creation order, not the old handles.
 * Pause registrations/logins and other user writes while applying.
 */
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import mongoose from 'mongoose';
import { generateUsername } from '../src/modules/user/utils/username.util.js';

interface UsernameUser {
  _id: mongoose.Types.ObjectId;
  email: string;
  username?: string | null;
  createdAt?: Date;
  deletedAt?: Date | null;
}

export async function planUsernames(users: UsernameUser[]) {
  const occupied = new Set<string>();
  const assignments = [];
  const ordered = [...users].sort((a, b) =>
    (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0) ||
    a._id.toString().localeCompare(b._id.toString()));

  for (const user of ordered) {
    if (!user.email?.trim()) throw new Error(`User ${user._id.toHexString()} has no email; no migration was applied`);
    const username = await generateUsername(user.email, async (candidate) => occupied.has(candidate));
    occupied.add(username);
    assignments.push({ ...user, nextUsername: username });
  }
  return assignments;
}

export async function backfillUsernames(
  collection: mongoose.mongo.Collection<UsernameUser>,
  { apply = false, backupDirectory = join(tmpdir(), 'opencode') } = {},
) {
  const users = await collection.find(
    { deletedAt: null },
    { projection: { _id: 1, email: 1, username: 1, createdAt: 1 } },
  ).toArray();
  const assignments = await planUsernames(users);
  const changes = assignments.filter((user) => user.username !== user.nextUsername);
  const summary = {
    dryRun: !apply,
    totalUsers: users.length,
    changedUsers: changes.length,
    updatedUsers: 0,
    backupPath: null as string | null,
  };
  if (!apply || changes.length === 0) return summary;

  await mkdir(backupDirectory, { recursive: true });
  const backupPath = join(backupDirectory, `usernames-backup-${randomUUID()}.json`);
  await writeFile(
    backupPath,
    mongoose.mongo.BSON.EJSON.stringify({
      database: collection.dbName,
      collection: collection.collectionName,
      backedUpAt: new Date(),
      users: changes,
    }, null, 2, { relaxed: false }),
    { encoding: 'utf8', flag: 'wx' },
  );
  console.log(`Username backup: ${backupPath}`);

  // Temporary handles cannot be generated from an email or resolved by the public API.
  const staged = changes.map((user) => ({
    ...user,
    temporaryUsername: `~${randomUUID().replace(/-/g, '').slice(0, 29)}`,
  }));
  for (const user of staged) {
    const result = await collection.updateOne(
      { _id: user._id, email: user.email, deletedAt: null, username: user.username ?? null },
      { $set: { username: user.temporaryUsername } },
    );
    if (result.matchedCount !== 1) {
      throw new Error(`Concurrent user change detected. Pause user writes and re-run; backup: ${backupPath}`);
    }
  }
  for (const user of staged) {
    const result = await collection.updateOne(
      { _id: user._id, email: user.email, deletedAt: null, username: user.temporaryUsername },
      { $set: { username: user.nextUsername, updatedAt: new Date() } },
    );
    if (result.matchedCount !== 1) {
      throw new Error(`Could not finalize ${user._id.toHexString()}. Re-run during maintenance; backup: ${backupPath}`);
    }
  }
  return { ...summary, updatedUsers: staged.length, backupPath };
}

async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not configured');
  const dbName = process.env.MONGODB_DB_NAME || 'thc_datn';
  const apply = process.argv.includes('--apply');
  const expectedDb = process.argv.find((value) => value.startsWith('--expect-db='))?.slice(12);
  if (apply && expectedDb !== dbName) {
    throw new Error(`Apply requires --expect-db=${dbName}; no data was changed`);
  }

  await mongoose.connect(uri, { dbName, serverSelectionTimeoutMS: 10000 });
  const db = mongoose.connection.db;
  if (!db) throw new Error('MongoDB connection is unavailable');
  console.log(`Target: ${mongoose.connection.host}/${db.databaseName}/users (${apply ? 'APPLY' : 'DRY RUN'})`);
  const result = await backfillUsernames(db.collection<UsernameUser>('users'), { apply });
  console.log(JSON.stringify(result, null, 2));
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main()
    .catch((error: unknown) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => { await mongoose.disconnect(); });
}
