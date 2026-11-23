import { Types, type PipelineStage } from 'mongoose';
import { OrderStatusEnum } from 'share-lib';
// oxlint-disable unicorn/no-thenable -- MongoDB $switch has non-callable "then" fields.

export class InstructorRevenueDataError extends Error {
  constructor(readonly reason: 'missing_payment_date' | 'invalid_money') {
    super('Instructor revenue cannot be confirmed from the stored transactions.');
  }
}

/** Native aggregation deliberately avoids Mongoose defaults on legacy financial rows. */
export function storedMoneyIsValid(field: string): Record<string, unknown> {
  return { $cond: [
    { $isNumber: field },
    { $and: [
      { $gte: [field, 0] }, { $lte: [field, Number.MAX_SAFE_INTEGER] },
      { $eq: [{ $trunc: field }, field] },
    ] },
    false,
  ] };
}

const present = (field: string) => ({ $ne: [{ $ifNull: [field, null] }, null] });
const rateValid = (field: string, maximum: number) => ({ $cond: [
  { $isNumber: field }, { $and: [{ $gte: [field, 0] }, { $lte: [field, maximum] }] }, false,
] });
const compatibleRates = { $cond: [
  { $and: [present('$platformCommissionRate'), present('$instructorCommissionRate')] },
  { $cond: [
    { $and: [rateValid('$platformCommissionRate', 100), rateValid('$instructorCommissionRate', 1)] },
    // Checkout stores the instructor share rounded to four decimal places.
    { $lte: [{ $abs: { $subtract: ['$instructorCommissionRate',
      { $subtract: [1, { $divide: ['$platformCommissionRate', 100] }] }] } }, 0.0000500001] },
    false,
  ] },
  true,
] };

/** One definition for the chatbot AND the instructor statistics page. Never default to 30%. */
export function instructorMoneyStages(): PipelineStage.Set[] {
  return [
    { $set: {
      _revenueRate: { $cond: [
        rateValid('$platformCommissionRate', 100), '$platformCommissionRate',
        { $cond: [{ $and: [{ $not: [present('$platformCommissionRate')] }, rateValid('$instructorCommissionRate', 1)] },
          { $multiply: [{ $subtract: [1, '$instructorCommissionRate'] }, 100] }, null] },
      ] },
    } },
    { $set: {
      _revenueNet: { $switch: {
        branches: [
          { case: present('$instructorEarnings'), then: '$instructorEarnings' },
          { case: { $and: [storedMoneyIsValid('$amount'), storedMoneyIsValid('$platformEarnings')] },
            then: { $subtract: ['$amount', '$platformEarnings'] } },
          { case: { $and: [storedMoneyIsValid('$amount'), present('$_revenueRate')] }, then: {
            // Mongo $round uses bankers' rounding. Checkout uses Math.round for positive VND.
            $subtract: ['$amount', { $let: {
              vars: { raw: { $divide: [{ $multiply: ['$amount', '$_revenueRate'] }, 100] } },
              // Avoid floor(raw + .5), which overflows a safe integer at large values.
              in: { $add: [
                { $floor: '$$raw' },
                { $cond: [{ $gte: [{ $subtract: ['$$raw', { $floor: '$$raw' }] }, 0.5] }, 1, 0] },
              ] },
            } }],
          } },
        ],
        default: null,
      } },
      _revenueReconstructed: { $and: [
        { $not: [present('$instructorEarnings')] }, { $not: [present('$platformEarnings')] },
        present('$_revenueRate'),
      ] },
    } },
    { $set: {
      _revenueMoneyValid: { $and: [
        { $eq: [{ $type: '$courseId' }, 'objectId'] },
        storedMoneyIsValid('$amount'), { $gt: ['$amount', 0] },
        storedMoneyIsValid('$_revenueNet'), { $lte: ['$_revenueNet', '$amount'] },
        { $or: [{ $not: ['$_revenueReconstructed'] }, compatibleRates] },
        { $or: [
          { $not: [present('$platformEarnings')] },
          { $and: [
            storedMoneyIsValid('$platformEarnings'),
            { $cond: [
              { $and: [storedMoneyIsValid('$_revenueNet'), storedMoneyIsValid('$platformEarnings')] },
              { $eq: [{ $add: ['$_revenueNet', '$platformEarnings'] }, '$amount'] }, false,
            ] },
          ] },
        ] },
      ] },
    } },
  ];
}

/** The transaction's instructor snapshot wins over a course's current author. */
export function instructorOrderOwnershipStages(instructorId: string, courseId?: string): Array<PipelineStage.Match | PipelineStage.Lookup> {
  const id = new Types.ObjectId(instructorId);
  return [
    { $match: {
      status: OrderStatusEnum.PAID, deletedAt: null, amount: { $ne: 0 },
      $or: [{ instructorId: id }, { instructorId: null }],
      ...(courseId ? { courseId: new Types.ObjectId(courseId) } : {}),
    } },
    { $lookup: { from: 'courses', localField: 'courseId', foreignField: '_id', as: '_revenueCourse' } },
    { $match: { $or: [
      { instructorId: id },
      { instructorId: null, '_revenueCourse.instructorId': id },
    ] } },
  ];
}

export function instructorPaidDateStages(): Array<PipelineStage.Lookup | PipelineStage.Set> {
  return [
    { $lookup: {
      from: 'payments', let: { orderId: '$_id', code: '$orderCode', needsDate: { $ne: [{ $type: '$paidAt' }, 'date'] } },
      pipeline: [
        { $match: { $expr: { $and: [
          '$$needsDate', { $eq: [{ $ifNull: ['$deletedAt', null] }, null] },
          { $eq: [{ $type: '$verifiedAt' }, 'date'] }, { $eq: [{ $type: '$appliedAt' }, 'date'] },
          { $eq: [{ $type: '$transactionDate' }, 'date'] },
          { $or: [
            { $eq: ['$orderId', '$$orderId'] },
            { $and: [
              { $eq: [{ $ifNull: ['$orderId', null] }, null] },
              { $eq: [{ $type: '$$code' }, 'string'] }, { $eq: ['$orderCode', '$$code'] },
            ] },
          ] },
        ] } } },
        { $group: { _id: null, date: { $max: '$transactionDate' } } },
      ],
      as: '_revenuePaymentDate',
    } },
    { $set: { _revenuePaidAt: { $cond: [
      { $eq: [{ $type: '$paidAt' }, 'date'] }, '$paidAt',
      { $ifNull: [{ $arrayElemAt: ['$_revenuePaymentDate.date', 0] }, null] },
    ] } } },
  ];
}

export const instructorRevenueGroup = {
  _id: null,
  totalRevenue: { $sum: { $cond: ['$_revenueMoneyValid', '$amount', 0] } },
  instructorEarnings: { $sum: { $cond: ['$_revenueMoneyValid', '$_revenueNet', 0] } },
  platformCommission: { $sum: { $cond: ['$_revenueMoneyValid', { $subtract: ['$amount', '$_revenueNet'] }, 0] } },
  successfulSales: { $sum: 1 },
  reconstructedOrders: { $sum: { $cond: ['$_revenueReconstructed', 1, 0] } },
  invalidMoney: { $sum: { $cond: ['$_revenueMoneyValid', 0, 1] } },
};

export function assertRevenueTotals(value: {
  totalRevenue: number; instructorEarnings: number; platformCommission: number;
  successfulSales: number; reconstructedOrders: number; invalidMoney?: number;
}): void {
  const numbers = [value.totalRevenue, value.instructorEarnings, value.platformCommission,
    value.successfulSales, value.reconstructedOrders];
  if (value.invalidMoney || !numbers.every((number) => Number.isSafeInteger(number) && number >= 0)
    || value.reconstructedOrders > value.successfulSales
    || value.totalRevenue !== value.instructorEarnings + value.platformCommission) {
    throw new InstructorRevenueDataError('invalid_money');
  }
}
