import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import {
  IOrder,
  type IDashboardKpiData,
  type IDashboardRevenueChartPoint,
  type CategoryRevenueItem,
  type IDashboardPendingTask,
  type IDashboardCoursePerformance,
  type IDashboardInstructor,
  type IAdminDashboardAggregateResponse,
} from 'share-lib';
import { BaseService } from '../../base/index.js';
import { AdminDashboardRepository } from '../repositories/admin-dashboard.repository.js';
import {
  AdminDashboardQueryDto,
  AdminCoursesPerformanceQueryDto,
  AdminInstructorsRankingQueryDto,
} from '../dto/admin-dashboard.dto.js';
import {
  parseRevenueTimeRange,
  getVietnamNow,
  createVnDate,
} from '../../payment/utils/revenue-date.util.js';

@Injectable()
export class AdminDashboardService extends BaseService<IOrder, string> {
  constructor(
    protected readonly dashboardRepository: AdminDashboardRepository,
    cls: ClsService,
  ) {
    super(dashboardRepository, cls, AdminDashboardService.name);
  }

  async getAggregate(query: AdminDashboardQueryDto): Promise<IAdminDashboardAggregateResponse> {
    const period = query.period || 'this_month';
    const { startDate, endDate, groupBy } = this.resolveDateRange(
      period,
      query.startDate,
      query.endDate,
      query.groupBy,
    );

    const { prevStartDate, prevEndDate } = this.resolvePreviousDateRange(
      period,
      startDate,
      endDate,
    );

    const [
      currentRevenue,
      prevRevenue,
      currentStudents,
      prevStudents,
      currentEnrollments,
      prevEnrollments,
      pendingTasksCounts,
      chartSeries,
      categoryRevenue,
      pendingTasks,
      courses,
      instructors,
    ] = await Promise.all([
      this.dashboardRepository.getRevenueKpi(startDate, endDate),
      this.dashboardRepository.getRevenueKpi(prevStartDate, prevEndDate),
      this.dashboardRepository.getNewStudentsCount(startDate, endDate),
      this.dashboardRepository.getNewStudentsCount(prevStartDate, prevEndDate),
      this.dashboardRepository.getEnrollmentsStats(startDate, endDate),
      this.dashboardRepository.getEnrollmentsStats(prevStartDate, prevEndDate),
      this.dashboardRepository.getPendingTasksCounts(),
      this.dashboardRepository.getRevenueChartPoints(
        startDate ?? new Date(Date.now() - 30 * 86400000),
        endDate ?? new Date(),
        groupBy,
      ),
      this.dashboardRepository.getCategoryRevenue(startDate, endDate),
      this.dashboardRepository.getRecentPendingTasks(10),
      this.dashboardRepository.getCoursesPerformance({
        startDate,
        endDate,
        limit: 50,
      }),
      this.dashboardRepository.getInstructorsRanking({
        startDate,
        endDate,
        sortBy: 'grossRevenue',
        limit: 10,
      }),
    ]);

    const kpis: IDashboardKpiData = {
      grossRevenue: {
        cur: currentRevenue.totalRevenue,
        prev: prevRevenue.totalRevenue,
      },
      platformRevenue: {
        cur: currentRevenue.platformCommission,
        prev: prevRevenue.platformCommission,
      },
      instructorRevenue: {
        cur: currentRevenue.instructorEarnings,
        prev: prevRevenue.instructorEarnings,
      },
      newStudents: {
        cur: currentStudents,
        prev: prevStudents,
      },
      enrollments: {
        cur: currentEnrollments.total,
        prev: prevEnrollments.total,
        paid: currentEnrollments.paid,
        free: currentEnrollments.free,
      },
      pendingTasks: pendingTasksCounts,
    };

    return {
      kpis,
      chartSeries,
      categoryRevenue,
      pendingTasks,
      courses,
      instructors,
    };
  }

  async getInstructorsRanking(
    query: AdminInstructorsRankingQueryDto,
  ): Promise<IDashboardInstructor[]> {
    const period = query.period || 'this_month';
    const { startDate, endDate } = this.resolveDateRange(
      period,
      query.startDate,
      query.endDate,
    );

    return this.dashboardRepository.getInstructorsRanking({
      startDate,
      endDate,
      sortBy: query.sortBy || 'grossRevenue',
      limit: query.limit || 5,
    });
  }

  async getChart(query: AdminDashboardQueryDto): Promise<IDashboardRevenueChartPoint[]> {
    const period = query.period || 'this_month';
    const { startDate, endDate, groupBy } = this.resolveDateRange(
      period,
      query.startDate,
      query.endDate,
      query.groupBy,
    );

    return this.dashboardRepository.getRevenueChartPoints(
      startDate ?? new Date(Date.now() - 30 * 86400000),
      endDate ?? new Date(),
      groupBy,
    );
  }

  async getCoursesPerformance(
    query: AdminCoursesPerformanceQueryDto,
  ): Promise<IDashboardCoursePerformance[]> {
    const period = query.period || 'this_month';
    const { startDate, endDate } = this.resolveDateRange(
      period,
      query.startDate,
      query.endDate,
    );

    const courses = await this.dashboardRepository.getCoursesPerformance({
      startDate,
      endDate,
      categoryId: query.categoryId,
      instructorId: query.instructorId,
      limit: 100,
    });

    if (query.tab === 'revenue') {
      return courses
        .filter((c) => !c.isFree)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, query.limit || 10);
    }
    if (query.tab === 'enrollment') {
      return courses
        .sort((a, b) => b.newEnrollments - a.newEnrollments)
        .slice(0, query.limit || 10);
    }
    if (query.tab === 'completion') {
      return courses
        .sort((a, b) => b.completionRate - a.completionRate)
        .slice(0, query.limit || 10);
    }

    return courses.slice(0, query.limit || 10);
  }

  private resolveDateRange(
    period: string,
    customStart?: string,
    customEnd?: string,
    forcedGroupBy?: 'day' | 'month',
  ): { startDate?: Date; endDate?: Date; groupBy: 'day' | 'month' } {
    const normPeriod = period.toLowerCase();
    const parsed = parseRevenueTimeRange(normPeriod, customStart, customEnd);

    return {
      startDate: parsed.startDate,
      endDate: parsed.endDate,
      groupBy: forcedGroupBy || parsed.groupBy,
    };
  }

  private resolvePreviousDateRange(
    period: string,
    startDate?: Date,
    endDate?: Date,
  ): { prevStartDate?: Date; prevEndDate?: Date } {
    const vn = getVietnamNow();
    const norm = period.toLowerCase();

    switch (norm) {
      case 'today': {
        const yesterdayMs =
          createVnDate(vn.year, vn.month, vn.day, 0, 0, 0, 0).getTime() - 86400000;
        const yDate = new Date(yesterdayMs + 7 * 3600000);
        return {
          prevStartDate: createVnDate(
            yDate.getUTCFullYear(),
            yDate.getUTCMonth() + 1,
            yDate.getUTCDate(),
            0,
            0,
            0,
            0,
          ),
          prevEndDate: createVnDate(
            yDate.getUTCFullYear(),
            yDate.getUTCMonth() + 1,
            yDate.getUTCDate(),
            23,
            59,
            59,
            999,
          ),
        };
      }
      case 'yesterday': {
        const twoDaysAgoMs =
          createVnDate(vn.year, vn.month, vn.day, 0, 0, 0, 0).getTime() - 2 * 86400000;
        const dDate = new Date(twoDaysAgoMs + 7 * 3600000);
        return {
          prevStartDate: createVnDate(
            dDate.getUTCFullYear(),
            dDate.getUTCMonth() + 1,
            dDate.getUTCDate(),
            0,
            0,
            0,
            0,
          ),
          prevEndDate: createVnDate(
            dDate.getUTCFullYear(),
            dDate.getUTCMonth() + 1,
            dDate.getUTCDate(),
            23,
            59,
            59,
            999,
          ),
        };
      }
      case '7d':
      case '7days': {
        if (!startDate) return {};
        const duration = 7 * 86400000;
        return {
          prevStartDate: new Date(startDate.getTime() - duration),
          prevEndDate: new Date(startDate.getTime() - 1),
        };
      }
      case '30d':
      case '30days': {
        if (!startDate) return {};
        const duration = 30 * 86400000;
        return {
          prevStartDate: new Date(startDate.getTime() - duration),
          prevEndDate: new Date(startDate.getTime() - 1),
        };
      }
      case 'this_month':
      case 'thismonth': {
        let lYear = vn.year;
        let lMonth = vn.month - 1;
        if (lMonth < 1) {
          lMonth = 12;
          lYear -= 1;
        }
        const lastDay = new Date(Date.UTC(lYear, lMonth, 0)).getUTCDate();
        return {
          prevStartDate: createVnDate(lYear, lMonth, 1, 0, 0, 0, 0),
          prevEndDate: createVnDate(lYear, lMonth, lastDay, 23, 59, 59, 999),
        };
      }
      case 'last_month':
      case 'lastmonth': {
        let lYear = vn.year;
        let lMonth = vn.month - 2;
        if (lMonth < 1) {
          lMonth += 12;
          lYear -= 1;
        }
        const lastDay = new Date(Date.UTC(lYear, lMonth, 0)).getUTCDate();
        return {
          prevStartDate: createVnDate(lYear, lMonth, 1, 0, 0, 0, 0),
          prevEndDate: createVnDate(lYear, lMonth, lastDay, 23, 59, 59, 999),
        };
      }
      case 'this_year':
      case 'thisyear': {
        return {
          prevStartDate: createVnDate(vn.year - 1, 1, 1, 0, 0, 0, 0),
          prevEndDate: createVnDate(vn.year - 1, 12, 31, 23, 59, 59, 999),
        };
      }
      case 'custom':
      default: {
        if (!startDate || !endDate) return {};
        const diff = endDate.getTime() - startDate.getTime();
        return {
          prevStartDate: new Date(startDate.getTime() - diff),
          prevEndDate: new Date(startDate.getTime() - 1),
        };
      }
    }
  }
}
