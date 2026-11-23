import { randomUUID } from 'node:crypto';
import mongoose, { Types, type Connection } from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { OrderStatusEnum, RoleEnum, UserStatusEnum } from 'share-lib';
import { OrderEntity, OrderSchema } from '../../enrollment/schemas/order.schema.js';
import { OrderRepository } from '../../enrollment/repositories/order.repository.js';
import { InstructorRevenueReadRepository } from '../../payment/repositories/instructor-revenue-read.repository.js';
import { InstructorRevenueDataError } from '../../payment/utils/instructor-revenue.pipeline.js';

describe.skipIf(process.env.CHATBOT_SEARCH_DB_TESTS !== 'true')('Instructor revenue — real Mongo, historical attribution and no writes', () => {
  const dbName = `chatbot_revenue_test_${randomUUID().replaceAll('-', '')}`;
  const a = new Types.ObjectId();
  const b = new Types.ObjectId();
  const courses = Array.from({ length: 8 }, () => new Types.ObjectId());
  const start = new Date('2026-11-01T00:00:00+07:00');
  const end = new Date('2026-11-22T15:15:00+07:00');
  const paidAt = new Date('2026-11-12T10:00:00+07:00');
  let connection: Connection;
  let repo: InstructorRevenueReadRepository;
  let existing: OrderRepository;
  let baseline: unknown;
  const snapshot = async () => Promise.all(['orders', 'payments', 'courses', 'users']
    .map(async (name) => [name, await connection.collection(name).find({}).sort({ _id: 1 }).toArray()]));
  const fixture = (fields: Record<string, unknown> = {}) => ({
    _id: new Types.ObjectId(), instructorId: a, userId: new Types.ObjectId(), courseId: courses[0],
    status: OrderStatusEnum.PAID, amount: 200000, paidAt, deletedAt: null, createdAt: new Date('2026-10-01'),
    ...fields,
  });
  async function withOrder(fields: Record<string, unknown>, check: () => Promise<void>) {
    const order = fixture(fields);
    await connection.collection('orders').insertOne(order);
    try { await check(); } finally { await connection.collection('orders').deleteOne({ _id: order._id }); }
  }
  beforeAll(async () => {
    const uri = process.env.CHATBOT_DB_TEST_URI ?? 'mongodb://127.0.0.1:27017';
    if (!/^mongodb:\/\/(?:127\.0\.0\.1|localhost)(?=[:/])/.test(uri)) throw new Error('Loopback fixture Mongo required');
    connection = await mongoose.createConnection(uri, { dbName, autoIndex: false, autoCreate: false, serverSelectionTimeoutMS: 3000 }).asPromise();
    const model = connection.model(OrderEntity.name, OrderSchema);
    repo = new InstructorRevenueReadRepository(model);
    existing = new OrderRepository(model);
    await connection.collection('users').insertMany([a, b].map((_id) => ({
      _id, role: RoleEnum.INSTRUCTOR, status: UserStatusEnum.ACTIVE, deletedAt: null, commissionRate: 99,
    })));
    await connection.collection('courses').insertMany(courses.map((_id, index) => ({
      _id, title: ['React cơ bản', 'React nâng cao', 'Khóa ẩn', 'Khóa đã xóa', 'Khóa chuyển tác giả', 'Legacy tác giả', 'Chưa có đơn', 'Của người khác'][index],
      instructorId: index === 4 || index === 7 ? b : a, deletedAt: index === 3 ? new Date() : null,
      status: index === 2 ? 'DRAFT' : 'PUBLISHED', price: 99999999,
    })));
    const legacy = fixture({ courseId: courses[1], paidAt: null, amount: 50000, instructorEarnings: 35000, platformEarnings: 15000 });
    await connection.collection('orders').insertMany([
      fixture({ instructorEarnings: 140000, platformEarnings: 60000, receivedAmount: 900000, platformCommissionRate: 30 }),
      fixture({ amount: 101, platformCommissionRate: 50 }),
      fixture({ courseId: courses[1], amount: 300000, instructorEarnings: 240000, platformEarnings: 60000, platformCommissionRate: 20 }),
      fixture({ courseId: courses[2], amount: 100000, platformEarnings: 25000 }),
      fixture({ courseId: courses[3], amount: 70000, instructorEarnings: 70000, platformEarnings: 0 }),
      fixture({ courseId: courses[4], amount: 50000, instructorEarnings: 40000, platformEarnings: 10000 }),
      fixture({ courseId: courses[5], instructorId: null, amount: 10000, instructorEarnings: 8000, platformEarnings: 2000 }),
      fixture({ instructorId: b, amount: 999999, instructorEarnings: 888888, platformEarnings: 111111 }),
      fixture({ amount: 0 }), fixture({ status: OrderStatusEnum.PENDING }), fixture({ status: OrderStatusEnum.CANCELLED }),
      fixture({ status: OrderStatusEnum.EXPIRED }), fixture({ deletedAt: new Date() }),
      fixture({ amount: 100000, instructorEarnings: 70000, platformEarnings: 30000, paidAt: new Date('2026-10-31T10:00:00+07:00') }),
      fixture({ amount: 100000, instructorEarnings: 70000, platformEarnings: 30000, paidAt: new Date('2026-11-25T10:00:00+07:00') }),
      legacy,
    ]);
    await connection.collection('payments').insertMany([
      { orderId: legacy._id, deletedAt: null, verifiedAt: paidAt, appliedAt: paidAt, transactionDate: new Date('2026-11-19T10:00:00+07:00') },
      // A duplicate/extra transfer is not another purchase and cannot move the paid date.
      { orderId: legacy._id, deletedAt: null, verifiedAt: paidAt, appliedAt: null, transactionDate: new Date('2026-11-21T10:00:00+07:00') },
    ]);
    baseline = await snapshot();
  });
  afterAll(async () => {
    if (connection) { await connection.dropDatabase(); await connection.close(); }
  });
  it('counts PAID orders once, ignores free/pending/deleted orders, excess transfers and current rates/prices', async () => {
    expect(await repo.summary(String(a), start, end)).toEqual({
      totalRevenue: 780101, instructorEarnings: 608050, platformCommission: 172051, successfulSales: 8, reconstructedOrders: 1,
    });
  });
  it('matches the existing instructor KPI and per-course money projection exactly', async () => {
    const totals = await repo.summary(String(a), start, end);
    const kpi = await existing.getInstructorRevenueKpi(String(a), start, new Date(end.getTime() - 1));
    expect(kpi).toMatchObject({ totalRevenue: totals.totalRevenue, instructorEarnings: totals.instructorEarnings, successfulSales: totals.successfulSales });
    const page = await existing.getInstructorCoursesRevenue(String(a), start, new Date(end.getTime() - 1), 1, 10);
    for (const item of page.items) {
      const exact = await repo.summary(String(a), start, end, item.id);
      expect(item.instructorEarnings).toBe(exact.instructorEarnings);
      expect(item.successfulSales).toBe(exact.successfulSales);
    }
  });
  it('never reattributes another instructor snapshot through a course now owned by the caller', async () => {
    expect((await repo.summary(String(a), start, end, String(courses[0]))).successfulSales).toBe(2);
    expect((await repo.summary(String(b), start, end, String(courses[0]))).instructorEarnings).toBe(888888);
    expect((await repo.summary(String(b), start, end, String(courses[4]))).successfulSales).toBe(0);
  });
  it('retains hidden/deleted/transferred course history and lists unsold own courses without fabricating sales', async () => {
    const found = await repo.courses(String(a), { page: 1, limit: 10 });
    expect(found.total).toBe(7);
    expect(found.items.map((c) => c.id)).not.toContain(String(courses[7]));
    expect((await repo.summary(String(a), start, end, String(courses[6]))).successfulSales).toBe(0);
    expect((await repo.courses(String(a), { keyword: 'React.*', page: 1, limit: 5 })).total).toBe(0);
  });
  it('ranks by purchase count, keeps equal ranks across pages, and totals all rows before paging', async () => {
    const first = await repo.topCourses(String(a), start, end, 1, 1);
    const second = await repo.topCourses(String(a), start, end, 2, 1);
    expect(first.total).toBe(6);
    expect(first.topTiedCount).toBe(2);
    expect(first.items[0]).toMatchObject({ id: String(courses[1]), rank: 1, successfulSales: 2 });
    expect(second.items[0]).toMatchObject({ id: String(courses[0]), rank: 1, successfulSales: 2 });
    expect(first.totals).toEqual(second.totals);
  });
  it('uses verified/applied bank payment time for legacy PAID rows, never createdAt', async () => {
    const beforeLegacy = await repo.summary(String(a), start, new Date('2026-11-19T00:00:00+07:00'), String(courses[1]));
    expect(beforeLegacy.successfulSales).toBe(1);
    expect((await repo.summary(String(a), start, end, String(courses[1]))).successfulSales).toBe(2);
  });
  it('compares both periods in a single aggregation using exact half-open time boundaries', async () => {
    const [current, previous] = await repo.compare(String(a), { start, endExclusive: end },
      { start: new Date('2026-10-01T00:00:00+07:00'), endExclusive: start });
    expect(current.successfulSales).toBe(8);
    expect(previous.instructorEarnings).toBe(70000);
    await withOrder({ paidAt: start, amount: 1, platformCommissionRate: 50 }, async () => {
      expect((await repo.summary(String(a), start, new Date(start.getTime() + 1))).successfulSales).toBe(1);
      expect((await repo.summary(String(a), new Date(start.getTime() - 1), start)).successfulSales).toBe(0);
    });
  });
  it.each([
    { instructorEarnings: -1 }, { instructorEarnings: '140000' }, { instructorEarnings: 140000, platformEarnings: 1 },
    { platformCommissionRate: 101 }, { instructorEarnings: 1.5 }, { amount: '200000', platformEarnings: 1 },
    { instructorEarnings: Number.MAX_SAFE_INTEGER + 1 }, {},
    { platformCommissionRate: 20, instructorCommissionRate: 0.7 },
    { platformCommissionRate: '30', instructorCommissionRate: 0.7 },
  ])('fails closed instead of defaulting a corrupt/missing snapshot to 30%%: %j', async (fields) => {
    await withOrder(fields, async () => {
      await expect(repo.summary(String(a), start, end)).rejects.toBeInstanceOf(InstructorRevenueDataError);
      await expect(repo.topCourses(String(a), start, end, 1, 1)).rejects.toBeInstanceOf(InstructorRevenueDataError);
    });
  });
  it('honors true zero net earnings and rounds each positive VND commission like checkout, not bankers rounding', async () => {
    await withOrder({ amount: 1, instructorEarnings: 0, platformEarnings: 1 }, async () => {
      expect((await repo.summary(String(a), start, end)).instructorEarnings).toBe(608050);
    });
    await withOrder({ amount: 5, platformCommissionRate: 50 }, async () => {
      const value = await repo.summary(String(a), start, end);
      expect(value.instructorEarnings).toBe(608052); // Math.round(2.5) = 3 commission, 2 net.
      expect(value.reconstructedOrders).toBe(2);
    });
  });
  it('treats a missing legacy deletedAt as active in both instructor views and rejects malformed course references', async () => {
    const order = fixture({ instructorEarnings: 140000, platformEarnings: 60000 });
    const { deletedAt: _deletedAt, ...legacy } = order;
    await connection.collection('orders').insertOne(legacy);
    try {
      const page = await existing.getInstructorCoursesRevenue(String(a), start, new Date(end.getTime() - 1), 1, 10);
      const course = page.items.find((item) => item.id === String(courses[0]))!;
      expect(course.successfulSales).toBe(3);
      expect(course.instructorEarnings).toBe((await repo.summary(String(a), start, end, String(courses[0]))).instructorEarnings);
    } finally { await connection.collection('orders').deleteOne({ _id: order._id }); }
    await withOrder({ courseId: null, instructorEarnings: 140000, platformEarnings: 60000 }, async () => {
      await expect(repo.summary(String(a), start, end)).rejects.toBeInstanceOf(InstructorRevenueDataError);
    });
  });
  it('accepts a legacy instructor-share rate without consulting the current user commission', async () => {
    await withOrder({ amount: 100, instructorCommissionRate: 0.7 }, async () => {
      expect((await repo.summary(String(a), start, end)).instructorEarnings).toBe(608120);
    });
  });
  it('does not overflow rounding at the largest safe integer, and rejects unsafe aggregate totals', async () => {
    await withOrder({ courseId: courses[6], amount: Number.MAX_SAFE_INTEGER, platformCommissionRate: 100 }, async () => {
      expect((await repo.summary(String(a), start, end, String(courses[6]))).instructorEarnings).toBe(0);
      await expect(repo.summary(String(a), start, end)).rejects.toBeInstanceOf(InstructorRevenueDataError);
    });
  });
  it('does not silently assign an undated PAID order to its creation period or return a partial total', async () => {
    await withOrder({ paidAt: null, instructorEarnings: 140000, platformEarnings: 60000 }, async () => {
      await expect(repo.summary(String(a), start, end)).rejects.toMatchObject({ reason: 'missing_payment_date' });
      expect((await repo.summary(String(a), start, end, String(courses[1]))).successfulSales).toBe(2);
    });
  });
  it('rechecks current account role/status and all business documents remain unchanged by reads', async () => {
    expect(await repo.canRead(String(a))).toBe(true);
    expect(await repo.canRead(String(new Types.ObjectId()))).toBe(false);
    expect(await snapshot()).toEqual(baseline);
  });
});
