import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { BATCH, COLLECTIONS, START, END, buildPlan, purchaseTime, targetFor, baselineFor, assertBaselineUnchanged, type State } from './core.js';

const oid = (n: number) => new mongoose.Types.ObjectId(n.toString(16).padStart(24, '0'));
function fixture(): State {
  const state = Object.fromEntries(COLLECTIONS.map(name => [name, []])) as unknown as State;
  const createdAt = new Date('2026-11-12T22:00:00+07:00');
  state.users = Array.from({ length: 9 }, (_, index) => ({
    _id: oid(index + 1), fullName: `Existing ${index}`, createdAt, deletedAt: null,
    role: index === 0 ? 'instructor' : 'student', status: 'active',
  }));
  state.courses = [0, 2000].map((price, index) => ({
    _id: oid(20 + index), title: `Existing course ${index}`, slug: `course-${index}`, price,
    instructorId: oid(1), status: 'published', createdAt, deletedAt: null, ratingAvg: 0, reviewCount: 0,
  }));
  for (const [index, course] of state.courses.entries()) {
    state.sections.push({ _id: oid(30 + index), courseId: course._id, createdAt, deletedAt: null });
    for (let lesson = 0; lesson < 2; lesson++) state.lessons.push({
      _id: oid(40 + index * 2 + lesson), sectionId: oid(30 + index), order: lesson, createdAt, deletedAt: null,
      content: { type: 'video', url: `https://media.invalid/${index}/${lesson}`, duration: 60 },
    });
  }
  return state;
}
const cutoff = new Date('2026-11-23T09:00:00+07:00');

describe('Activity history planning is non-destructive and repeatable', () => {
  it('queries existing references, generates valid varied targets, and never creates users/courses', () => {
    const state = fixture(), original = structuredClone(state);
    const plan = buildPlan(state, cutoff);
    expect(plan.blockers).toEqual([]);
    expect(plan.inserts.some(row => ['users', 'courses', 'sections', 'lessons'].includes(row.collection))).toBe(false);
    expect(state).toEqual(original);
    expect(new Set(Array.from({ length: 100 }, (_, n) => targetFor(String(n))))).toEqual(new Set([5, 6]));
    const payments = plan.inserts.filter(row => row.collection === 'payments');
    expect(payments.length).toBeGreaterThan(0);
    for (const { document } of payments) {
      expect(document.source).toBe('INTERNAL_SEED');
      expect(document).not.toHaveProperty('sepayTransactionId');
      expect(document).not.toHaveProperty('verifiedAt');
      expect(document).not.toHaveProperty('payloadHash');
      expect(document.accountNumber).toBe('');
    }
    for (const { document } of plan.inserts.filter(row => row.collection === 'enrollments' && row.document.courseId.equals(state.courses[0]._id))) {
      expect(document.orderId).toBeNull();
    }
  });
  it('does not add data on a second plan, and freezes the 5/6 target', () => {
    const state = fixture(), plan = buildPlan(state, cutoff);
    for (const insert of plan.inserts) state[insert.collection as keyof State].push(insert.document);
    const again = buildPlan(state, cutoff, plan.targets);
    expect(again.blockers).toEqual([]);
    expect(again.inserts).toEqual([]);
    expect(again.targets).toEqual(plan.targets);
  });
  it('reports exact shortages instead of creating or resurrecting users', () => {
    const state = fixture();
    state.users = state.users.slice(0, 3);
    state.users.push({ ...state.users[2], _id: oid(100), deletedAt: new Date() });
    const plan = buildPlan(state, cutoff);
    expect(plan.blockers).toHaveLength(2);
    expect(plan.blockers[0]).toMatch(/Missing [34] eligible students/);
    expect(plan.inserts).toEqual([]);
  });
  it('excludes historical enrollment belonging to a soft-deleted instructor from student quotas', () => {
    const state = fixture();
    state.users.push({ ...state.users[0], _id: oid(101), deletedAt: new Date() });
    state.enrollments.push({ _id: oid(102), userId: oid(101), courseId: state.courses[0]._id, enrolledAt: cutoff, deletedAt: null });
    expect(buildPlan(state, cutoff).courses[0].existing).toBe(0);
  });
  it('never overwrites an existing review or learning state', () => {
    const state = fixture(), first = buildPlan(state, cutoff);
    for (const insert of first.inserts) state[insert.collection as keyof State].push(insert.document);
    state.reviews[0].comment = 'A real student edit';
    expect(buildPlan(state, cutoff, first.targets).inserts).toEqual([]);
    expect(state.reviews[0].comment).toBe('A real student edit');
  });
  it('stops for unpublished courses and changed historical commission policy', () => {
    const state = fixture();
    state.courses[0].status = 'draft';
    state.commission_histories.push({ _id: oid(105), deletedAt: null });
    const plan = buildPlan(state, cutoff);
    expect(plan.blockers).toHaveLength(2);
    expect(plan.inserts).toEqual([]);
  });
  it('detects modification of original financial rows while allowing rating-cache updates', () => {
    const state = fixture(), baseline = baselineFor(state);
    state.courses[0].ratingAvg = 4;
    state.courses[0].reviewCount = 5;
    expect(() => assertBaselineUnchanged(state, baseline)).not.toThrow();
    state.users[0].fullName = 'Unwanted edit';
    expect(() => assertBaselineUnchanged(state, baseline)).toThrow('Existing data changed');
  });
  it('stratifies dates across feasible days and respects creation dates and cutoff', () => {
    const earliest = new Date('2026-11-12T22:33:33+07:00');
    const dates = Array.from({ length: 12 }, (_, index) => purchaseTime(String(index), earliest, cutoff, index));
    expect(new Set(dates.map(date => new Date(date.getTime() + 7 * 3600000).toISOString().slice(0, 10))).size).toBe(12);
    for (const date of dates) {
      expect(date >= earliest && date <= cutoff).toBe(true);
    }
    expect(() => purchaseTime('invalid', END, START, 0)).toThrow();
  });
  it('keeps all review dates after ownership and completion, with 1–5 stars', () => {
    const state = fixture(), plan = buildPlan(state, cutoff);
    const enrollments = plan.inserts.filter(row => row.collection === 'enrollments');
    for (const { document: review } of plan.inserts.filter(row => row.collection === 'reviews')) {
      const enrollment = enrollments.find(row => row.document.userId.equals(review.userId) && row.document.courseId.equals(review.courseId))!.document;
      expect(review.createdAt >= enrollment.enrolledAt && review.createdAt <= cutoff).toBe(true);
      expect(review.rating >= 1 && review.rating <= 5 && Number.isInteger(review.rating)).toBe(true);
      expect(review.seedBatch).toBe(BATCH);
    }
  });
});
