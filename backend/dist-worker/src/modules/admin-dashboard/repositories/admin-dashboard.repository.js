var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { OrderStatusEnum, CourseStatusEnum, InstructorApplicationStatusEnum, ReviewStatusEnum, RoleEnum, } from 'share-lib';
import { BaseMongoRepository } from '../../base/index.js';
import { OrderEntity } from '../../enrollment/schemas/order.schema.js';
let AdminDashboardRepository = class AdminDashboardRepository extends BaseMongoRepository {
    constructor(orderModel) {
        super(orderModel, (doc) => {
            const plain = typeof doc.toObject === 'function'
                ? doc.toObject()
                : doc;
            return {
                ...plain,
                id: String(plain._id),
                userId: String(plain.userId),
                courseId: String(plain.courseId),
            };
        });
    }
    async getRevenueKpi(startDate, endDate) {
        const match = {
            status: OrderStatusEnum.PAID,
            deletedAt: null,
        };
        if (startDate && endDate) {
            match.$or = [
                { paidAt: { $gte: startDate, $lte: endDate } },
                { paidAt: null, createdAt: { $gte: startDate, $lte: endDate } },
            ];
        }
        const pipeline = [
            { $match: match },
            {
                $project: {
                    amount: 1,
                    platformEarnings: {
                        $ifNull: [
                            '$platformEarnings',
                            {
                                $round: [
                                    {
                                        $multiply: [
                                            '$amount',
                                            { $divide: [{ $ifNull: ['$platformCommissionRate', 30] }, 100] },
                                        ],
                                    },
                                    0,
                                ],
                            },
                        ],
                    },
                },
            },
            {
                $project: {
                    amount: 1,
                    platformEarnings: 1,
                    instructorEarnings: { $subtract: ['$amount', '$platformEarnings'] },
                },
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$amount' },
                    platformCommission: { $sum: '$platformEarnings' },
                    instructorEarnings: { $sum: '$instructorEarnings' },
                    successfulOrders: { $sum: 1 },
                },
            },
        ];
        const result = await this.model
            .aggregate(pipeline)
            .exec();
        if (!result || result.length === 0) {
            return {
                totalRevenue: 0,
                platformCommission: 0,
                instructorEarnings: 0,
                successfulOrders: 0,
            };
        }
        return {
            totalRevenue: result[0].totalRevenue ?? 0,
            platformCommission: result[0].platformCommission ?? 0,
            instructorEarnings: result[0].instructorEarnings ?? 0,
            successfulOrders: result[0].successfulOrders ?? 0,
        };
    }
    async getNewStudentsCount(startDate, endDate) {
        const match = {
            role: RoleEnum.STUDENT,
            deletedAt: null,
        };
        if (startDate && endDate) {
            match.createdAt = { $gte: startDate, $lte: endDate };
        }
        return this.model.db.collection('users').countDocuments(match);
    }
    async getEnrollmentsStats(startDate, endDate) {
        const match = {
            deletedAt: null,
        };
        if (startDate && endDate) {
            match.enrolledAt = { $gte: startDate, $lte: endDate };
        }
        const pipeline = [
            { $match: match },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    paid: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [{ $ne: ['$orderId', null] }, { $ne: ['$orderId', undefined] }],
                                },
                                1,
                                0,
                            ],
                        },
                    },
                    free: {
                        $sum: {
                            $cond: [{ $or: [{ $eq: ['$orderId', null] }, { $not: ['$orderId'] }] }, 1, 0],
                        },
                    },
                },
            },
        ];
        const [res] = await this.model.db
            .collection('enrollments')
            .aggregate(pipeline)
            .toArray();
        return {
            total: res?.total ?? 0,
            paid: res?.paid ?? 0,
            free: res?.free ?? 0,
        };
    }
    async getPendingTasksCounts() {
        const [courses, instructors, reviews] = await Promise.all([
            this.model.db.collection('courses').countDocuments({
                status: CourseStatusEnum.PENDING_APPROVAL,
                deletedAt: null,
            }),
            this.model.db.collection('instructor_applications').countDocuments({
                status: InstructorApplicationStatusEnum.PENDING,
                deletedAt: null,
            }),
            this.model.db.collection('reviews').countDocuments({
                reportCount: { $gt: 0 },
                status: { $nin: [ReviewStatusEnum.DELETED, ReviewStatusEnum.HIDDEN] },
                deletedAt: null,
            }),
        ]);
        return {
            cur: courses + instructors + reviews,
            courses,
            instructors,
            reviews,
        };
    }
    async getRevenueChartPoints(startDate, endDate, groupBy) {
        const format = groupBy === 'month' ? '%Y-%m' : '%Y-%m-%d';
        const pipeline = [
            {
                $match: {
                    status: OrderStatusEnum.PAID,
                    deletedAt: null,
                    $or: [
                        { paidAt: { $gte: startDate, $lte: endDate } },
                        { paidAt: null, createdAt: { $gte: startDate, $lte: endDate } },
                    ],
                },
            },
            {
                $project: {
                    amount: 1,
                    effectiveDate: { $ifNull: ['$paidAt', '$createdAt'] },
                    platformEarnings: {
                        $ifNull: [
                            '$platformEarnings',
                            {
                                $round: [
                                    {
                                        $multiply: [
                                            '$amount',
                                            { $divide: [{ $ifNull: ['$platformCommissionRate', 30] }, 100] },
                                        ],
                                    },
                                    0,
                                ],
                            },
                        ],
                    },
                },
            },
            {
                $project: {
                    amount: 1,
                    platformEarnings: 1,
                    instructorEarnings: { $subtract: ['$amount', '$platformEarnings'] },
                    dateStr: {
                        $dateToString: {
                            format,
                            date: '$effectiveDate',
                            timezone: '+07:00',
                        },
                    },
                },
            },
            {
                $group: {
                    _id: '$dateStr',
                    totalRevenue: { $sum: '$amount' },
                    platformCommission: { $sum: '$platformEarnings' },
                    instructorEarnings: { $sum: '$instructorEarnings' },
                    orderCount: { $sum: 1 },
                },
            },
            {
                $sort: { _id: 1 },
            },
        ];
        const rows = await this.model
            .aggregate(pipeline)
            .exec();
        const dataMap = new Map();
        for (const row of rows) {
            dataMap.set(row._id, row);
        }
        const result = [];
        const pad = (n) => String(n).padStart(2, '0');
        if (groupBy === 'day') {
            const current = new Date(startDate.getTime());
            while (current.getTime() <= endDate.getTime()) {
                const vnDate = new Date(current.getTime() + 7 * 3600000);
                const y = vnDate.getUTCFullYear();
                const m = vnDate.getUTCMonth() + 1;
                const d = vnDate.getUTCDate();
                const key = `${y}-${pad(m)}-${pad(d)}`;
                const label = `${pad(d)}/${pad(m)}`;
                const existing = dataMap.get(key);
                result.push({
                    date: key,
                    label,
                    grossRevenue: existing?.totalRevenue ?? 0,
                    platformRevenue: existing?.platformCommission ?? 0,
                    instructorRevenue: existing?.instructorEarnings ?? 0,
                    orderCount: existing?.orderCount ?? 0,
                });
                current.setTime(current.getTime() + 86400000);
            }
        }
        else {
            const startY = startDate.getUTCFullYear();
            const startM = startDate.getUTCMonth() + 1;
            const endY = endDate.getUTCFullYear();
            const endM = endDate.getUTCMonth() + 1;
            let curY = startY;
            let curM = startM;
            while (curY < endY || (curY === endY && curM <= endM)) {
                const key = `${curY}-${pad(curM)}`;
                const label = `T${curM}/${String(curY).slice(2)}`;
                const existing = dataMap.get(key);
                result.push({
                    date: key,
                    label,
                    grossRevenue: existing?.totalRevenue ?? 0,
                    platformRevenue: existing?.platformCommission ?? 0,
                    instructorRevenue: existing?.instructorEarnings ?? 0,
                    orderCount: existing?.orderCount ?? 0,
                });
                curM++;
                if (curM > 12) {
                    curM = 1;
                    curY++;
                }
            }
        }
        return result;
    }
    async getCategoryRevenue(startDate, endDate) {
        const match = {
            status: OrderStatusEnum.PAID,
            deletedAt: null,
        };
        if (startDate && endDate) {
            match.$or = [
                { paidAt: { $gte: startDate, $lte: endDate } },
                { paidAt: null, createdAt: { $gte: startDate, $lte: endDate } },
            ];
        }
        const pipeline = [
            { $match: match },
            {
                $lookup: {
                    from: 'courses',
                    localField: 'courseId',
                    foreignField: '_id',
                    as: 'course',
                },
            },
            { $unwind: { path: '$course', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'course_categories',
                    localField: 'course.categoryId',
                    foreignField: '_id',
                    as: 'category',
                },
            },
            { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: { $ifNull: ['$category._id', 'uncategorized'] },
                    name: { $first: { $ifNull: ['$category.name', 'Khác / Chưa phân loại'] } },
                    revenue: { $sum: '$amount' },
                },
            },
            { $sort: { revenue: -1 } },
        ];
        const rows = await this.model
            .aggregate(pipeline)
            .exec();
        return rows.map((r) => ({
            id: String(r._id),
            name: String(r.name),
            revenue: Number(r.revenue) || 0,
        }));
    }
    async getRecentPendingTasks(limit = 10) {
        const [pendingCourses, pendingApps, reportedReviews] = await Promise.all([
            this.model.db
                .collection('courses')
                .aggregate([
                {
                    $match: {
                        status: CourseStatusEnum.PENDING_APPROVAL,
                        deletedAt: null,
                    },
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'instructorId',
                        foreignField: '_id',
                        as: 'instructor',
                    },
                },
                { $unwind: { path: '$instructor', preserveNullAndEmptyArrays: true } },
                { $sort: { approvalRequestedAt: -1, updatedAt: -1, createdAt: -1 } },
                { $limit: limit },
            ])
                .toArray(),
            this.model.db
                .collection('instructor_applications')
                .aggregate([
                {
                    $match: {
                        status: InstructorApplicationStatusEnum.PENDING,
                        deletedAt: null,
                    },
                },
                { $sort: { createdAt: -1 } },
                { $limit: limit },
            ])
                .toArray(),
            this.model.db
                .collection('reviews')
                .aggregate([
                {
                    $match: {
                        reportCount: { $gt: 0 },
                        status: { $nin: [ReviewStatusEnum.DELETED, ReviewStatusEnum.HIDDEN] },
                        deletedAt: null,
                    },
                },
                {
                    $lookup: {
                        from: 'courses',
                        localField: 'courseId',
                        foreignField: '_id',
                        as: 'course',
                    },
                },
                { $unwind: { path: '$course', preserveNullAndEmptyArrays: true } },
                { $sort: { updatedAt: -1, createdAt: -1 } },
                { $limit: limit },
            ])
                .toArray(),
        ]);
        const formatTimeAgo = (date) => {
            if (!date)
                return 'Vừa xong';
            const d = new Date(date);
            const diffMs = Date.now() - d.getTime();
            const diffMins = Math.floor(diffMs / 60000);
            if (diffMins < 1)
                return 'Vừa xong';
            if (diffMins < 60)
                return `${diffMins} phút trước`;
            const diffHours = Math.floor(diffMins / 60);
            if (diffHours < 24)
                return `${diffHours} giờ trước`;
            const diffDays = Math.floor(diffHours / 24);
            return `${diffDays} ngày trước`;
        };
        const tasks = [];
        for (const c of pendingCourses) {
            const date = c.approvalRequestedAt || c.updatedAt || c.createdAt;
            tasks.push({
                id: String(c._id),
                type: 'course',
                title: String(c.title || 'Khóa học chờ duyệt'),
                actor: String(c.instructor?.fullName || c.instructor?.email || 'Giảng viên'),
                timeAgo: formatTimeAgo(date),
                badgeLabel: 'Khóa học chờ duyệt',
                route: '/admin/courses?status=pending_approval',
                rawDate: date ? new Date(date).getTime() : 0,
            });
        }
        for (const a of pendingApps) {
            const date = a.createdAt;
            tasks.push({
                id: String(a._id),
                type: 'instructor',
                title: `Hồ sơ đăng ký Giảng viên: ${a.fullName || 'Ứng viên'}`,
                actor: String(a.fullName || a.email || 'Ứng viên'),
                timeAgo: formatTimeAgo(date),
                badgeLabel: 'Hồ sơ giảng viên',
                route: '/admin/instructors',
                rawDate: date ? new Date(date).getTime() : 0,
            });
        }
        for (const r of reportedReviews) {
            const date = r.updatedAt || r.createdAt;
            const cTitle = r.course?.title ? ` tại khóa ${r.course.title}` : '';
            tasks.push({
                id: String(r._id),
                type: 'review',
                title: `Báo cáo đánh giá${cTitle}`,
                actor: String(r.userName || 'Người dùng'),
                timeAgo: formatTimeAgo(date),
                badgeLabel: 'Báo cáo đánh giá',
                route: '/admin/reviews?hasReports=true',
                rawDate: date ? new Date(date).getTime() : 0,
            });
        }
        tasks.sort((a, b) => b.rawDate - a.rawDate);
        return tasks.slice(0, limit).map(({ rawDate, ...rest }) => rest);
    }
    async getCoursesPerformance(params) {
        const { startDate, endDate, categoryId, instructorId, limit = 50 } = params;
        const courseMatch = {
            deletedAt: null,
        };
        if (categoryId && categoryId !== 'all') {
            if (Types.ObjectId.isValid(categoryId)) {
                courseMatch.categoryId = new Types.ObjectId(categoryId);
            }
        }
        if (instructorId && instructorId !== 'all') {
            if (Types.ObjectId.isValid(instructorId)) {
                courseMatch.instructorId = new Types.ObjectId(instructorId);
            }
        }
        const orderDateMatch = {
            status: OrderStatusEnum.PAID,
            deletedAt: null,
        };
        if (startDate && endDate) {
            orderDateMatch.$or = [
                { paidAt: { $gte: startDate, $lte: endDate } },
                { paidAt: null, createdAt: { $gte: startDate, $lte: endDate } },
            ];
        }
        const enrollmentDateMatch = {
            deletedAt: null,
        };
        if (startDate && endDate) {
            enrollmentDateMatch.enrolledAt = { $gte: startDate, $lte: endDate };
        }
        const pipeline = [
            { $match: courseMatch },
            {
                $lookup: {
                    from: 'users',
                    localField: 'instructorId',
                    foreignField: '_id',
                    as: 'instructor',
                },
            },
            { $unwind: { path: '$instructor', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'course_categories',
                    localField: 'categoryId',
                    foreignField: '_id',
                    as: 'category',
                },
            },
            { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'orders',
                    let: { cId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$courseId', '$$cId'] },
                                        { $eq: ['$status', OrderStatusEnum.PAID] },
                                        { $eq: ['$deletedAt', null] },
                                        ...(startDate && endDate
                                            ? [
                                                {
                                                    $or: [
                                                        {
                                                            $and: [
                                                                { $gte: [{ $ifNull: ['$paidAt', '$createdAt'] }, startDate] },
                                                                { $lte: [{ $ifNull: ['$paidAt', '$createdAt'] }, endDate] },
                                                            ],
                                                        },
                                                    ],
                                                },
                                            ]
                                            : []),
                                    ],
                                },
                            },
                        },
                    ],
                    as: 'periodOrders',
                },
            },
            {
                $lookup: {
                    from: 'enrollments',
                    let: { cId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$courseId', '$$cId'] },
                                        { $eq: ['$deletedAt', null] },
                                        ...(startDate && endDate
                                            ? [
                                                { $gte: ['$enrolledAt', startDate] },
                                                { $lte: ['$enrolledAt', endDate] },
                                            ]
                                            : []),
                                    ],
                                },
                            },
                        },
                    ],
                    as: 'periodEnrollments',
                },
            },
            {
                $lookup: {
                    from: 'enrollments',
                    let: { cId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [{ $eq: ['$courseId', '$$cId'] }, { $eq: ['$deletedAt', null] }],
                                },
                            },
                        },
                    ],
                    as: 'allTimeEnrollments',
                },
            },
            {
                $lookup: {
                    from: 'learning_progress',
                    let: { cId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [{ $eq: ['$courseId', '$$cId'] }, { $eq: ['$deletedAt', null] }],
                                },
                            },
                        },
                    ],
                    as: 'progressDocs',
                },
            },
            {
                $project: {
                    id: { $toString: '$_id' },
                    title: 1,
                    slug: { $ifNull: ['$slug', ''] },
                    thumbnailUrl: { $ifNull: ['$thumbnailUrl', null] },
                    price: { $ifNull: ['$price', 0] },
                    ratingAvg: { $ifNull: ['$ratingAvg', 0] },
                    reviewCount: { $ifNull: ['$reviewCount', 0] },
                    instructorName: {
                        $ifNull: ['$instructor.fullName', { $ifNull: ['$instructor.email', 'Giảng viên'] }],
                    },
                    categoryName: { $ifNull: ['$category.name', 'Khác'] },
                    salesCount: { $size: '$periodOrders' },
                    revenue: { $sum: '$periodOrders.amount' },
                    newEnrollments: { $size: '$periodEnrollments' },
                    totalOwned: { $size: '$allTimeEnrollments' },
                    startedLearners: { $size: '$progressDocs' },
                    completedLearners: {
                        $size: {
                            $filter: {
                                input: '$progressDocs',
                                as: 'p',
                                cond: { $eq: ['$$p.sessionClosed', true] },
                            },
                        },
                    },
                },
            },
            { $limit: limit },
        ];
        const rows = await this.model.db
            .collection('courses')
            .aggregate(pipeline)
            .toArray();
        return rows.map((r) => {
            const price = Number(r.price) || 0;
            const started = Number(r.startedLearners) || 0;
            const completed = Number(r.completedLearners) || 0;
            const completionRate = started > 0 ? Number(((completed / started) * 100).toFixed(1)) : 0;
            const title = String(r.title || 'Khóa học');
            const words = title.split(' ').filter(Boolean);
            const thumbnailText = words.length >= 2
                ? `${words[0].slice(0, 3)}${words[1].slice(0, 3)}`
                : title.slice(0, 6);
            return {
                id: String(r.id || r._id),
                title,
                slug: r.slug || '',
                thumbnailUrl: r.thumbnailUrl || null,
                instructor: String(r.instructorName || 'Giảng viên'),
                category: String(r.categoryName || 'Khác'),
                price,
                isFree: price === 0,
                thumbnailBg: 'bg-primary/10 text-primary',
                thumbnailText,
                salesCount: Number(r.salesCount) || 0,
                revenue: Number(r.revenue) || 0,
                newEnrollments: Number(r.newEnrollments) || 0,
                totalOwned: Number(r.totalOwned) || 0,
                startedLearners: started,
                completedLearners: completed,
                completionRate,
                rating: Number(r.ratingAvg) || 0,
                reviewCount: Number(r.reviewCount) || 0,
            };
        });
    }
    async getInstructorsRanking(params) {
        const { startDate, endDate, sortBy = 'grossRevenue', limit = 5 } = params;
        const userMatch = {
            role: RoleEnum.INSTRUCTOR,
            deletedAt: null,
        };
        const sortField = sortBy === 'salesCount'
            ? { salesCount: -1, grossRevenue: -1, coursesCount: -1, _id: 1 }
            : sortBy === 'netRevenue'
                ? { netRevenue: -1, grossRevenue: -1, coursesCount: -1, _id: 1 }
                : { grossRevenue: -1, salesCount: -1, coursesCount: -1, _id: 1 };
        const pipeline = [
            { $match: userMatch },
            {
                $lookup: {
                    from: 'courses',
                    let: { instructorId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$instructorId', '$$instructorId'] },
                                        { $eq: ['$deletedAt', null] },
                                        { $eq: ['$status', CourseStatusEnum.PUBLISHED] },
                                    ],
                                },
                            },
                        },
                        {
                            $project: {
                                _id: 1,
                                title: 1,
                                price: 1,
                                ratingAvg: 1,
                                reviewCount: 1,
                            },
                        },
                    ],
                    as: 'publishedCourses',
                },
            },
            {
                $lookup: {
                    from: 'orders',
                    let: {
                        instructorId: '$_id',
                        courseIds: '$publishedCourses._id',
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$status', OrderStatusEnum.PAID] },
                                        { $eq: ['$deletedAt', null] },
                                        {
                                            $or: [
                                                { $eq: ['$instructorId', '$$instructorId'] },
                                                { $in: ['$courseId', '$$courseIds'] },
                                            ],
                                        },
                                        ...(startDate && endDate
                                            ? [
                                                {
                                                    $or: [
                                                        {
                                                            $and: [
                                                                { $gte: [{ $ifNull: ['$paidAt', '$createdAt'] }, startDate] },
                                                                { $lte: [{ $ifNull: ['$paidAt', '$createdAt'] }, endDate] },
                                                            ],
                                                        },
                                                    ],
                                                },
                                            ]
                                            : []),
                                    ],
                                },
                            },
                        },
                        {
                            $project: {
                                amount: 1,
                                platformEarnings: {
                                    $ifNull: [
                                        '$platformEarnings',
                                        {
                                            $round: [
                                                {
                                                    $multiply: [
                                                        '$amount',
                                                        { $divide: [{ $ifNull: ['$platformCommissionRate', 30] }, 100] },
                                                    ],
                                                },
                                                0,
                                            ],
                                        },
                                    ],
                                },
                            },
                        },
                        {
                            $project: {
                                amount: 1,
                                instructorEarnings: { $subtract: ['$amount', '$platformEarnings'] },
                            },
                        },
                    ],
                    as: 'periodOrders',
                },
            },
            {
                $project: {
                    id: { $toString: '$_id' },
                    fullName: { $ifNull: ['$fullName', '$email'] },
                    email: 1,
                    bio: { $ifNull: ['$bio', ''] },
                    avatarUrl: { $ifNull: ['$avatarUrl', null] },
                    commissionRate: { $ifNull: ['$commissionRate', 30] },
                    coursesCount: { $size: '$publishedCourses' },
                    salesCount: { $size: '$periodOrders' },
                    grossRevenue: { $sum: '$periodOrders.amount' },
                    netRevenue: { $sum: '$periodOrders.instructorEarnings' },
                },
            },
            { $sort: sortField },
            { $limit: limit },
        ];
        const rows = await this.model.db
            .collection('users')
            .aggregate(pipeline)
            .toArray();
        const colorPalettes = [
            'bg-blue-600 text-white',
            'bg-indigo-600 text-white',
            'bg-teal-600 text-white',
            'bg-emerald-600 text-white',
            'bg-amber-600 text-white',
            'bg-rose-600 text-white',
            'bg-sky-600 text-white',
            'bg-purple-600 text-white',
        ];
        return rows.map((r, index) => {
            const name = String(r.fullName || r.email || 'Giảng viên');
            const words = name.trim().split(/\s+/).filter(Boolean);
            let initials = 'GV';
            if (words.length >= 2) {
                initials = `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
            }
            else if (words.length === 1 && words[0].length >= 1) {
                initials = words[0].slice(0, 2).toUpperCase();
            }
            const avatarBg = colorPalettes[index % colorPalettes.length];
            const platformRate = Number(r.commissionRate) || 30;
            const instructorCommissionRate = Math.max(0, 100 - platformRate);
            return {
                id: String(r.id || r._id),
                name,
                email: String(r.email || ''),
                specialty: String(r.bio || 'Giảng viên Mindly'),
                avatarBg,
                avatarUrl: r.avatarUrl ? String(r.avatarUrl) : null,
                initials,
                coursesCount: Number(r.coursesCount) || 0,
                salesCount: Number(r.salesCount) || 0,
                grossRevenue: Number(r.grossRevenue) || 0,
                netRevenue: Number(r.netRevenue) || 0,
                commissionRate: instructorCommissionRate,
            };
        });
    }
};
AdminDashboardRepository = __decorate([
    Injectable(),
    __param(0, InjectModel(OrderEntity.name)),
    __metadata("design:paramtypes", [Model])
], AdminDashboardRepository);
export { AdminDashboardRepository };
//# sourceMappingURL=admin-dashboard.repository.js.map