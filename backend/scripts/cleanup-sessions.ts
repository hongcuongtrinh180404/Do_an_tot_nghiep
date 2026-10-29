/**
 * Cleanup broken/expired sessions.
 *
 * The old session schema stored `userId` as a string (Mongoose 9 treated
 * `Types.ObjectId` as Mixed). Those rows can never be matched by
 * `findActiveByUserId`, which queries with an ObjectId, so refresh always
 * failed with "No active session found".
 *
 * This script:
 *   1. Backs up every session it is about to delete to the OS temp directory.
 *   2. Deletes sessions whose userId is not an ObjectId, plus revoked/expired
 *      sessions.
 *
 * Usage:
 *   pnpm --filter backend exec tsx scripts/cleanup-sessions.ts          # dry-run
 *   pnpm --filter backend exec tsx scripts/cleanup-sessions.ts --apply  # delete
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface IEnv {
  [key: string]: string;
}

function loadEnv(): IEnv {
  const envPath = path.resolve(__dirname, '../.env');
  if (!fs.existsSync(envPath)) {
    throw new Error(`Không tìm thấy file .env tại: ${envPath}`);
  }

  const env: IEnv = {};
  const content = fs.readFileSync(envPath, 'utf8');

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (!match) continue;

    const key = match[1].trim();
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }

  return env;
}

async function main(): Promise<void> {
  const env = loadEnv();
  const uri = env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI chưa được cấu hình trong backend/.env');
  }

  const dbName = env.MONGODB_DB_NAME || 'thc_datn';
  const apply = process.argv.includes('--apply');

  await mongoose.connect(uri, { dbName });
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Không thể kết nối MongoDB');
  }

  const sessions = db.collection('sessions');
  const now = new Date();
  const filter = {
    $or: [
      { userId: { $not: { $type: 'objectId' } } },
      { isRevoked: true },
      { expiresAt: { $lt: now } },
    ],
  };

  const docs = await sessions.find(filter).toArray();

  if (docs.length === 0) {
    console.log('✅ Không có session lỗi/hết hạn cần xóa.');
    return;
  }

  const backupPath = path.join(
    os.tmpdir(),
    `mindly-sessions-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
  );
  fs.writeFileSync(backupPath, JSON.stringify(docs, null, 2), 'utf8');

  console.log(`🔎 Tìm thấy ${docs.length} session cần dọn.`);
  console.log(`💾 Backup: ${backupPath}`);

  if (!apply) {
    console.log('ℹ️  Dry-run: chưa xóa gì. Chạy lại với --apply để xóa.');
    return;
  }

  const ids = docs.map((doc) => doc._id);
  const result = await sessions.deleteMany({ _id: { $in: ids } });
  console.log(`🗑️  Đã xóa ${result.deletedCount} session.`);
}

main()
  .catch((error: unknown) => {
    console.error('❌ Dọn session thất bại:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
