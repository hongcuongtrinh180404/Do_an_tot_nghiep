import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import mongoose, { type Connection, type ClientSession, type Model } from 'mongoose';
import { isQuizTimestamp, type ILessonQuiz, LearningStatusEnum } from 'share-lib';
import { UserEntity, UserSchema } from '../../src/modules/user/schemas/user.schema.js';
import { CourseEntity, CourseSchema } from '../../src/modules/course/schemas/course.schema.js';
import { OrderEntity, OrderSchema } from '../../src/modules/enrollment/schemas/order.schema.js';
import { EnrollmentEntity, EnrollmentSchema } from '../../src/modules/enrollment/schemas/enrollment.schema.js';
import { PaymentEntity, PaymentSchema } from '../../src/modules/payment/schemas/payment.schema.js';
import { ReviewEntity, ReviewSchema } from '../../src/modules/review/schemas/review.schema.js';
import { LearningProgressEntity, LearningProgressSchema } from '../../src/modules/learning-progress/schemas/learning-progress.schema.js';
import { LessonQuizAnswerEntity, LessonQuizAnswerSchema, LessonVideoCompletionEntity, LessonVideoCompletionSchema } from '../../src/modules/learning-progress/schemas/lesson-completion.schema.js';
import { ReviewRepository } from '../../src/modules/review/repositories/review.repository.js';
import { CourseRepository } from '../../src/modules/course/repositories/course.repository.js';
import { calculateOrderFinancials } from '../../src/modules/payment/utils/order-pricing.util.js';
import { assertFreeEnrollmentAllowed } from '../../src/modules/enrollment/utils/free-enrollment.util.js';
import { contentVersion, quizRevision } from '../../src/modules/course/utils/lesson-quiz-version.util.js';
import { summarizeProgress } from '../../src/modules/learning-progress/utils/learning-progress.util.js';

export const BATCH = 'mindly-activity-2026-11-12--23-v1';
export const START = new Date('2026-11-12T00:00:00+07:00');
export const END = new Date('2026-11-23T23:59:59.999+07:00');
export const RUNS = 'activity_seed_runs';
export const COLLECTIONS = [
  'users', 'courses', 'orders', 'payments', 'enrollments', 'reviews',
  'sections', 'lessons', 'lesson_quizzes', 'learning_progress',
  'lesson_quiz_answers', 'lesson_video_completions', 'commission_settings', 'commission_histories',
] as const;
export type Row = mongoose.mongo.WithId<mongoose.mongo.Document>;
export type State = Record<typeof COLLECTIONS[number], Row[]>;
export interface Insert { collection: string; document: Row }
export interface Baseline { collection: string; id: string; hash: string }
export interface ActivityPlan {
  batch: string; cutoff: Date; targets: Record<string, number>;
  courses: Array<{ id: string; title: string; price: number; target: number; existing: number; newOwnership: number }>;
  inserts: Insert[]; skippedReviews: number; blockers: string[];
}
export const id = (value: unknown) => value == null ? '' : String(value);
export const active = (row: Row) => row.deletedAt == null;
export const pair = (row: Row) => `${id(row.userId)}:${id(row.courseId)}`;
export const hash = (key: string) => createHash('sha256').update(`${BATCH}:${key}`).digest('hex');
export const unit = (key: string) => parseInt(hash(key).slice(0, 8), 16) / 0x1_0000_0000;
export const stableId = (key: string) => new mongoose.Types.ObjectId(hash(key).slice(0, 24));
export const targetFor = (courseId: string) => 5 + (unit(`target:${courseId}`) < 0.5 ? 0 : 1);
const ms = (value: unknown) => value instanceof Date && Number.isFinite(value.getTime()) ? value.getTime() : NaN;
const student = (row: Row) => active(row) && row.role === 'student' && row.status === 'active';
const within = (date: unknown, cutoff: Date) => ms(date) >= START.getTime() && ms(date) <= cutoff.getTime();

export async function readState(db: mongoose.mongo.Db, session?: ClientSession): Promise<State> {
  const state = {} as State;
  // Serial reads also work inside one transaction (no Promise.all on a session).
  for (const name of COLLECTIONS) state[name] = await db.collection(name).find({}, { session }).sort({ _id: 1 }).toArray();
  return state;
}

function digest(row: Row, course = false) {
  const copy = { ...row };
  if (course) {
    delete copy.ratingAvg;
    delete copy.reviewCount;
    delete copy.updatedAt; // The normal rating-cache service updates this timestamp.
  }
  return createHash('sha256').update(mongoose.mongo.BSON.EJSON.stringify(copy, { relaxed: false })).digest('hex');
}
export function baselineFor(state: State): Baseline[] {
  return COLLECTIONS.flatMap(collection => state[collection].filter(row => row.seedBatch !== BATCH)
    .map(row => ({ collection, id: id(row._id), hash: digest(row, collection === 'courses') })));
}
export function assertBaselineUnchanged(state: State, baseline: Baseline[]) {
  for (const before of baseline) {
    const row = state[before.collection as keyof State].find(value => id(value._id) === before.id);
    assert(row, `Existing record disappeared: ${before.collection}/${before.id}`);
    assert.equal(digest(row, before.collection === 'courses'), before.hash, `Existing data changed: ${before.collection}/${before.id}`);
  }
  for (const name of ['users', 'courses'] as const) {
    assert.equal(state[name].length, baseline.filter(row => row.collection === name).length, `Never create ${name}`);
  }
}

export function registerModels(connection: Connection): Map<string, Model<mongoose.mongo.Document>> {
  const definitions = [
    ['users', UserEntity.name, UserSchema], ['courses', CourseEntity.name, CourseSchema],
    ['orders', OrderEntity.name, OrderSchema], ['payments', PaymentEntity.name, PaymentSchema],
    ['enrollments', EnrollmentEntity.name, EnrollmentSchema], ['reviews', ReviewEntity.name, ReviewSchema],
    ['learning_progress', LearningProgressEntity.name, LearningProgressSchema],
    ['lesson_quiz_answers', LessonQuizAnswerEntity.name, LessonQuizAnswerSchema],
    ['lesson_video_completions', LessonVideoCompletionEntity.name, LessonVideoCompletionSchema],
  ] as const;
  return new Map(definitions.map(([collection, name, schema]) => [
    collection, connection.model(name, schema, collection) as unknown as Model<mongoose.mongo.Document>,
  ]));
}

function metadata(collection: string, reference: string, userId: string, createdAt: Date, updatedAt = createdAt) {
  return {
    _id: stableId(`${collection}:${reference}`), seedBatch: BATCH, seedReference: `${BATCH}:${collection}:${reference}`,
    deletedAt: null, createdById: userId, updatedById: userId, createdAt, updatedAt,
  };
}

/** Stratified days, random time-of-day; never precedes availability or exceeds the frozen cutoff. */
export function purchaseTime(key: string, earliest: Date, latest: Date, index: number): Date {
  assert(ms(latest) >= ms(earliest), `No historical time available for ${key}`);
  const day = 86_400_000;
  const firstDay = Math.floor((ms(earliest) + 7 * 3_600_000) / day) * day - 7 * 3_600_000;
  const buckets: Array<[number, number]> = [];
  for (let start = firstDay; start <= ms(latest); start += day) {
    const lo = Math.max(start, ms(earliest)), hi = Math.min(start + day - 1, ms(latest));
    if (hi >= lo) buckets.push([lo, hi]);
  }
  const [lo, hi] = buckets[index % buckets.length];
  return new Date(Math.floor(lo + (hi - lo) * (0.05 + unit(`date:${key}`) * 0.9)));
}

function curriculum(state: State, course: Row) {
  const sections = new Map(state.sections.filter(active).map(row => [id(row._id), row]));
  const videos = state.lessons.filter(row => active(row) && row.content?.type === 'video'
    && id(sections.get(id(row.sectionId))?.courseId) === id(course._id));
  const playable = videos.filter(row => row.content.url && Number.isFinite(row.content.duration) && row.content.duration > 0)
    .sort((a, b) => ms(a.createdAt) - ms(b.createdAt) || a.order - b.order || id(a._id).localeCompare(id(b._id)));
  const required = Math.floor(videos.length / 5) + 1; // Strictly >20%, not >=20%.
  assert(videos.length > 0 && playable.length >= required, `Insufficient playable lessons: ${course.title}`);
  const chosen = playable.slice(0, required);
  const quizzes = (lesson: Row) => state.lesson_quizzes.filter(quiz => active(quiz) && id(quiz.lessonId) === id(lesson._id)
    && isQuizTimestamp(quiz.timestamp, lesson.content.duration));
  const availableAt = Math.max(ms(course.createdAt), ...chosen.flatMap(lesson => [
    ms(lesson.createdAt), ms(sections.get(id(lesson.sectionId))?.createdAt),
    ...quizzes(lesson).map(quiz => ms(quiz.createdAt)),
  ]));
  assert(Number.isFinite(availableAt), `Missing curriculum timestamps: ${course.title}`);
  return { videos, chosen, quizzes, availableAt, durationMs: chosen.reduce((sum, row) => sum + row.content.duration * 1000, 0) };
}

const COMMENTS: Record<number, string[]> = {
  1: ['Nội dung khó theo dõi, phần giải thích chưa rõ nên trải nghiệm chưa đáp ứng mong đợi.', 'Cách trình bày còn rời rạc, tôi gặp khó khăn khi hiểu các bước thực hành.', 'Chất lượng bài giảng chưa tốt, cần thêm hướng dẫn cụ thể và ví dụ dễ hiểu.', 'Tôi chưa hài lòng với cách tổ chức nội dung và tốc độ trình bày.', 'Khóa học chưa giúp tôi nắm được kiến thức như mong đợi.'],
  2: ['Khóa học còn nhiều hạn chế, một số phần giải thích cần được cải thiện.', 'Có vài ý hữu ích nhưng ví dụ còn ít, các bước thực hành chưa đủ rõ.', 'Nội dung cần được sắp xếp mạch lạc hơn để người mới dễ theo kịp.', 'Tôi mong giảng viên bổ sung hướng dẫn và cải thiện chất lượng trình bày.', 'Một số phần khá sơ lược, chưa giải quyết được những vướng mắc khi học.'],
  3: ['Nội dung tương đối ổn, có kiến thức hữu ích nhưng vẫn còn phần cần làm rõ.', 'Khóa học đáp ứng mức cơ bản, tôi mong có thêm ví dụ thực tế.', 'Có thể học được những ý chính, tuy nhiên nhịp bài giảng chưa thật đồng đều.', 'Bài học có giá trị tham khảo, phần thực hành nên được giải thích kỹ hơn.', 'Trải nghiệm nhìn chung ổn, nội dung nâng cao vẫn cần bổ sung.'],
  4: ['Khóa học chất lượng, kiến thức dễ hiểu và có thể áp dụng vào thực hành.', 'Giảng viên hướng dẫn rõ ràng, các ví dụ giúp tôi nắm được nội dung.', 'Cách tổ chức bài học hợp lý, kiến thức hữu ích với người mới.', 'Tôi hài lòng với nội dung và những hướng dẫn thực hành trong khóa học.', 'Bài giảng dễ theo dõi, các phần kiến thức được kết nối khá tốt.'],
  5: ['Nội dung rất tốt, giảng viên truyền đạt rõ ràng và trải nghiệm học tập tích cực.', 'Khóa học rất hữu ích, các ví dụ và hướng dẫn giúp tôi hiểu bài nhanh hơn.', 'Tôi rất hài lòng với cách trình bày mạch lạc và nội dung thực hành.', 'Bài học được tổ chức rất tốt, giải thích dễ hiểu và có tính ứng dụng cao.', 'Một trải nghiệm học tập rất tích cực, kiến thức được truyền đạt kỹ và rõ.'],
};

function rateAt(state: State, instructor: Row, at: Date): number {
  // The current database has no history. Stop rather than invent a historical
  // override if a later run encounters policy changes that need reconstruction.
  assert.equal(state.commission_histories.filter(active).length, 0, 'Commission history now exists: audit effective historical rates before adding more orders');
  const setting = state.commission_settings.filter(row => active(row) && row.isCurrent)
    .sort((a, b) => ms(b.createdAt) - ms(a.createdAt))[0];
  if (instructor.commissionRateUpdatedAt && ms(instructor.commissionRateUpdatedAt) > ms(at)) {
    throw new Error(`Cannot infer a prior instructor commission: ${id(instructor._id)}`);
  }
  if (typeof instructor.commissionRate === 'number') return instructor.commissionRate;
  if (setting) {
    assert(ms(setting.createdAt) <= ms(at), 'Cannot apply a newer commission setting to historical orders');
    return setting.defaultRate;
  }
  return 30; // The existing checkout's initial policy, not a dashboard constant.
}

function learningAndReview(plan: ActivityPlan, state: State, user: Row, course: Row, enrollment: Row) {
  const key = pair(enrollment);
  const existing = state.reviews.find(row => active(row) && pair(row) === key);
  if (existing) { plan.skippedReviews++; return; }
  assert(!state.reviews.some(row => pair(row) === key), `A deleted review must not be recreated: ${key}`);
  const lessons = curriculum(state, course);
  const minimum = Math.max(ms(enrollment.enrolledAt) + 1000, lessons.availableAt);
  const latestStart = ms(plan.cutoff) - lessons.durationMs - 5000;
  assert(minimum <= latestStart, `Insufficient learning time before cutoff: ${key}`);
  const start = minimum + Math.floor(Math.min(86_400_000, latestStart - minimum) * unit(`learning-delay:${key}`));
  let cursor = start;
  const add = (collection: string, reference: string, at: Date, values: Record<string, unknown>) =>
    plan.inserts.push({ collection, document: { ...metadata(collection, reference, id(user._id), at), ...values } });
  for (const lesson of lessons.chosen) {
    const endedAt = new Date(cursor + lesson.content.duration * 1000);
    const quizzes = lessons.quizzes(lesson);
    for (const quiz of quizzes) {
      const version = quizRevision(quiz as unknown as ILessonQuiz);
      if (state.lesson_quiz_answers.some(row => active(row) && id(row.userId) === id(user._id) && id(row.quizId) === id(quiz._id) && row.quizRevision === version)) continue;
      assert(quiz.options?.length > 0 && quiz.options.some((option: { isCorrect: boolean }) => option.isCorrect), `Invalid quiz options: ${id(quiz._id)}`);
      const option = quiz.options[Math.floor(unit(`answer:${key}:${id(quiz._id)}`) * quiz.options.length)];
      const correctOptionIds = quiz.options.filter((item: { isCorrect: boolean }) => item.isCorrect).map((item: { id: string }) => item.id);
      const submittedAt = new Date(Math.min(ms(endedAt), cursor + quiz.timestamp * 1000 + 500));
      add('lesson_quiz_answers', `${key}:${id(quiz._id)}:${version}`, submittedAt, {
        userId: user._id, courseId: course._id, lessonId: lesson._id, quizId: quiz._id,
        quizRevision: version, selectedOptionIds: [option.id], correctOptionIds,
        isCorrect: correctOptionIds.length === 1 && correctOptionIds[0] === option.id,
        submittedAt, quizSnapshot: { ...quiz, id: id(quiz._id), lessonId: id(lesson._id) },
      });
    }
    const mediaVersion = contentVersion({ url: lesson.content.url, publicId: lesson.content.publicId ?? null });
    if (!state.lesson_video_completions.some(row => active(row) && id(row.userId) === id(user._id) && id(row.lessonId) === id(lesson._id) && row.mediaVersion === mediaVersion)) {
      add('lesson_video_completions', `${key}:${id(lesson._id)}:${mediaVersion}`, endedAt, {
        userId: user._id, courseId: course._id, lessonId: lesson._id, mediaVersion, endedAt,
      });
    }
    cursor = ms(endedAt) + 1000;
  }
  if (!state.learning_progress.some(row => pair(row) === key)) {
    const last = lessons.chosen.at(-1)!;
    plan.inserts.push({ collection: 'learning_progress', document: {
      ...metadata('learning_progress', key, id(user._id), new Date(start), new Date(cursor)),
      userId: user._id, courseId: course._id, watchedMs: lessons.durationMs,
      lastLessonId: last._id, lastMediaUrl: last.content.url, lastPositionSeconds: last.content.duration,
      sessionId: null, sessionLessonId: null, sessionMediaUrl: null, sessionExpiresAt: null,
      lastHeartbeatAt: null, sessionWatchedMs: 0, lastSequence: 0, sessionClosed: false, revision: 0,
    } });
  }
  const reviewAt = new Date(Math.floor(cursor + Math.min(2 * 86_400_000, ms(plan.cutoff) - cursor) * unit(`review-time:${key}`)));
  const rating = 1 + Math.floor(unit(`rating:${key}`) * 5);
  const comment = COMMENTS[rating][Math.floor(unit(`comment:${key}`) * COMMENTS[rating].length)];
  add('reviews', key, reviewAt, {
    userId: user._id, courseId: course._id, rating, comment: `Với khóa "${course.title}": ${comment}`,
    status: 'visible', hideReason: null, moderationHistory: [], reports: [], reportCount: 0,
    instructorReply: null, adminReply: null,
  });
}

export function buildPlan(state: State, cutoff: Date, savedTargets: Record<string, number> = {}): ActivityPlan {
  assert(ms(cutoff) >= ms(START) && ms(cutoff) <= ms(END) && ms(cutoff) <= Date.now(), 'Invalid or future cutoff');
  const users = state.users.filter(student);
  const byUser = new Map(state.users.map(row => [id(row._id), row]));
  const plan: ActivityPlan = { batch: BATCH, cutoff, targets: { ...savedTargets }, courses: [], inserts: [], skippedReviews: 0, blockers: [] };
  let purchaseIndex = 0;
  for (const course of state.courses.filter(active).sort((a, b) => id(a._id).localeCompare(id(b._id)))) {
    const operationStart = plan.inserts.length;
    try {
      assert.equal(course.status, 'published', 'Course is not published; do not change its status');
      assert(Number.isSafeInteger(course.price) && course.price >= 0, 'Invalid VND price');
      const instructor = byUser.get(id(course.instructorId));
      assert(instructor && active(instructor) && instructor.status === 'active' && instructor.role === 'instructor', 'Unavailable instructor');
      const lessons = curriculum(state, course);
      const target = plan.targets[id(course._id)] ?? targetFor(id(course._id));
      assert(target === 5 || target === 6, 'Invalid saved target');
      plan.targets[id(course._id)] = target;
      const current = state.enrollments.filter(row => active(row) && id(row.courseId) === id(course._id)
        && within(row.enrolledAt, cutoff) && users.some(user => id(user._id) === id(row.userId)));
      assert(new Set(current.map(pair)).size === current.length, 'Duplicate existing student enrollment');
      assert(current.length <= 6, `Already has ${current.length} eligible owners; never delete existing data`);
      const needed = Math.max(0, target - current.length);
      const candidates = users.filter(user => id(user._id) !== id(course.instructorId)
        && ms(user.createdAt) + lessons.durationMs + 180_000 < ms(cutoff)
        && !state.enrollments.some(row => pair(row) === `${id(user._id)}:${id(course._id)}`)
        && !state.orders.some(row => active(row) && pair(row) === `${id(user._id)}:${id(course._id)}` && ['PAID', 'PENDING'].includes(row.status))
        && !state.reviews.some(row => pair(row) === `${id(user._id)}:${id(course._id)}`))
        .sort((a, b) => unit(`student:${id(course._id)}:${id(a._id)}`) - unit(`student:${id(course._id)}:${id(b._id)}`));
      assert(candidates.length >= needed, `Missing ${needed - candidates.length} eligible students (${needed} needed, ${candidates.length} available)`);
      const enrollments = [...current];
      for (const user of candidates.slice(0, needed)) {
        const key = `${id(user._id)}:${id(course._id)}`;
        const earliest = new Date(Math.max(ms(START), ms(course.createdAt), ms(user.createdAt), ms(instructor.createdAt)));
        const latest = new Date(ms(cutoff) - lessons.durationMs - 180_000);
        const createdAt = purchaseTime(key, earliest, latest, purchaseIndex++);
        const enrolledAt = new Date(ms(createdAt) + (course.price > 0 ? 60_000 : 0));
        const enrollment = { ...metadata('enrollments', key, id(user._id), enrolledAt),
          userId: user._id, courseId: course._id, enrolledAt, orderId: null as mongoose.Types.ObjectId | null };
        if (course.price === 0) {
          assertFreeEnrollmentAllowed(id(user._id), id(course._id), { status: user.status, deletedAt: user.deletedAt }, {
            status: course.status, price: course.price, instructorId: id(course.instructorId), deletedAt: course.deletedAt,
          });
        } else {
          const orderId = stableId(`orders:${key}`);
          const orderCode = `MD${hash(`order-code:${key}`).slice(0, 10).toUpperCase()}`;
          assert(!state.orders.some(row => row.orderCode === orderCode), `Order code collision: ${orderCode}`);
          const financials = calculateOrderFinancials(course.price, course.originalPrice, rateAt(state, instructor, createdAt));
          enrollment.orderId = orderId;
          plan.inserts.push({ collection: 'orders', document: {
            ...metadata('orders', key, id(user._id), createdAt, enrolledAt), orderCode, userId: user._id,
            courseId: course._id, instructorId: instructor._id, ...financials,
            paymentMethod: 'INTERNAL_SEED', status: 'PAID', expiresAt: new Date(ms(createdAt) + 900_000),
            paidAt: enrolledAt, receivedAmount: financials.amount, lastPaymentStatus: 'MATCHED', paymentRevision: 0,
            courseSnapshot: { title: course.title, slug: course.slug, thumbnailUrl: course.thumbnailUrl ?? null, instructorName: instructor.fullName },
          } });
          plan.inserts.push({ collection: 'payments', document: {
            ...metadata('payments', key, id(user._id), enrolledAt), orderId, orderCode, source: 'INTERNAL_SEED',
            internalReference: `${BATCH}:${key}`, amountIn: financials.amount,
            bankBrandName: '', accountNumber: '', transactionDate: enrolledAt,
            content: 'Internal demo history import — no bank transfer or bank verification',
            reconciliationStatus: 'MATCHED', appliedAt: enrolledAt, excessAmount: 0,
            rawPayload: { source: 'INTERNAL_SEED', batch: BATCH, realBankTransfer: false, priceBasis: 'existing_course_catalog' },
            resolution: null, auditHistory: [],
          } });
        }
        plan.inserts.push({ collection: 'enrollments', document: enrollment });
        enrollments.push(enrollment);
      }
      for (const enrollment of enrollments) learningAndReview(plan, state, byUser.get(id(enrollment.userId))!, course, enrollment);
      plan.courses.push({ id: id(course._id), title: course.title, price: course.price, target, existing: current.length, newOwnership: needed });
    } catch (error) {
      plan.inserts.splice(operationStart);
      plan.blockers.push(`${course.title}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return plan;
}

export async function validatePlan(plan: ActivityPlan, models: Map<string, Model<mongoose.mongo.Document>>) {
  assert.equal(plan.blockers.length, 0, `Preflight blocked:\n${plan.blockers.join('\n')}`);
  const ids = new Set<string>();
  for (const insert of plan.inserts) {
    const key = `${insert.collection}:${id(insert.document._id)}`;
    assert(!ids.has(key), `Duplicate planned ID: ${key}`); ids.add(key);
    const model = models.get(insert.collection);
    assert(model, `No real schema registered: ${insert.collection}`);
    const document = new model(insert.document);
    await document.validate();
    insert.document = document.toObject({ versionKey: false }) as Row;
  }
}

/** Narrow index migration: establish the replacement uniqueness BEFORE removing only the legacy constraint. */
export async function ensureInternalPaymentIndexes(db: mongoose.mongo.Db) {
  const payments = db.collection('payments');
  assert.equal(await payments.countDocuments({
    source: { $ne: 'INTERNAL_SEED' },
    $or: [{ sepayTransactionId: { $not: { $type: 'string' } } }, { sepayTransactionId: '' }],
  }), 0, 'Legacy bank identifiers are missing/not strings; audit them before changing the uniqueness index');
  await payments.createIndex({ sepayTransactionId: 1 }, {
    unique: true, partialFilterExpression: { sepayTransactionId: { $type: 'string' } }, name: 'unique_sepay_transaction',
  });
  await payments.createIndex({ internalReference: 1 }, {
    unique: true, partialFilterExpression: { internalReference: { $type: 'string' } }, name: 'unique_internal_payment_reference',
  });
  for (const index of await payments.listIndexes().toArray()) {
    if (index.name === 'unique_sepay_transaction') continue;
    if (Object.keys(index.key).length === 1 && index.key.sepayTransactionId === 1 && index.unique && !index.partialFilterExpression && !index.sparse) {
      assert(index.name === 'sepayTransactionId_1', `Unexpected index; inspect manually: ${index.name}`);
      await payments.dropIndex(index.name);
    }
  }
}

export async function writePlan(plan: ActivityPlan, connection: Connection, models: Map<string, Model<mongoose.mongo.Document>>, session: ClientSession) {
  assert.equal(plan.blockers.length, 0);
  const counts: Record<string, number> = {};
  // Ordered inserts in a single transaction; no external services or payment HTTP calls.
  for (const name of ['orders', 'payments', 'enrollments', 'lesson_quiz_answers', 'lesson_video_completions', 'learning_progress', 'reviews']) {
    const docs = plan.inserts.filter(insert => insert.collection === name).map(insert => insert.document);
    if (docs.length) await connection.db!.collection(name).insertMany(docs, { session, ordered: true });
    counts[name] = docs.length;
  }
  const reviews = new ReviewRepository(models.get('reviews') as unknown as ConstructorParameters<typeof ReviewRepository>[0]);
  const courses = new CourseRepository(models.get('courses') as unknown as ConstructorParameters<typeof CourseRepository>[0]);
  for (const course of plan.courses) {
    if (!plan.inserts.some(insert => insert.collection === 'reviews' && id(insert.document.courseId) === course.id)) continue;
    const stats = await reviews.calculateCourseReviewStats(course.id, session);
    await courses.updateRatingStats(course.id, stats.averageRating, stats.totalReviews, session);
  }
  return counts;
}

/** Independent checks over stored documents, not a successful-script flag. */
export function verifyState(state: State, cutoff: Date, targets: Record<string, number>, baseline: Baseline[]) {
  const errors: string[] = [];
  const check = (condition: unknown, message: string) => { if (!condition) errors.push(message); };
  try { assertBaselineUnchanged(state, baseline); } catch (error) { errors.push(String(error)); }
  const users = new Map(state.users.map(row => [id(row._id), row]));
  const courses = new Map(state.courses.map(row => [id(row._id), row]));
  const orders = new Map(state.orders.map(row => [id(row._id), row]));
  for (const name of ['enrollments', 'reviews'] as const) {
    const pairs = state[name].filter(active).map(pair);
    check(new Set(pairs).size === pairs.length, `Duplicate active ${name}`);
  }
  const seeded = Object.fromEntries(COLLECTIONS.map(name => [name, state[name].filter(row => row.seedBatch === BATCH)])) as State;
  for (const name of COLLECTIONS) for (const row of seeded[name]) {
    check(within(row.createdAt, cutoff) && within(row.updatedAt, cutoff) && ms(row.updatedAt) >= ms(row.createdAt), `Invalid ${name} timestamps: ${id(row._id)}`);
    check(!!row.seedReference && row.deletedAt == null, `Invalid seed provenance/deletion: ${name}/${id(row._id)}`);
    const linkedOrder = name === 'payments' ? orders.get(id(row.orderId)) : undefined;
    const user = users.get(id(row.userId ?? linkedOrder?.userId)), course = courses.get(id(row.courseId ?? linkedOrder?.courseId));
    check(!!user && student(user), `Invalid student on ${name}/${id(row._id)}`);
    check(!!course && active(course) && id(course.instructorId) !== id(user?._id), `Invalid course/author on ${name}/${id(row._id)}`);
    check(ms(row.createdAt) >= ms(user?.createdAt) && ms(row.createdAt) >= ms(course?.createdAt), `Record precedes user/course: ${name}/${id(row._id)}`);
  }
  const perCourse = state.courses.filter(active).map(course => {
    const enrolled = state.enrollments.filter(row => active(row) && id(row.courseId) === id(course._id) && within(row.enrolledAt, cutoff));
    const eligible = enrolled.filter(row => { const user = users.get(id(row.userId)); return user && student(user); });
    const target = targets[id(course._id)];
    check(target === 5 || target === 6, `Missing target for ${course.title}`);
    check(eligible.length === Math.max(target, 5) && eligible.length <= 6, `Owner target mismatch: ${course.title} (${eligible.length}/${target})`);
    for (const enrollment of eligible) {
      const review = state.reviews.find(row => active(row) && pair(row) === pair(enrollment));
      check(!!review, `Missing review: ${pair(enrollment)}`);
      if (!review) continue;
      check(Number.isInteger(review.rating) && review.rating >= 1 && review.rating <= 5 && !!review.comment?.trim(), `Invalid review: ${id(review._id)}`);
      check(ms(review.createdAt) >= ms(enrollment.enrolledAt) && ms(review.createdAt) <= ms(cutoff), `Review before enrollment/future: ${id(review._id)}`);
      const lessons = curriculum(state, course);
      const summaries = lessons.videos.map(lesson => {
        const quizzes = lessons.quizzes(lesson);
        const answers = state.lesson_quiz_answers.filter(row => active(row) && pair(row) === pair(enrollment) && id(row.lessonId) === id(lesson._id));
        const completeQuiz = quizzes.length > 0 && quizzes.every(quiz => answers.some(answer => id(answer.quizId) === id(quiz._id)
          && answer.quizRevision === quizRevision(quiz as unknown as ILessonQuiz) && ms(answer.submittedAt) <= ms(review.createdAt)));
        const video = state.lesson_video_completions.find(row => active(row) && pair(row) === pair(enrollment)
          && id(row.lessonId) === id(lesson._id) && row.mediaVersion === contentVersion({ url: lesson.content.url, publicId: lesson.content.publicId ?? null })
          && ms(row.endedAt) <= ms(review.createdAt));
        return { lessonId: id(lesson._id), status: (quizzes.length ? completeQuiz : !!video) ? LearningStatusEnum.COMPLETED : LearningStatusEnum.NOT_STARTED,
          totalQuestions: quizzes.length, completedQuestions: completeQuiz ? quizzes.length : 0 };
      });
      const progress = summarizeProgress(id(course._id), null, {
        courseId: id(course._id), videoCount: lessons.videos.length, missingDurationCount: 0,
        totalSeconds: lessons.videos.reduce((sum, row) => sum + row.content.duration, 0),
        videos: lessons.videos.map(row => ({ lessonId: id(row._id), url: row.content.url, publicId: row.content.publicId ?? null, durationSeconds: row.content.duration })),
      }, summaries);
      check((progress.progressPercent ?? 0) > 20, `Review without >20% completion: ${id(review._id)}`);
      if (enrollment.orderId) {
        const order = orders.get(id(enrollment.orderId));
        check(order?.status === 'PAID' && pair(order) === pair(enrollment) && order.amount > 0, `Invalid enrollment order: ${id(enrollment._id)}`);
      } else check(course.price === 0, `Paid course has free enrollment: ${id(enrollment._id)}`);
    }
    const visible = state.reviews.filter(row => active(row) && row.status === 'visible' && id(row.courseId) === id(course._id));
    const rating = visible.length ? Math.round(visible.reduce((sum, row) => sum + row.rating, 0) / visible.length * 10) / 10 : 0;
    check(course.reviewCount === visible.length && course.ratingAvg === rating, `Stale rating cache: ${course.title}`);
    return { course: course.title, target, eligibleOwners: eligible.length, historicalExcludedOwners: enrolled.length - eligible.length,
      seededPaid: seeded.orders.filter(row => id(row.courseId) === id(course._id)).length,
      seededFree: seeded.enrollments.filter(row => id(row.courseId) === id(course._id) && !row.orderId).length,
      reviews: visible.length, averageRating: rating };
  });
  for (const order of seeded.orders) {
    const payment = seeded.payments.filter(row => id(row.orderId) === id(order._id));
    const enrollment = seeded.enrollments.filter(row => id(row.orderId) === id(order._id));
    check(payment.length === 1 && enrollment.length === 1, `Order missing/duplicating payment or ownership: ${order.orderCode}`);
    check(order.status === 'PAID' && order.paymentMethod === 'INTERNAL_SEED' && !order.pendingCheckoutKey, `Invalid internal order: ${order.orderCode}`);
    check(order.amount > 0 && Number.isSafeInteger(order.amount) && order.amount === order.receivedAmount, `Invalid order money: ${order.orderCode}`);
    check(order.platformEarnings === Math.round(order.amount * order.platformCommissionRate / 100)
      && order.platformEarnings + order.instructorEarnings === order.amount
      && order.instructorCommissionRate === Number((1 - order.platformCommissionRate / 100).toFixed(4))
      && order.originalPrice - order.discountAmount === order.amount, `Financial snapshot mismatch: ${order.orderCode}`);
    check(ms(order.createdAt) <= ms(order.paidAt) && ms(order.paidAt) <= ms(order.expiresAt) && within(order.paidAt, cutoff), `Invalid paid date: ${order.orderCode}`);
    check(id(order.instructorId) === id(courses.get(id(order.courseId))?.instructorId), `Instructor mismatch: ${order.orderCode}`);
  }
  for (const payment of seeded.payments) {
    const order = orders.get(id(payment.orderId));
    check(!!order && order.seedBatch === BATCH && order.amount === payment.amountIn && order.orderCode === payment.orderCode, `Orphan/mismatched seed payment: ${id(payment._id)}`);
    check(payment.source === 'INTERNAL_SEED' && payment.internalReference && payment.reconciliationStatus === 'MATCHED'
      && !payment.sepayTransactionId && !payment.verifiedAt && !payment.payloadHash && !payment.accountNumber && !payment.bankBrandName, `Fake bank evidence: ${id(payment._id)}`);
    check(ms(payment.transactionDate) === ms(order?.paidAt) && ms(payment.appliedAt) === ms(payment.transactionDate), `Payment date mismatch: ${id(payment._id)}`);
  }
  for (const answer of seeded.lesson_quiz_answers) {
    const quiz = state.lesson_quizzes.find(row => id(row._id) === id(answer.quizId));
    check(!!quiz && answer.quizRevision === quizRevision(quiz as unknown as ILessonQuiz), `Invalid quiz reference/version: ${id(answer._id)}`);
    check(!!quiz && answer.selectedOptionIds.every((option: string) => quiz.options.some((item: { id: string }) => item.id === option)), `Invalid answer options: ${id(answer._id)}`);
    check(ms(answer.submittedAt) === ms(answer.createdAt) && ms(answer.createdAt) >= ms(quiz?.createdAt), `Answer precedes quiz: ${id(answer._id)}`);
  }
  const counts = Object.fromEntries(COLLECTIONS.map(name => [name, seeded[name].length]));
  const revenue = (items: Row[]) => items.reduce((sum, row) => sum + row.amount, 0);
  const paid = state.orders.filter(row => active(row) && row.status === 'PAID' && within(row.paidAt, cutoff));
  const byDay: Record<string, { paid: number; free: number; revenue: number }> = {};
  for (const enrollment of seeded.enrollments) {
    const date = new Date(ms(enrollment.enrolledAt) + 7 * 3_600_000).toISOString().slice(0, 10);
    const bucket = byDay[date] ??= { paid: 0, free: 0, revenue: 0 };
    if (enrollment.orderId) { bucket.paid++; bucket.revenue += orders.get(id(enrollment.orderId))?.amount ?? 0; } else bucket.free++;
  }
  return {
    ok: errors.length === 0, errors, counts, perCourse,
    grossSeedRevenue: revenue(seeded.orders), seedPlatformRevenue: seeded.orders.reduce((sum, row) => sum + row.platformEarnings, 0),
    seedInstructorRevenue: seeded.orders.reduce((sum, row) => sum + row.instructorEarnings, 0),
    allPaidRevenueInWindow: revenue(paid), allPaidOrdersInWindow: paid.length,
    freeSeedEnrollments: seeded.enrollments.filter(row => !row.orderId).length,
    existingRecordsVerifiedUnchanged: baseline.length,
    ratingDistribution: Object.fromEntries([1, 2, 3, 4, 5].map(rating => [rating, seeded.reviews.filter(row => row.rating === rating).length])),
    byDay: Object.fromEntries(Object.entries(byDay).sort()),
  };
}
