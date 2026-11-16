/**
 * Split legacy quiz cues into explanationTimestamp and instructor scheduling.
 * Published courses: min(cue + 10 seconds, floor(video duration)).
 * Other courses: unscheduled. New-format questions are never reset on a rerun.
 *
 * pnpm --filter backend migrate:quiz-timing [--apply]
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { CourseStatusEnum } from 'share-lib';

type LegacyQuiz = Record<string, unknown>;

export function convertLegacyQuiz(quiz: LegacyQuiz, published: boolean, duration?: number): LegacyQuiz {
  if (Object.hasOwn(quiz, 'explanationTimestamp')) return quiz;
  const raw = quiz.timestamp;
  if (published && (typeof duration !== 'number' || !Number.isFinite(duration) || duration <= 0)) {
    throw new Error('Published quiz needs a verified positive video duration');
  }
  if (published && (typeof raw !== 'number' || !Number.isFinite(raw) || raw < 0)) {
    throw new Error('Published quiz has no valid legacy explanation cue');
  }
  const explanationTimestamp = typeof raw === 'number' && Number.isFinite(raw) && raw >= 0
    ? Math.min(Math.round(raw), typeof duration === 'number' && duration > 0 ? Math.floor(duration) : Number.MAX_SAFE_INTEGER)
    : null;
  return {
    ...quiz,
    explanationTimestamp,
    timestamp: published ? Math.min(explanationTimestamp! + 10, Math.floor(duration!)) : null,
    quizTimingVersion: 1,
  };
}

export async function migrateQuizTiming(
  db: mongoose.mongo.Db,
  { apply = false, backupDirectory = join(tmpdir(), 'opencode') } = {},
) {
  const [quizzes, drafts, lessons, sections, courses, transcripts] = await Promise.all([
    db.collection('lesson_quizzes').find({ explanationTimestamp: { $exists: false } }).toArray(),
    db.collection('lesson_quiz_drafts').find({ quizzes: { $elemMatch: { explanationTimestamp: { $exists: false } } } }).toArray(),
    db.collection('lessons').find({}, { projection: { sectionId: 1, content: 1 } }).toArray(),
    db.collection('sections').find({}, { projection: { courseId: 1 } }).toArray(),
    db.collection('courses').find({}, { projection: { status: 1 } }).toArray(),
    db.collection('lesson_transcripts').find({ deletedAt: null }, { projection: { lessonId: 1, durationSeconds: 1 } }).toArray(),
  ]);
  const lessonMap = new Map(lessons.map((item) => [String(item._id), item]));
  const sectionMap = new Map(sections.map((item) => [String(item._id), item]));
  const courseMap = new Map(courses.map((item) => [String(item._id), item]));
  const durations = new Map(transcripts.map((item) => [String(item.lessonId), item.durationSeconds as number]));
  const context = (lessonId: unknown) => {
    const lesson = lessonMap.get(String(lessonId));
    const section = sectionMap.get(String(lesson?.sectionId));
    const course = courseMap.get(String(section?.courseId));
    if (!lesson || !section || !course) throw new Error(`Cannot resolve course for lesson ${String(lessonId)}`);
    const mediaDuration = lesson.content?.duration;
    const duration = typeof mediaDuration === 'number' && Number.isFinite(mediaDuration) && mediaDuration > 0
      ? mediaDuration : durations.get(String(lessonId));
    return { published: course.status === CourseStatusEnum.PUBLISHED, duration };
  };
  // Resolve every duration before any write, so an unknown duration cannot produce an out-of-video checkpoint.
  const quizUpdates = quizzes.map((quiz) => {
    const { published, duration } = context(quiz.lessonId);
    return { before: quiz, after: convertLegacyQuiz(quiz, published, duration), published };
  });
  const draftUpdates = drafts.map((draft) => {
    const { published, duration } = context(draft.lessonId);
    return {
      before: draft,
      quizzes: (draft.quizzes as LegacyQuiz[]).map((quiz) => convertLegacyQuiz(quiz, published, duration)),
    };
  });
  const result = {
    dryRun: !apply,
    quizzes: quizzes.length,
    publishedQuizzes: quizUpdates.filter((item) => item.published).length,
    unscheduledQuizzes: quizUpdates.filter((item) => !item.published).length,
    drafts: drafts.length,
    modifiedQuizzes: 0,
    modifiedDrafts: 0,
    backupPath: null as string | null,
  };
  if (!apply || (!quizzes.length && !drafts.length)) return result;

  await mkdir(backupDirectory, { recursive: true });
  result.backupPath = join(backupDirectory, `quiz-timing-${Date.now()}-${randomUUID()}.json`);
  await writeFile(result.backupPath, mongoose.mongo.BSON.EJSON.stringify({
    database: db.databaseName, backedUpAt: new Date(), quizzes, drafts,
  }, null, 2, { relaxed: false }), { flag: 'wx', encoding: 'utf8' });

  for (const { before, after } of quizUpdates) {
    const write = await db.collection('lesson_quizzes').updateOne(
      { _id: before._id, explanationTimestamp: { $exists: false }, timestamp: before.timestamp },
      { $set: { timestamp: after.timestamp, explanationTimestamp: after.explanationTimestamp, quizTimingVersion: 1 } },
    );
    if (write.modifiedCount !== 1) throw new Error(`Quiz ${String(before._id)} changed during migration; rerun after inspecting ${result.backupPath}`);
    result.modifiedQuizzes += write.modifiedCount;
  }
  for (const draft of draftUpdates) {
    const write = await db.collection('lesson_quiz_drafts').updateOne(
      { _id: draft.before._id, quizzes: draft.before.quizzes },
      { $set: { quizzes: draft.quizzes, quizTimingVersion: 1 } },
    );
    if (write.modifiedCount !== 1) throw new Error(`Draft ${String(draft.before._id)} changed during migration`);
    result.modifiedDrafts += write.modifiedCount;
  }
  for (const { before, after } of quizUpdates) {
    const saved = await db.collection('lesson_quizzes').findOne({ _id: before._id });
    if (saved?.timestamp !== after.timestamp || saved?.explanationTimestamp !== after.explanationTimestamp) {
      throw new Error(`Migration verification failed for quiz ${String(before._id)}`);
    }
  }
  return result;
}

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not configured');
  const client = new mongoose.mongo.MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DB_NAME || 'thc_datn');
    console.log(JSON.stringify({ database: db.databaseName, ...await migrateQuizTiming(db, {
      apply: process.argv.includes('--apply'),
    }) }, null, 2));
  } finally {
    await client.close();
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
}
