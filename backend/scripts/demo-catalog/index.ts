import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import mongoose, { Types } from 'mongoose';
import { S3Client, HeadBucketCommand, HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import ffmpeg from 'ffmpeg-static';
import { slugify, CourseStatusEnum, type ICourse, type ISection, type ILesson } from 'share-lib';
import { buildCourseApprovalChecklist } from '../../src/modules/course/utils/course-approval.util.js';
import { CATEGORY_SLUGS, COURSES, LEVELS, LEVEL_LABELS, PRICES } from './catalog.js';

const directory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(directory, '../../.cache/demo-catalog');
const batch = 'mindly-demo-catalog-v1';
const args = process.argv.slice(2);
const mode = args[0] ?? 'verify';
const api = (process.env.DEMO_API_URL ?? 'http://localhost:8000/api/v1').replace(/\/$/, '');

interface Source { id: number; url: string; page: string; author: string; description: string; license: string; licenseUrl: string }
interface Sources { photos: Source[] }
interface PreparedCourse {
  title: string; category: string; slot: number; topics: typeof COURSES[number]['topics'];
  slug: string; id: string; categoryId: string; categoryName: string; instructorId: string;
  instructorName: string; level: string; levelLabel: string; price: number;
  photo: Source; photoPath: string;
}
interface Prepared { batch: string; adminId: string; courses: PreparedCourse[] }
interface Media {
  duration: number; sources: Source[];
  timeline: Array<{ title: string; start: number; end: number }>;
  sentences: Array<{ text: string; start: number; end: number }>;
}
interface SharedLesson {
  title: string; overview: string; conclusion: string;
  topics: Array<{ title: string; explanation: string; example: string; narration: string;
    question: string; options: string[]; answer: number; answerExplanation: string }>;
}

const oid = (value: string) => new Types.ObjectId(value);
const stableId = (key: string) => createHash('sha256').update(`${batch}:${key}`).digest('hex').slice(0, 24);
const sha = (data: Buffer) => createHash('sha256').update(data).digest('hex');
const escape = (value: string) => value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));
const readJson = async <T>(file: string): Promise<T> => JSON.parse(await fs.readFile(file, 'utf8')) as T;
const writeJson = async (file: string, value: unknown) => fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`);

async function connect() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required; load backend/.env.');
  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: process.env.MONGODB_DB_NAME ?? 'thc_datn', serverSelectionTimeoutMS: 10000,
  });
  return mongoose.connection.db!;
}

function storage() {
  const endpoint = `${process.env.MINIO_USE_SSL === 'true' ? 'https' : 'http'}://${process.env.MINIO_ENDPOINT ?? 'localhost'}:${process.env.MINIO_PORT ?? '9000'}`;
  const bucket = process.env.MINIO_BUCKET_NAME ?? 'thc-datn-media';
  const publicUrl = (process.env.MINIO_PUBLIC_URL ?? endpoint).replace(/\/$/, '');
  const client = new S3Client({ endpoint, region: 'us-east-1', forcePathStyle: true, credentials: {
    accessKeyId: process.env.MINIO_ROOT_USER ?? 'minioadmin',
    secretAccessKey: process.env.MINIO_ROOT_PASSWORD ?? 'minioadmin123',
  } });
  return { client, bucket, publicUrl };
}

async function parallel<T>(items: T[], concurrency: number, action: (item: T) => Promise<void>) {
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) await action(items[next++]);
  }));
}

async function download(url: string, destination: string, expected: string) {
  try { if ((await fs.stat(destination)).size > 1000) return; } catch { /* First download. */ }
  const host = new URL(url).hostname;
  assert(['images.pexels.com', 'videos.pexels.com'].includes(host), 'Unapproved media host');
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(120000) });
      assert(response.ok, `Download failed (${response.status}): ${url}`);
      assert(response.headers.get('content-type')?.startsWith(expected), `Unexpected MIME: ${url}`);
      const buffer = Buffer.from(await response.arrayBuffer());
      assert(buffer.length > 1000, `Empty media: ${url}`);
      await fs.writeFile(`${destination}.part`, buffer);
      await fs.rename(`${destination}.part`, destination);
      return;
    } catch (error) { if (attempt === 2) throw error; }
  }
}

function validateCatalog() {
  assert.equal(COURSES.length, 48);
  assert.equal(new Set(COURSES.map((course) => slugify(course.title))).size, 48);
  for (const category of CATEGORY_SLUGS) {
    assert.deepEqual(COURSES.filter((c) => c.category === category).map((c) => c.slot).sort(), [0, 1, 2, 3]);
  }
  for (const course of COURSES) {
    assert.equal(course.topics.length, 3);
    assert(PRICES[course.slot] >= 0 && PRICES[course.slot] < 5000);
  }
}

async function prepare() {
  const db = await connect();
  const [categories, instructors, admin, sources] = await Promise.all([
    db.collection('course_categories').find({ deletedAt: null, isActive: true }).toArray(),
    db.collection('users').find({ role: 'instructor', status: 'active', deletedAt: null },
      { projection: { fullName: 1, createdAt: 1 } }).sort({ createdAt: 1, _id: 1 }).toArray(),
    db.collection('users').findOne({ role: 'admin', status: 'active', deletedAt: null }, { projection: { _id: 1 } }),
    readJson<Record<string, Sources>>(path.join(directory, 'sources.json')),
  ]);
  assert.equal(instructors.length, 4, 'Expected the four existing active instructors.');
  assert(admin, 'An active admin is required for the demo publication audit.');
  await fs.mkdir(path.join(root, 'downloads'), { recursive: true });
  const courses: PreparedCourse[] = COURSES.map((course) => {
    const category = categories.find((value) => value.slug === course.category);
    assert(category, `Missing active category: ${course.category}`);
    const instructor = instructors[(CATEGORY_SLUGS.indexOf(course.category as typeof CATEGORY_SLUGS[number]) + course.slot) % 4];
    const source = sources[course.category];
    const slug = slugify(course.title);
    return { ...course, slug, id: stableId(`course:${slug}`), categoryId: category._id.toString(),
      categoryName: category.name, instructorId: instructor._id.toString(), instructorName: instructor.fullName,
      level: LEVELS[course.slot], levelLabel: LEVEL_LABELS[course.slot], price: PRICES[course.slot],
      photo: source.photos[course.slot],
      photoPath: path.join(root, 'downloads', `${source.photos[course.slot].id}.jpg`),
    };
  });
  const downloads = new Map<string, { url: string; destination: string; expected: string }>();
  for (const course of courses) {
    downloads.set(course.photoPath, { url: course.photo.url, destination: course.photoPath, expected: 'image/' });
  }
  await parallel([...downloads.values()], 4, async ({ url, destination, expected }) => download(url, destination, expected));
  await writeJson(path.join(root, 'prepared.json'), { batch, adminId: admin._id.toString(), courses });
  console.log(`Prepared ${courses.length} courses; downloaded ${downloads.size} source assets.`);
  console.table(instructors.map((instructor) => ({ instructor: instructor.fullName,
    courses: courses.filter((course) => course.instructorId === instructor._id.toString()).length })));
}

function description(course: PreparedCourse, lesson: SharedLesson, media: Media) {
  return `<h2>${escape(course.title)}</h2>`
    + `<p>Khóa học demo cấp độ ${escape(course.levelLabel.toLowerCase())} thuộc danh mục ${escape(course.categoryName)}, gồm 1 chương và 1 bài video khoảng 7 phút.</p>`
    + `<h3>Bài học demo dùng chung</h3><p><strong>${escape(lesson.title)}</strong>. ${escape(lesson.overview)}</p>`
    + '<h3>Nội dung video</h3><ul>' + lesson.topics.map((topic) => `<li>${escape(topic.title)}</li>`).join('') + '</ul>'
    + '<h3>Cách học</h3><p>Xem video tiếng Việt, trả lời 7 câu hỏi tương tác, theo dõi bản tóm tắt và sơ đồ tư duy. Dùng tài liệu đi kèm để thực hành và tự đánh giá.</p>'
    + `<h3>Nguồn minh họa</h3><p>Ảnh bìa: <a href="${escape(course.photo.page)}">${escape(course.photo.author)} / Pexels</a>.</p>`
    + '<p>Ảnh trong video: ' + media.sources.map((source) => `<a href="${escape(source.page)}">${escape(source.author)}</a>`).join(', ')
    + '. <a href="https://www.pexels.com/license/">Pexels License</a>. Kịch bản và tài liệu tự biên soạn cho demo; giọng đọc tổng hợp.</p>';
}

async function importCatalog() {
  const prepared = await readJson<Prepared>(path.join(root, 'prepared.json'));
  assert.equal(prepared.batch, batch);
  assert.equal(prepared.courses.length, 48);
  const shared = await readJson<SharedLesson>(path.join(directory, 'shared-lesson.json'));
  const media = await readJson<Media>(path.join(root, 'rendered', 'shared', 'media.json'));
  assert.equal(shared.topics.length, 7);
  assert.equal(media.timeline.length, 7);
  assert(Math.abs(media.duration - 420) <= 1, 'Expected a seven-minute video.');
  // AAC/container padding adds a few milliseconds; the catalog displays whole seconds.
  media.duration = Math.round(media.duration);
  const db = await connect();
  const { client, bucket, publicUrl } = storage();
  await client.send(new HeadBucketCommand({ Bucket: bucket }));
  const operations = new Map<string, Array<{ updateOne: { filter: Record<string, unknown>; update: Record<string, unknown>; upsert: boolean } }>>();
  const assetChecks: Array<{ key: string; url: string; sha256: string; bytes: number; type: string }> = [];
  const now = new Date();

  async function upload(course: PreparedCourse, name: string, type: string, sharedFile = false) {
    const content = await fs.readFile(path.join(root, 'rendered', sharedFile ? 'shared' : course.slug, name));
    const hash = sha(content);
    const key = `courses/demo-catalog/v1/${course.slug}/${name}`;
    let needsUpload = true;
    try {
      const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
      needsUpload = head.Metadata?.sha256 !== hash || head.ContentLength !== content.length;
    } catch (error) {
      if ((error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode !== 404) throw error;
    }
    if (needsUpload) await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: content,
      ContentType: type, Metadata: { sha256: hash, 'seed-batch': batch }, CacheControl: 'public, max-age=3600' }));
    const url = `${publicUrl}/${bucket}/${key}`;
    assetChecks.push({ key, url, sha256: hash, bytes: content.length, type });
    return { url, publicId: key, fileName: name, fileSize: content.length, mimeType: type };
  }

  async function upsert(collection: string, id: string, owner: string, values: Record<string, unknown>, defaults: Record<string, unknown> = {}) {
    const existing = await db.collection(collection).findOne({ _id: oid(id) }, { projection: { seedBatch: 1, deletedAt: 1 } });
    if (existing) {
      assert.equal(existing.seedBatch, batch, `Refusing to overwrite unrelated ${collection}/${id}`);
      assert(!existing.deletedAt, `Seed record was deleted by a user: ${collection}/${id}`);
    }
    const list = operations.get(collection) ?? [];
    list.push({ updateOne: { filter: { _id: oid(id), seedBatch: batch }, upsert: true,
      update: { $set: { ...values, updatedAt: now, updatedById: owner },
        $setOnInsert: { ...defaults, seedBatch: batch, createdAt: now, createdById: owner, deletedAt: null } } } });
    operations.set(collection, list);
  }

  for (const [index, course] of prepared.courses.entries()) {
    const [category, instructor, slugConflict] = await Promise.all([
      db.collection('course_categories').findOne({ _id: oid(course.categoryId), isActive: true, deletedAt: null }),
      db.collection('users').findOne({ _id: oid(course.instructorId), role: 'instructor', status: 'active', deletedAt: null }),
      db.collection('courses').findOne({ slug: course.slug, deletedAt: null, _id: { $ne: oid(course.id) } }),
    ]);
    assert(category && instructor, `Category/instructor is no longer available: ${course.slug}`);
    assert(!slugConflict, `Another course already uses slug ${course.slug}`);
    const cover = await upload(course, 'cover.webp', 'image/webp');
    // Identical video content, independent object keys: deleting one course's media
    // must not break other courses under the existing storage deletion lifecycle.
    const video = await upload(course, 'lesson.mp4', 'video/mp4', true);
    const pdf = await upload(course, 'lesson.pdf', 'application/pdf', true);
    const courseRecord = { title: course.title, slug: course.slug, shortDescription: course.topics.map((topic) => topic.title).join(' · '),
      description: description(course, shared, media), thumbnailUrl: cover.url, trailerUrl: video.url,
      price: course.price, originalPrice: null, instructorId: oid(course.instructorId), categoryId: oid(course.categoryId),
      level: course.level, status: 'published', approvalRequestedAt: now, approvalRequestedById: oid(course.instructorId),
      reviewedAt: now, reviewedById: oid(prepared.adminId), rejectionReason: null };
    const sectionId = stableId(`section:${course.slug}:0`);
    const firstLessonId = stableId(`lesson:${course.slug}:0`);
    const section = { courseId: oid(course.id), title: 'Học và thực hành hiệu quả', description: shared.overview, order: 0 };
    const lesson = { sectionId: oid(sectionId), order: 0, title: shared.title,
      description: `${shared.overview}\n\n${shared.conclusion}`,
      content: { ...video, type: 'video', duration: media.duration },
      materials: [{ _id: oid(stableId(`material:${course.slug}:0`)), title: 'Tài liệu thực hành và tự đánh giá', ...pdf, createdAt: now }],
      isPreview: true, transcriptionStatus: 'READY' };
    await upsert('sections', sectionId, course.instructorId, section);
    await upsert('lessons', firstLessonId, course.instructorId, lesson);
    const sections = [{ ...section, id: sectionId }];
    const lessons = [{ ...lesson, id: firstLessonId, sectionId }];
    const checklist = buildCourseApprovalChecklist(
      { ...courseRecord, id: course.id, instructorId: course.instructorId, categoryId: course.categoryId, status: CourseStatusEnum.DRAFT } as unknown as ICourse,
      true, sections as unknown as ISection[], lessons as unknown as ILesson[],
    );
    assert(checklist.canSubmit, `Course failed publication requirements: ${course.slug}`);
    await upsert('courses', course.id, course.instructorId, courseRecord, { ratingAvg: 0, reviewCount: 0 });

    await upsert('lesson_transcripts', stableId(`transcript:${course.slug}`), course.instructorId, {
      lessonId: oid(firstLessonId), rawTranscript: media.sentences.map((s) => s.text).join('\n\n'),
      sentences: media.sentences, durationSeconds: media.duration, languageCode: 'vi', status: 'READY',
      externalTranscriptId: null, failureReason: null,
    });
    await upsert('lesson_mindmaps', stableId(`mindmap:${course.slug}`), course.instructorId, {
      lessonId: oid(firstLessonId), draftMindmap: null, mindmap: { root: { id: 'root', title: shared.title, timestamp: 0,
        children: shared.topics.map((topic, i) => ({ id: `topic-${i}`, title: topic.title, timestamp: media.timeline[i].start,
          children: [{ id: `example-${i}`, title: topic.example, timestamp: media.timeline[i].start }] })) } },
    });
    await upsert('lesson_summaries', stableId(`summary:${course.slug}`), course.instructorId, {
      lessonId: oid(firstLessonId), draftSummary: null, summary: { title: shared.title,
        overview: shared.overview,
        keyPoints: shared.topics.map((topic, i) => ({ title: topic.title, content: topic.explanation, timestamp: media.timeline[i].start })),
        conclusion: shared.conclusion },
    });
    for (const [i, topic] of shared.topics.entries()) {
      await upsert('lesson_quizzes', stableId(`quiz:${course.slug}:${i}`), course.instructorId, {
        lessonId: oid(firstLessonId), timestamp: media.timeline[i].end - 0.2, order: i + 1,
        question: topic.question, questionType: 'single', explanation: topic.answerExplanation,
        options: topic.options.map((text, option) => ({ text, isCorrect: option === topic.answer,
          id: `option-${option}`, label: String.fromCharCode(65 + option) })),
      });
    }
    console.log(`Staged ${index + 1}/48: ${course.title}`);
  }
  // Publish only when every course and every upload is ready; no partial catalog.
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      for (const [collection, writes] of operations) await db.collection(collection).bulkWrite(writes, { session });
    });
  } finally { await session.endSession(); client.destroy(); }
  await writeJson(path.join(root, 'uploaded-assets.json'), assetChecks);
  console.log(`Published 48 courses with ${assetChecks.length} uploaded assets.`);
}

async function verify() {
  const db = await connect();
  const { client, bucket } = storage();
  const courses = await db.collection('courses').find({ seedBatch: batch, deletedAt: null }).toArray();
  assert.equal(courses.length, 48);
  const ids = courses.map((course) => course._id);
  const sections = await db.collection('sections').find({ courseId: { $in: ids }, deletedAt: null }).toArray();
  const lessons = await db.collection('lessons').find({ sectionId: { $in: sections.map((section) => section._id) }, deletedAt: null }).toArray();
  assert.equal(sections.length, 48);
  assert.equal(lessons.length, 48);
  const categoryCounts = new Map<string, number>();
  const instructorCounts = new Map<string, number>();
  const instructorLevels = new Map<string, number[]>();
  for (const course of courses) {
    assert(course.price >= 0 && course.price < 5000);
    assert.equal(course.status, 'published');
    const categoryId = course.categoryId.toString(), instructorId = course.instructorId.toString();
    categoryCounts.set(categoryId, (categoryCounts.get(categoryId) ?? 0) + 1);
    instructorCounts.set(instructorId, (instructorCounts.get(instructorId) ?? 0) + 1);
    const levels = instructorLevels.get(instructorId) ?? [0, 0, 0];
    levels[['beginner', 'intermediate', 'advanced'].indexOf(course.level)]++;
    instructorLevels.set(instructorId, levels);
    const ownSections = sections.filter((s) => s.courseId.equals(course._id));
    const ownLessons = lessons.filter((l) => ownSections.some((s) => s._id.equals(l.sectionId)));
    assert.equal(ownSections.length, 1);
    assert.equal(ownLessons.length, 1);
    assert(Math.abs(ownLessons[0].content.duration - 420) <= 1);
    assert.equal(ownLessons.filter((l) => l.isPreview && l.content.type === 'video').length, 1);
    for (const section of ownSections) assert.deepEqual(ownLessons.filter((l) => l.sectionId.equals(section._id)).map((l) => l.order), [0]);
    const result = buildCourseApprovalChecklist(
      { ...course, id: course._id.toString(), status: CourseStatusEnum.DRAFT } as unknown as ICourse, true,
      ownSections.map((s) => ({ ...s, id: s._id.toString() })) as unknown as ISection[],
      ownLessons.map((l) => ({ ...l, id: l._id.toString(), sectionId: l.sectionId.toString() })) as unknown as ILesson[],
    );
    assert(result.canSubmit, `Invalid publication: ${course.slug}`);
  }
  assert.equal(categoryCounts.size, 12);
  assert.equal(instructorCounts.size, 4);
  assert([...categoryCounts.values()].every((count) => count === 4));
  assert([...instructorCounts.values()].every((count) => count === 12));
  for (const levels of instructorLevels.values()) assert.deepEqual(levels, [6, 3, 3]);
  for (const count of [0, 2000, 3000, 4000]) assert.equal(courses.filter((c) => c.price === count).length, 12);
  for (const collection of ['lesson_mindmaps', 'lesson_transcripts', 'lesson_summaries']) {
    assert.equal(await db.collection(collection).countDocuments({ seedBatch: batch, deletedAt: null }), 48);
  }
  const quizzes = await db.collection('lesson_quizzes').find({ seedBatch: batch, deletedAt: null }).toArray();
  assert.equal(quizzes.length, 336);
  for (const lesson of lessons) assert.equal(quizzes.filter((q) => q.lessonId.equals(lesson._id)).length, 7);
  for (const quiz of quizzes) {
    const lesson = lessons.find((lesson) => lesson._id.equals(quiz.lessonId));
    assert(lesson && quiz.timestamp > 0 && quiz.timestamp < lesson.content.duration);
    assert.equal(quiz.options.filter((option: { isCorrect: boolean }) => option.isCorrect).length, 1);
  }
  const summaries = await db.collection('lesson_summaries').find({ seedBatch: batch, deletedAt: null }).toArray();
  const mindmaps = await db.collection('lesson_mindmaps').find({ seedBatch: batch, deletedAt: null }).toArray();
  const transcripts = await db.collection('lesson_transcripts').find({ seedBatch: batch, deletedAt: null }).toArray();
  for (const lesson of lessons) {
    const summary = summaries.find((item) => item.lessonId.equals(lesson._id));
    const mindmap = mindmaps.find((item) => item.lessonId.equals(lesson._id));
    const transcript = transcripts.find((item) => item.lessonId.equals(lesson._id));
    assert(summary && mindmap && transcript, `Missing generated content for lesson ${lesson._id}`);
    assert.equal(summary.summary.keyPoints.length, 7);
    assert.equal(mindmap.mindmap.root.children.length, 7);
    assert.equal(transcript.sentences.length, 7);
    assert.equal(transcript.status, 'READY');
    assert.equal(lesson.transcriptionStatus, 'READY');
    for (const [i, sentence] of transcript.sentences.entries()) {
      assert.equal(sentence.start, i * 60000);
      assert(sentence.end > sentence.start && sentence.end <= lesson.content.duration * 1000);
      assert.equal(summary.summary.keyPoints[i].timestamp, i * 60);
      assert.equal(mindmap.mindmap.root.children[i].timestamp, i * 60);
    }
  }
  const assets = await readJson<Array<{ key: string; url: string; sha256: string; bytes: number; type: string }>>(path.join(root, 'uploaded-assets.json'));
  assert.equal(assets.length, 144);
  assert.equal(new Set(assets.filter((a) => a.type === 'video/mp4').map((a) => a.sha256)).size, 1);
  await parallel(assets, 6, async (asset) => {
    const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: asset.key }));
    assert.equal(head.ContentLength, asset.bytes);
    assert.equal(head.ContentType, asset.type);
    assert.equal(head.Metadata?.sha256, asset.sha256);
    const response = await fetch(asset.url, { method: 'HEAD', signal: AbortSignal.timeout(15000) });
    assert(response.ok, `Public asset unavailable: ${asset.url}`);
  });
  await parallel(courses, 3, async (course) => {
    const response = await fetch(`${api}/courses/public/${course.slug}`, { signal: AbortSignal.timeout(15000) });
    assert(response.ok, `Public course unavailable: ${course.slug}`);
    const result = await response.json() as { success: boolean; data: { course?: { slug: string }; slug?: string } };
    assert(result.success);
    assert.equal(result.data.course?.slug ?? result.data.slug, course.slug);
  });
  // Read the same learner-facing endpoints used by the interactive player.
  const previewId = lessons[0]._id.toString();
  for (const suffix of ['', '/transcript', '/quizzes', '/analysis/mindmap', '/analysis/summary']) {
    const response = await fetch(`${api}/lessons/${previewId}${suffix}`, { signal: AbortSignal.timeout(15000) });
    assert(response.ok, `Lesson API unavailable: ${suffix || '/lesson'}`);
    const result = await response.json() as { success: boolean; data: unknown };
    assert(result.success && result.data, `Empty lesson API response: ${suffix}`);
  }
  client.destroy();
  const report = { courses: 48, categories: 12, instructors: 4, coursesPerInstructor: 12,
    sections: sections.length, lessons: lessons.length, videoDurationSeconds: lessons[0].content.duration,
    sharedVideoContent: 1, videoObjects: 48, documents: 48,
    images: 48, summaries: summaries.length, mindmaps: mindmaps.length,
    quizzes: quizzes.length, assetsVerified: assets.length,
    prices: [0, 2000, 3000, 4000], verifiedAt: new Date().toISOString() };
  await writeJson(path.join(root, 'verification.json'), report);
  console.log(JSON.stringify(report, null, 2));
}

try {
  validateCatalog();
  if (mode === 'prepare') await prepare();
  else if (mode === 'render') {
    const child = spawnSync(process.env.PYTHON ?? 'python', [path.join(directory, 'render.py'), ...args.slice(1)],
      { stdio: 'inherit', env: { ...process.env, FFMPEG_PATH: String(ffmpeg), PYTHONIOENCODING: 'utf-8' } });
    if (child.error) throw child.error;
    if (child.status !== 0) throw new Error(`Media renderer exited with code ${child.status}`);
  } else if (mode === 'import') await importCatalog();
  else if (mode === 'verify') await verify();
  else throw new Error(`Unknown mode: ${mode}. Use prepare, render, import, or verify.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally { await mongoose.disconnect(); }
