import 'reflect-metadata';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose, { Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  S3Client, HeadBucketCommand, CreateBucketCommand, GetBucketPolicyCommand,
  HeadObjectCommand, PutObjectCommand, CopyObjectCommand,
} from '@aws-sdk/client-s3';
import type { IGeneratedQuizItem, ILessonMindmapData, ILessonSummaryData } from 'share-lib';
import { StorageService } from '../../src/modules/storage/storage.service.js';
import { SummaryValidator } from '../../src/modules/transcript-analysis/validators/summary.validator.js';
import { MindmapValidator } from '../../src/modules/transcript-analysis/validators/mindmap.validator.js';
import { QuizValidator } from '../../src/modules/transcript-analysis/validators/quiz.validator.js';

const baseBatch = 'mindly-demo-catalog-v1';
const batch = 'mindly-demo-enrolled-lesson-v1';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.cache/demo-catalog/enrolled');
const api = (process.env.DEMO_API_URL ?? 'http://localhost:8000/api/v1').replace(/\/$/, '');
const id = (key: string) => new Types.ObjectId(createHash('sha256').update(`${batch}:${key}`).digest('hex').slice(0, 24));
const read = async <T = Record<string, unknown>>(name: string): Promise<T> =>
  JSON.parse(await fs.readFile(path.join(root, name), 'utf8')) as T;
const write = (name: string, value: unknown) => fs.writeFile(path.join(root, name), JSON.stringify(value, null, 2));
const plain = (data: unknown) => data === undefined ? undefined : JSON.parse(JSON.stringify(data));
type Source = { title: string; author: string; duration: number; sha256: string; sourceFileName: string };
type Learning = { summary: ILessonSummaryData; mindmap: ILessonMindmapData; quizzes: IGeneratedQuizItem[]; sourceSha256: string };
type Snapshot = {
  courses: Array<Record<string, unknown> & { _id: string }>;
  sections: Array<Record<string, unknown>>; previews: Array<Record<string, unknown>>;
};

function storage() {
  const endpoint = `${process.env.MINIO_USE_SSL === 'true' ? 'https' : 'http'}://${process.env.MINIO_ENDPOINT ?? 'localhost'}:${process.env.MINIO_PORT ?? '9000'}`;
  const bucket = process.env.MINIO_PRIVATE_BUCKET_NAME ?? `${process.env.MINIO_BUCKET_NAME ?? 'thc-datn-media'}-private`;
  const publicUrl = (process.env.MINIO_PUBLIC_URL ?? endpoint).replace(/\/$/, '');
  const client = new S3Client({ endpoint, region: 'us-east-1', forcePathStyle: true, credentials: {
    accessKeyId: process.env.MINIO_ROOT_USER ?? 'minioadmin',
    secretAccessKey: process.env.MINIO_ROOT_PASSWORD ?? 'minioadmin123',
  } });
  return { client, bucket, publicUrl };
}

async function importLesson() {
  const [source, learning, transcript] = await Promise.all([
    read<Source>('source.json'), read<Learning>('learning-content.json'),
    read<{ rawTranscript: string; sentences: Array<{ text: string; start: number; end: number }>; transcriptId: string }>('transcript.json'),
  ]);
  assert.equal(learning.sourceSha256, source.sha256);
  SummaryValidator.validateOrFail(learning.summary, source.duration);
  MindmapValidator.validateOrFail(learning.mindmap, source.duration);
  QuizValidator.validateOrFail(learning.quizzes, source.duration);
  assert.equal(learning.quizzes.length, 10);
  const db = mongoose.connection.db!;
  const courses = await db.collection('courses').find({ seedBatch: baseBatch, deletedAt: null }).sort({ _id: 1 }).toArray();
  assert.equal(courses.length, 48, 'Expected exactly the original 48 demo courses.');
  const courseIds = courses.map((c) => c._id);
  const sections = await db.collection('sections').find({ courseId: { $in: courseIds }, deletedAt: null }).toArray();
  const existingLessons = await db.collection('lessons').find({
    sectionId: { $in: sections.map((s) => s._id) }, deletedAt: null,
  }).toArray();
  const admin = await db.collection('users').findOne({ role: 'admin', status: 'active', deletedAt: null });
  assert(admin);
  for (const course of courses) {
    const ownSections = sections.filter((s) => s.courseId.equals(course._id));
    assert.equal(ownSections.length, 1, `Unexpected chapter structure: ${course.slug}`);
    const lessons = existingLessons.filter((l) => l.sectionId.equals(ownSections[0]._id));
    assert.equal(lessons.filter((l) => l.seedBatch === baseBatch && l.order === 0 && l.isPreview).length, 1);
    assert(lessons.every((l) => l.order === 0 || (l._id.equals(id(`lesson:${course._id}`)) && l.seedBatch === batch)),
      `Refusing to replace user-added lessons in ${course.slug}`);
  }
  try { await fs.access(path.join(root, 'before.json')); } catch {
    await write('before.json', { courses, sections, previews: existingLessons.filter((l) => l.seedBatch === baseBatch) });
  }
  const { client, bucket, publicUrl } = storage();
  try {
    try { await client.send(new HeadBucketCommand({ Bucket: bucket })); } catch (error) {
      if ((error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode !== 404) throw error;
      await client.send(new CreateBucketCommand({ Bucket: bucket }));
    }
    // A new bucket is private by default. Never remove/replace an existing policy.
    try {
      const policy = await client.send(new GetBucketPolicyCommand({ Bucket: bucket }));
      assert(!policy.Policy, 'Expected a private bucket without an anonymous policy; review its policy before proceeding.');
    } catch (error) {
      if (!['NoSuchBucketPolicy', 'NoSuchPolicy'].includes((error as Error).name)) throw error;
    }
    const video = await fs.readFile(path.join(root, 'lesson.mp4'));
    const hash = createHash('sha256').update(video).digest('hex');
    const now = new Date();
    const writes = new Map<string, Array<{ updateOne: {
      filter: Record<string, unknown>; update: Record<string, unknown>; upsert: boolean;
    } }>>();
    function upsert(collection: string, key: Types.ObjectId, owner: string, values: Record<string, unknown>) {
      const items = writes.get(collection) ?? [];
      items.push({ updateOne: { filter: { _id: key, seedBatch: batch }, upsert: true, update: {
        $set: { ...values, updatedAt: now, updatedById: owner },
        $setOnInsert: { seedBatch: batch, createdAt: now, createdById: owner, deletedAt: null },
      } } });
      writes.set(collection, items);
    }
    let firstKey = '';
    const uploaded = [];
    for (const [index, course] of courses.entries()) {
      const section = sections.find((s) => s.courseId.equals(course._id))!;
      const lessonId = id(`lesson:${course._id}`);
      const key = `courses/demo-catalog/enrolled/v1/${course.slug}/${source.sha256.slice(0, 16)}.mp4`;
      let present = false;
      try {
        const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
        present = head.Metadata?.sha256 === hash && head.ContentLength === video.length;
      } catch (error) {
        if ((error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode !== 404) throw error;
      }
      if (!present) {
        if (!firstKey) await client.send(new PutObjectCommand({
          Bucket: bucket, Key: key, Body: video, ContentType: 'video/mp4',
          CacheControl: 'private, no-store', Metadata: { sha256: hash, 'seed-batch': batch },
        }));
        else await client.send(new CopyObjectCommand({
          Bucket: bucket, Key: key, CopySource: `${bucket}/${firstKey}`,
        }));
      }
      firstKey ||= key;
      const url = `${publicUrl}/${bucket}/${key}`;
      assert.equal((await fetch(url, { method: 'HEAD' })).status, 403, 'New video is publicly accessible!');
      uploaded.push({ lessonId: lessonId.toString(), courseId: course._id.toString(), bucket, key, url, sha256: hash });
      const auditUser = course.instructorId.toString();
      upsert('lessons', lessonId, auditUser, {
        sectionId: section._id, title: source.title, order: 1,
        isPreview: false, transcriptionStatus: 'READY', materials: [],
        content: { type: 'video', url, publicId: `${bucket}/${key}`, fileName: source.sourceFileName,
          fileSize: video.length, mimeType: 'video/mp4', duration: source.duration },
        sourceSha256: source.sha256,
      });
      upsert('lesson_transcripts', id(`transcript:${lessonId}`), auditUser, {
        lessonId, rawTranscript: transcript.rawTranscript, sentences: transcript.sentences,
        durationSeconds: source.duration, languageCode: 'vi', externalTranscriptId: transcript.transcriptId,
        status: 'READY', failureReason: null,
      });
      upsert('lesson_summaries', id(`summary:${lessonId}`), auditUser, { lessonId, summary: learning.summary, draftSummary: null });
      upsert('lesson_mindmaps', id(`mindmap:${lessonId}`), auditUser, { lessonId, mindmap: learning.mindmap, draftMindmap: null });
      for (const [i, quiz] of learning.quizzes.entries()) {
        upsert('lesson_quizzes', id(`quiz:${lessonId}:${i}`), auditUser, { ...quiz, lessonId, order: i + 1,
          options: quiz.options.map((option, n) => ({ ...option, id: `option-${n}`, label: String.fromCharCode(65 + n) })) });
      }
      console.log(`Prepared locked lesson ${index + 1}/48: ${course.title}`);
    }
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        for (const [collection, operations] of writes) await db.collection(collection).bulkWrite(operations, { session });
        for (const course of courses) {
          let description = String(course.description ?? '').replace(
            'gồm 1 chương và 1 bài video khoảng 7 phút.',
            'gồm 1 chương và 2 bài video: bài xem thử 7 phút và bài bổ sung 8 phút 55 giây.',
          );
          if (!description.includes(`<!-- ${batch} -->`)) description += `<!-- ${batch} --><h3>Bài bổ sung không xem thử</h3><p>Cách mạng tháng Tám – Tóm tắt nhanh lịch sử Việt Nam. Tác giả: EZ Sử. Video do người dùng cung cấp, dùng làm nội dung demo. Khóa có phí cần thanh toán; khóa miễn phí cần đăng ký để mở bài học.</p>`;
          await db.collection('courses').updateOne({ _id: course._id, seedBatch: baseBatch },
            { $set: { description, updatedAt: now, updatedById: admin._id.toString() } }, { session });
        }
      });
    } finally { await session.endSession(); }
    await write('uploaded.json', uploaded);
    console.log('Added 48 non-preview lessons with transcript, summary, mindmap and 10 quizzes each.');
  } finally { client.destroy(); }
}

async function verify() {
  const db = mongoose.connection.db!;
  const before = await read<Snapshot>('before.json');
  const source = await read<Source>('source.json');
  const courses = await db.collection('courses').find({ seedBatch: baseBatch, deletedAt: null }).toArray();
  const lessons = await db.collection('lessons').find({ seedBatch: batch, deletedAt: null }).toArray();
  assert.equal(courses.length, 48);
  assert.equal(lessons.length, 48);
  for (const course of courses) {
    const original = before.courses.find((c) => c._id === course._id.toString())!;
    for (const field of ['price', 'instructorId', 'categoryId', 'level', 'title', 'thumbnailUrl', 'trailerUrl']) {
      assert.deepEqual(plain(course[field]), original[field], `Changed unrelated course field ${course.slug}/${field}`);
    }
    const sections = await db.collection('sections').find({ courseId: course._id, deletedAt: null }).toArray();
    assert.equal(sections.length, 1);
    const all = await db.collection('lessons').find({ sectionId: sections[0]._id, deletedAt: null }).sort({ order: 1 }).toArray();
    assert.equal(all.length, 2);
    assert.equal(all[0].isPreview, true);
    assert.equal(all[1].isPreview, false);
    assert.equal(all[1].content.duration, source.duration);
  }
  for (const original of before.previews) {
    const current = await db.collection('lessons').findOne({ _id: new Types.ObjectId(String(original._id)) });
    assert.deepEqual(plain(current), original, 'An existing preview lesson was modified.');
  }
  for (const collection of ['lesson_transcripts', 'lesson_summaries', 'lesson_mindmaps']) {
    assert.equal(await db.collection(collection).countDocuments({ seedBatch: batch, deletedAt: null }), 48);
  }
  assert.equal(await db.collection('lesson_quizzes').countDocuments({ seedBatch: batch, deletedAt: null }), 480);
  const admin = await db.collection('users').findOne({ role: 'admin', status: 'active', deletedAt: null });
  assert(admin);
  const jwt = new JwtService({ secret: process.env.JWT_SECRET });
  const adminToken = jwt.sign({ sub: admin._id.toString(), role: 'admin' }, { expiresIn: '10m' });
  const headers = { Authorization: `Bearer ${adminToken}` };
  let student;
  const students = await db.collection('users').find({ role: 'student', status: 'active', deletedAt: null }).toArray();
  for (const candidate of students) {
    if (!await db.collection('enrollments').findOne({ userId: candidate._id, courseId: { $in: courses.map((c) => c._id) }, deletedAt: null })) {
      student = candidate;
      break;
    }
  }
  assert(student, 'Need an existing unenrolled student for read-only paywall verification.');
  const studentHeaders = { Authorization: `Bearer ${jwt.sign({ sub: student._id.toString(), role: 'student' }, { expiresIn: '10m' })}` };
  const storageService = new StorageService(new ConfigService(process.env));
  const { client, bucket } = storage();
  try {
    for (const [index, lesson] of lessons.entries()) {
      const course = courses.find((c) => c._id.equals(new Types.ObjectId(before.sections.find((s) => String(s._id) === String(lesson.sectionId))!.courseId as string)));
      assert(course);
      const key = storageService.getMediaReference(lesson.content.url).key;
      const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
      assert.equal(head.ContentLength, lesson.content.fileSize);
      assert.equal((await fetch(lesson.content.url, { method: 'HEAD' })).status, 403);
      for (const suffix of ['', '/transcript', '/quizzes', '/analysis/summary', '/analysis/mindmap']) {
        const endpoint = `${api}/lessons/${lesson._id}${suffix}`;
        assert.equal((await fetch(endpoint)).status, 403, `Anonymous bypass: ${suffix}`);
        assert.equal((await fetch(endpoint, { headers: studentHeaders })).status, 403, `Unenrolled bypass: ${suffix}`);
        const authorized = await fetch(endpoint, { headers });
        assert.equal(authorized.status, 200, `Admin read failed: ${suffix}`);
        const result = await authorized.json() as { data: { content?: { url: string } } };
        if (!suffix) {
          assert(result.data.content);
          assert(result.data.content.url.includes('X-Amz-Signature='));
          const range = await fetch(result.data.content.url, { headers: { Range: 'bytes=0-1023' } });
          assert.equal(range.status, 206);
          await range.arrayBuffer();
        }
      }
      const signatureEndpoint = `${api}/lesson-content/stream-url?key=${encodeURIComponent(lesson.content.publicId)}`;
      assert.equal((await fetch(signatureEndpoint, { headers: studentHeaders })).status, 403);
      if (index % 12 === 0) console.log(`Verified paywall ${index + 1}/48.`);
    }
  } finally { client.destroy(); }
  const report = { courses: 48, chaptersPerCourse: 1, lessonsPerCourse: 2, newNonPreviewLessons: lessons.length,
    sourceTitle: source.title, durationSeconds: source.duration, newSummaries: 48, newMindmaps: 48, newQuizzes: 480,
    freeCourses: courses.filter((c) => c.price === 0).length, paidCourses: courses.filter((c) => c.price > 0).length,
    previewsUnchanged: true, pricesUnchanged: true, privateVideoAccessVerified: true, verifiedAt: new Date().toISOString() };
  await write('verification.json', report);
  console.log(JSON.stringify(report, null, 2));
}

try {
  assert(process.env.MONGODB_URI && process.env.JWT_SECRET, 'Load backend/.env.');
  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB_NAME ?? 'thc_datn' });
  if (process.argv[2] === 'import') await importLesson();
  else if (process.argv[2] === 'verify') await verify();
  else throw new Error('Use import or verify.');
} finally { await mongoose.disconnect(); }
