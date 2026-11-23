import 'reflect-metadata';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { JwtService } from '@nestjs/jwt';
import mongoose from 'mongoose';
import { BATCH, START, RUNS, readState, verifyState, id, active, type Baseline, type Row } from './activity-history/core.js';

// Read-only local maintenance verification. Tokens are short-lived, are signed by
// the application's configured JWT provider, and are never logged or persisted.
// No auth guard is disabled, and the server still resolves the existing account
// and its role. This avoids changing passwords, verification flags, or sessions.
assert(process.argv.includes('--local-read-tokens'), 'Requires --local-read-tokens for existing-account, local GET-only checks');
assert(process.env.MONGODB_URI && process.env.JWT_SECRET, 'Load backend/.env first');
const base = (process.env.ACTIVITY_API_URL || 'http://localhost:8000/api/v1').replace(/\/$/, '');
assert(['localhost', '127.0.0.1', '[::1]'].includes(new URL(base).hostname), 'Never send maintenance tokens to a remote host');
const client = new mongoose.mongo.MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10_000 });
const jwt = new JwtService();
const calls: Array<{ path: string; role: string; status: number }> = [];
const sum = (rows: Row[], field: string) => rows.reduce((total, row) => total + (row[field] ?? 0), 0);
try {
  await client.connect();
  const db = client.db(process.env.MONGODB_DB_NAME || 'thc_datn');
  const run = await db.collection<{ _id: string; cutoff: Date; targets: Record<string, number>; baseline: Baseline[] }>(RUNS).findOne({ _id: BATCH });
  assert(run, 'Commit the seed batch before verifying API data');
  const state = await readState(db);
  const result = verifyState(state, run.cutoff, run.targets, run.baseline as Baseline[]);
  assert(result.ok, result.errors.join('\n'));
  const users = state.users.filter(row => active(row) && row.status === 'active');
  const admin = users.find(row => row.role === 'admin');
  assert(admin, 'Existing administrator required');
  async function token(user: Row) {
    return jwt.signAsync({ sub: id(user._id), email: user.email, role: user.role }, { secret: process.env.JWT_SECRET, expiresIn: 120 });
  }
  async function get(path: string, user?: Row) {
    assert(!/webhook|\/reprocess|\/resolve|\/auth\//.test(path), 'Only business read endpoints may be verified');
    const response = await fetch(`${base}${path}`, {
      headers: user ? { Authorization: `Bearer ${await token(user)}` } : {},
      signal: AbortSignal.timeout(30_000),
    });
    calls.push({ path, role: user?.role ?? 'public', status: response.status });
    const body = await response.json();
    assert.equal(response.status, 200, `${path}: ${response.status} ${JSON.stringify(body)}`);
    assert.equal(body.success, true, `${path}: unsuccessful API envelope`);
    return body.data;
  }
  const params = new URLSearchParams({ startDate: START.toISOString(), endDate: run.cutoff.toISOString() });
  const dashboardQuery = `period=custom&${params}`;
  const revenueQuery = `timeRange=custom&${params}`;
  const paid = state.orders.filter(row => active(row) && row.status === 'PAID' && row.paidAt >= START && row.paidAt <= run.cutoff);
  const enrolled = state.enrollments.filter(row => active(row) && row.enrolledAt >= START && row.enrolledAt <= run.cutoff);
  const overview = await get(`/payments/revenue/overview?${revenueQuery}`, admin);
  assert.equal(overview.totalRevenue, sum(paid, 'amount'));
  assert.equal(overview.platformCommission, sum(paid, 'platformEarnings'));
  assert.equal(overview.instructorEarnings, sum(paid, 'instructorEarnings'));
  assert.equal(overview.successfulOrders, paid.length);
  const dashboard = await get(`/admin/dashboard/aggregate?${dashboardQuery}`, admin);
  assert.equal(dashboard.kpis.grossRevenue.cur, overview.totalRevenue);
  assert.equal(dashboard.kpis.platformRevenue.cur, overview.platformCommission);
  assert.equal(dashboard.kpis.instructorRevenue.cur, overview.instructorEarnings);
  assert.equal(dashboard.kpis.enrollments.cur, enrolled.length);
  assert.equal(dashboard.kpis.enrollments.paid, enrolled.filter(row => !!row.orderId).length);
  assert.equal(dashboard.kpis.enrollments.free, enrolled.filter(row => !row.orderId).length);
  for (const groupBy of ['day', 'month']) {
    const chart = await get(`/admin/dashboard/chart?${dashboardQuery}&groupBy=${groupBy}`, admin);
    assert.equal(sum(chart, 'grossRevenue'), overview.totalRevenue);
    assert.equal(sum(chart, 'platformRevenue'), overview.platformCommission);
    assert.equal(sum(chart, 'instructorRevenue'), overview.instructorEarnings);
    assert.equal(sum(chart, 'orderCount'), paid.length);
    for (const point of chart) {
      const rows = paid.filter(row => new Date(row.paidAt.getTime() + 7 * 3_600_000).toISOString().slice(0, groupBy === 'day' ? 10 : 7) === point.date);
      assert.equal(point.grossRevenue, sum(rows, 'amount'), `Chart bucket mismatch: ${point.date}`);
    }
  }
  const revenueChart = await get(`/payments/revenue/chart?${revenueQuery}`, admin);
  assert.equal(sum(revenueChart, 'totalRevenue'), overview.totalRevenue);
  const coursePerformance = await get(`/admin/dashboard/courses/performance?${dashboardQuery}&tab=enrollment&limit=100`, admin);
  assert.equal(coursePerformance.length, state.courses.filter(active).length);
  for (const course of state.courses.filter(active)) {
    const row = coursePerformance.find((value: { id: string }) => value.id === id(course._id));
    assert(row, `Missing performance: ${course.title}`);
    const orders = paid.filter(value => id(value.courseId) === id(course._id));
    assert.equal(row.salesCount, orders.length);
    assert.equal(row.revenue, sum(orders, 'amount'));
    assert.equal(row.newEnrollments, enrolled.filter(value => id(value.courseId) === id(course._id)).length);
    assert.equal(row.reviewCount, course.reviewCount);
    assert.equal(row.rating, course.ratingAvg);
    if (course.price === 0) { assert.equal(row.salesCount, 0); assert.equal(row.revenue, 0); }
    const stats = await get(`/reviews/courses/${id(course._id)}/stats`);
    assert.equal(stats.totalReviews, course.reviewCount);
    assert.equal(stats.averageRating, course.ratingAvg);
    const reviews = await get(`/reviews/courses/${id(course._id)}?page=1&limit=50`);
    assert.equal(reviews.total, course.reviewCount);
  }
  const ranking = await get(`/admin/dashboard/instructors/ranking?${dashboardQuery}&limit=5`, admin);
  assert.equal(ranking.length, Math.min(5, users.filter(row => row.role === 'instructor').length));
  let previous = Infinity;
  for (const row of ranking) {
    const orders = paid.filter(order => id(order.instructorId) === row.id);
    assert.equal(row.grossRevenue, sum(orders, 'amount'));
    assert.equal(row.netRevenue, sum(orders, 'instructorEarnings'));
    assert.equal(row.salesCount, orders.length);
    assert(row.grossRevenue <= previous); previous = row.grossRevenue;
  }
  const reviewStats = await get('/reviews/admin/stats', admin);
  assert.equal(reviewStats.total, state.reviews.length);
  assert.equal(reviewStats.visibleCount, state.reviews.filter(row => active(row) && row.status === 'visible').length);
  const reviewList = await get('/reviews/admin?page=1&limit=100', admin);
  assert.equal(reviewList.total, reviewStats.visibleCount);
  const transactions = await get(`/payments/revenue/transactions?${revenueQuery}&status=MATCHED&page=1&limit=100`, admin);
  assert.equal(transactions.total, paid.length);
  for (const order of paid.filter(row => row.seedBatch === BATCH)) {
    const detail = await get(`/payments/revenue/transactions/${order.orderCode}`, admin);
    assert.equal(detail.paymentMethod, 'INTERNAL_SEED');
    assert.equal(detail.sepayTransactionId, null);
    assert.equal(detail.amountDue, order.amount);
    assert.equal(detail.amountPaid, order.amount);
    assert.equal(detail.platformEarnings + detail.instructorEarnings, order.amount);
  }
  const instructorResults: Array<Record<string, unknown>> = [];
  for (const instructor of users.filter(row => row.role === 'instructor')) {
    const orders = paid.filter(row => id(row.instructorId) === id(instructor._id));
    const myCourses = state.courses.filter(row => active(row) && id(row.instructorId) === id(instructor._id));
    const reviews = state.reviews.filter(row => active(row) && row.status === 'visible' && myCourses.some(course => id(course._id) === id(row.courseId)));
    const stats = await get(`/instructor/teaching-stats/overview?${revenueQuery}`, instructor);
    assert.equal(stats.totalRevenue, sum(orders, 'amount'));
    assert.equal(stats.instructorEarnings, sum(orders, 'instructorEarnings'));
    assert.equal(stats.successfulSales, orders.length);
    assert.equal(stats.totalReviews, reviews.length);
    assert.equal(stats.averageRating, reviews.length ? Math.round(sum(reviews, 'rating') / reviews.length * 10) / 10 : 0);
    const courseList = await get(`/instructor/teaching-stats/courses?${revenueQuery}&limit=100`, instructor);
    assert.equal(courseList.total, myCourses.length);
    assert.equal(sum(courseList.items, 'totalRevenue'), stats.totalRevenue);
    assert.equal(sum(courseList.items, 'successfulSales'), stats.successfulSales);
    const recent = await get('/reviews/instructor?page=1&limit=100', instructor);
    assert.equal(recent.total, reviews.length);
    assert(recent.items.every((row: { courseId: string }) => myCourses.some(course => id(course._id) === row.courseId)));
    const today = await get('/instructor/teaching-stats/overview?timeRange=today', instructor);
    const todayKey = new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10);
    const todayOrders = orders.filter(row => new Date(row.paidAt.getTime() + 7 * 3_600_000).toISOString().slice(0, 10) === todayKey);
    assert.equal(today.totalRevenue, sum(todayOrders, 'amount'));
    instructorResults.push({ name: instructor.fullName, revenue: stats.totalRevenue, earnings: stats.instructorEarnings, sales: stats.successfulSales, reviews: stats.totalReviews, todayRevenue: today.totalRevenue });
  }
  let studentOwnershipChecks = 0;
  for (const user of users.filter(row => row.role === 'student')) {
    const owned = state.enrollments.filter(row => active(row) && id(row.userId) === id(user._id));
    const myCourses = await get('/enrollments/my-courses', user);
    assert.equal(myCourses.length, owned.length);
    const progress = await get('/learning-progress/my-courses', user);
    for (const enrollment of owned.filter(row => row.seedBatch === BATCH)) {
      const p = progress.find((row: { courseId: string }) => row.courseId === id(enrollment.courseId));
      assert(p && p.progressPercent > 20, `Real progress API rejected learning evidence: ${id(enrollment._id)}`);
      const eligibility = await get(`/reviews/courses/${id(enrollment.courseId)}/eligibility`, user);
      assert(eligibility.isEnrolled && eligibility.hasReviewed && !eligibility.canReview);
      studentOwnershipChecks++;
    }
  }
  // Authentication/GET calls must not alter any preexisting business records.
  const after = verifyState(await readState(db), run.cutoff, run.targets, run.baseline as Baseline[]);
  assert(after.ok, after.errors.join('\n'));
  const report = {
    ok: true, database: db.databaseName, batch: BATCH, checkedAt: new Date(),
    authentication: 'short-lived configured JWT, existing users, GET only; no session/password/user changes',
    httpRequests: calls.length, non200: calls.filter(row => row.status !== 200), overview,
    dashboardEnrollments: dashboard.kpis.enrollments,
    courseChecks: coursePerformance.length, studentAccountsChecked: users.filter(row => row.role === 'student').length,
    studentOwnershipChecks, instructorResults, calls,
  };
  const output = join(process.env.LOCALAPPDATA || 'C:/Users/cuong/AppData/Local', 'Temp', 'opencode', 'activity-history');
  await mkdir(output, { recursive: true });
  await writeFile(join(output, 'api-verification.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ...report, calls: undefined, report: join(output, 'api-verification.json') }, null, 2));
} finally { await client.close(); }
