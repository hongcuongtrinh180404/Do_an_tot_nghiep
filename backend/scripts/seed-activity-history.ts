import 'reflect-metadata';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import mongoose from 'mongoose';
import {
  BATCH, END, START, RUNS, buildPlan, readState, baselineFor, registerModels,
  validatePlan, ensureInternalPaymentIndexes, writePlan, verifyState,
  type Baseline,
} from './activity-history/core.js';

interface RunDocument {
  _id: string;
  revision?: number;
  cutoff?: Date;
  targets?: Record<string, number>;
  baseline?: Baseline[];
  [key: string]: unknown;
}

export async function main(args = process.argv.slice(2)) {
  const apply = args.includes('--apply'), verify = args.includes('--verify'), abort = args.includes('--test-abort');
  const expectDb = args.find(arg => arg.startsWith('--expect-db='))?.slice('--expect-db='.length);
  const allowed = new Set(['--apply', '--verify', '--test-abort', '--allow-shared-production', '--dry-run']);
  for (const arg of args) assert(allowed.has(arg) || arg.startsWith('--expect-db='), `Unknown option: ${arg}`);
  assert(!(apply && verify), 'Choose --apply or --verify');
  assert(!abort || apply, '--test-abort requires --apply and the normal write confirmations');
  const uri = process.env.MONGODB_URI;
  assert(uri, 'MONGODB_URI is required; run with backend/.env loaded');
  const dbName = process.env.MONGODB_DB_NAME || 'thc_datn';
  if (apply) {
    assert.equal(expectDb, dbName, `Apply requires --expect-db=${dbName}`);
    assert(args.includes('--allow-shared-production'), 'Explicit --allow-shared-production is required even when NODE_ENV=development');
  }
  const connection = await mongoose.createConnection(uri, {
    dbName, autoIndex: false, autoCreate: false, serverSelectionTimeoutMS: 10_000,
    appName: 'mindly-internal-activity-history',
  }).asPromise();
  try {
    const db = connection.db!;
    const hello = await db.admin().command({ hello: 1 });
    assert(hello.setName || hello.msg === 'isdbgrid', 'Replica set/sharded cluster required; no nontransactional fallback');
    const runId = BATCH;
    const existing = await db.collection<RunDocument>(RUNS).findOne({ _id: runId });
    const cutoff = existing?.cutoff instanceof Date ? existing.cutoff : new Date(Math.min(Date.now(), END.getTime()));
    const state = await readState(db);
    const baseline = existing?.baseline as ReturnType<typeof baselineFor> | undefined ?? baselineFor(state);
    if (verify) {
      assert(existing, 'This batch has not been committed');
      const result = verifyState(state, cutoff, existing.targets as Record<string, number>, baseline);
      console.log(JSON.stringify({ mode: 'VERIFY', database: dbName, batch: BATCH, start: START, cutoff, ...result }, null, 2));
      assert(result.ok, `Verification failed:\n${result.errors.join('\n')}`);
      return result;
    }
    const models = registerModels(connection);
    const plan = buildPlan(state, cutoff, existing?.targets as Record<string, number> | undefined);
    await validatePlan(plan, models);
    const plannedCounts = Object.fromEntries([...new Set(plan.inserts.map(row => row.collection))].map(name => [name, plan.inserts.filter(row => row.collection === name).length]));
    console.log(JSON.stringify({
      mode: apply ? abort ? 'ROLLBACK TEST' : 'APPLY' : 'DRY RUN',
      database: dbName, configuredEnvironment: process.env.NODE_ENV || 'development', sharedProductionAcknowledged: apply,
      batch: BATCH, start: START, cutoff, totalCourses: state.courses.length,
      eligibleStudents: state.users.filter(row => row.deletedAt == null && row.status === 'active' && row.role === 'student').length,
      plannedCounts, skippedReviews: plan.skippedReviews, courses: plan.courses, blockers: plan.blockers,
    }, null, 2));
    if (!apply) return plan;
    if (existing && plan.inserts.length === 0) {
      const result = verifyState(state, cutoff, plan.targets, baseline);
      assert(result.ok, result.errors.join('\n'));
      console.log(JSON.stringify({ idempotent: true, created: 0, skippedReviews: plan.skippedReviews, failed: 0, ...result }, null, 2));
      return result;
    }
    const backupDirectory = join(process.env.LOCALAPPDATA || 'C:/Users/cuong/AppData/Local', 'Temp', 'opencode', 'activity-history');
    await mkdir(backupDirectory, { recursive: true });
    const backupPath = join(backupDirectory, `before-${Date.now()}.ejson`);
    // Contains original business documents, never passwords, tokens, or connection secrets.
    const { users: _users, ...businessDocuments } = state;
    await writeFile(backupPath, mongoose.mongo.BSON.EJSON.stringify({
      database: dbName, batch: BATCH, capturedAt: new Date(), baseline, businessDocuments,
    }, null, 2, { relaxed: false }), { encoding: 'utf8', flag: 'wx' });
    console.log(`Business-data backup: ${backupPath}`);
    await ensureInternalPaymentIndexes(db);
    const session = await connection.startSession();
    let created: Record<string, number> = {};
    try {
      await session.withTransaction(async () => {
        const runs = db.collection<RunDocument>(RUNS);
        const currentRun = await runs.findOne({ _id: runId }, { session });
        // One shared write serializes simultaneous executions of this fixed batch.
        if (currentRun) await runs.updateOne({ _id: runId }, { $set: { revision: Number(currentRun.revision ?? 0) + 1 } }, { session });
        else await runs.insertOne({ _id: runId, revision: 1, source: 'INTERNAL_SEED', sharedProductionApproved: true }, { session });
        const transactionalState = await readState(db, session);
        const actualBaseline = currentRun?.baseline as ReturnType<typeof baselineFor> | undefined ?? baselineFor(transactionalState);
        const actualCutoff = currentRun?.cutoff instanceof Date ? currentRun.cutoff : cutoff;
        const actualPlan = buildPlan(transactionalState, actualCutoff, currentRun?.targets as Record<string, number> | undefined);
        await validatePlan(actualPlan, models);
        created = await writePlan(actualPlan, connection, models, session);
        const after = await readState(db, session);
        const result = verifyState(after, actualCutoff, actualPlan.targets, actualBaseline);
        assert(result.ok, `Before-commit verification failed:\n${result.errors.join('\n')}`);
        if (abort) throw new Error('ACTIVITY_SEED_INTENTIONAL_ABORT');
        await runs.updateOne({ _id: runId }, { $set: {
          cutoff: actualCutoff, start: START, targets: actualPlan.targets, baseline: actualBaseline,
          completedAt: new Date(), backupPath, status: 'COMPLETED', priceBasis: 'existing_course_catalog',
        } }, { session });
      }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' }, maxCommitTimeMS: 20_000 });
    } catch (error) {
      const afterAbort = await readState(db);
      assert.deepEqual(afterAbort, state, 'Rollback must leave all business collections unchanged');
      if (!abort || !(error instanceof Error) || error.message !== 'ACTIVITY_SEED_INTENTIONAL_ABORT') {
        console.error('Transaction aborted; verified all business collections unchanged.');
        throw error;
      }
      console.log(JSON.stringify({ rollbackVerified: true, created: 0, failed: 0, abortedInsertCounts: created }, null, 2));
      return { rollbackVerified: true };
    } finally { await session.endSession(); }
    const stored = await db.collection<RunDocument>(RUNS).findOne({ _id: runId });
    const result = verifyState(await readState(db), stored!.cutoff as Date, stored!.targets as Record<string, number>, stored!.baseline as ReturnType<typeof baselineFor>);
    console.log(JSON.stringify({ database: dbName, batch: BATCH, created, skippedReviews: plan.skippedReviews, failed: result.errors.length, ...result }, null, 2));
    assert(result.ok, result.errors.join('\n'));
    return result;
  } finally { await connection.close(); }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
}
