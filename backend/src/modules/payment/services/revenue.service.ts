import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import {
  type IRevenueOverviewKpi,
  type IRevenueChartItem,
  type IRevenueTransactionItem,
  type IRevenueTransactionDetail,
  type IInstructorRevenueSummary,
  type IInstructorRevenueDetail,
  type IInstructorCourseRevenue,
  type ICommissionConfig,
  type ICommissionHistoryItem,
  RoleEnum,
} from 'share-lib';
import { BaseService, PaginationResult } from '../../base/index.js';
import {
  CommissionSettingRepository,
  type ICommissionSettingDomain,
} from '../repositories/commission-setting.repository.js';
import { CommissionHistoryRepository } from '../repositories/commission-history.repository.js';
import { OrderRepository } from '../../enrollment/repositories/order.repository.js';
import { UserRepository } from '../../user/repositories/user.repository.js';
import {
  RevenueTimeRangeQueryDto,
  RevenueTransactionsQueryDto,
  InstructorsRevenueQueryDto,
  UpdateCommissionConfigDto,
  UpdateInstructorCommissionDto,
} from '../dto/revenue.dto.js';
import {
  parseRevenueTimeRange,
} from '../utils/revenue-date.util.js';

@Injectable()
export class RevenueService extends BaseService<ICommissionSettingDomain, string> {
  constructor(
    protected readonly commissionSettingRepository: CommissionSettingRepository,
    protected readonly commissionHistoryRepository: CommissionHistoryRepository,
    protected readonly orderRepository: OrderRepository,
    protected readonly userRepository: UserRepository,
    cls: ClsService,
  ) {
    super(commissionSettingRepository, cls, RevenueService.name);
  }

  async getOverview(query: RevenueTimeRangeQueryDto): Promise<IRevenueOverviewKpi> {
    const { startDate, endDate } = parseRevenueTimeRange(
      query.timeRange,
      query.startDate,
      query.endDate,
    );
    return this.orderRepository.getRevenueOverview(startDate, endDate);
  }

  async getChart(query: RevenueTimeRangeQueryDto): Promise<IRevenueChartItem[]> {
    const { startDate, endDate, groupBy } = parseRevenueTimeRange(
      query.timeRange,
      query.startDate,
      query.endDate,
    );
    const dbItems = await this.orderRepository.getRevenueChart(startDate, endDate, groupBy);
    return this.fillMissingChartData(dbItems, startDate, endDate, groupBy);
  }

  private fillMissingChartData(
    items: IRevenueChartItem[],
    startDate: Date,
    endDate: Date,
    groupBy: 'day' | 'month',
  ): IRevenueChartItem[] {
    const map = new Map<string, IRevenueChartItem>();
    for (const item of items) {
      map.set(item.date, item);
    }

    const result: IRevenueChartItem[] = [];
    const pad = (n: number) => String(n).padStart(2, '0');

    if (groupBy === 'day') {
      const current = new Date(startDate.getTime());
      while (current.getTime() <= endDate.getTime()) {
        const vnDate = new Date(current.getTime() + 7 * 3600000);
        const y = vnDate.getUTCFullYear();
        const m = vnDate.getUTCMonth() + 1;
        const d = vnDate.getUTCDate();
        const key = `${y}-${pad(m)}-${pad(d)}`;
        const existing = map.get(key);

        result.push(
          existing ?? {
            date: key,
            label: `${pad(d)}/${pad(m)}`,
            totalRevenue: 0,
            platformCommission: 0,
            instructorEarnings: 0,
            orderCount: 0,
          },
        );

        current.setTime(current.getTime() + 86400000);
      }
    } else {
      const sVn = new Date(startDate.getTime() + 7 * 3600000);
      const eVn = new Date(endDate.getTime() + 7 * 3600000);
      let y = sVn.getUTCFullYear();
      let m = sVn.getUTCMonth() + 1;
      const endY = eVn.getUTCFullYear();
      const endM = eVn.getUTCMonth() + 1;

      while (y < endY || (y === endY && m <= endM)) {
        const key = `${y}-${pad(m)}`;
        const existing = map.get(key);

        result.push(
          existing ?? {
            date: key,
            label: `T${m}/${y}`,
            totalRevenue: 0,
            platformCommission: 0,
            instructorEarnings: 0,
            orderCount: 0,
          },
        );

        m += 1;
        if (m > 12) {
          m = 1;
          y += 1;
        }
      }
    }

    return result;
  }

  async getTransactions(
    query: RevenueTransactionsQueryDto,
  ): Promise<PaginationResult<IRevenueTransactionItem>> {
    const { startDate, endDate } = parseRevenueTimeRange(
      query.timeRange,
      query.startDate,
      query.endDate,
    );
    return this.orderRepository.findSuccessfulTransactions({
      startDate,
      endDate,
      search: query.search,
      sort: query.sort,
      page: query.page,
      limit: query.limit,
    });
  }

  async getTransactionDetail(orderCode: string): Promise<IRevenueTransactionDetail> {
    const detail = await this.orderRepository.findRevenueTransactionDetail(orderCode);
    if (!detail) {
      throw new NotFoundException(`Không tìm thấy giao dịch với mã '${orderCode}'`);
    }
    return detail;
  }

  async getInstructors(
    query: InstructorsRevenueQueryDto,
  ): Promise<PaginationResult<IInstructorRevenueSummary>> {
    const { startDate, endDate } = parseRevenueTimeRange(
      query.timeRange,
      query.startDate,
      query.endDate,
    );
    return this.orderRepository.getInstructorsRevenueStats({
      startDate,
      endDate,
      search: query.search,
      sort: query.sort,
      page: query.page,
      limit: query.limit,
    });
  }

  async getInstructorDetail(
    instructorId: string,
    query: RevenueTimeRangeQueryDto,
  ): Promise<IInstructorRevenueDetail> {
    const user = await this.userRepository.findById(instructorId);
    if (!user || user.deletedAt || user.role !== RoleEnum.INSTRUCTOR) {
      throw new NotFoundException('Không tìm thấy thông tin giảng viên');
    }

    const { startDate, endDate } = parseRevenueTimeRange(
      query.timeRange,
      query.startDate,
      query.endDate,
    );

    const kpi = await this.orderRepository.getInstructorRevenueKpi(
      instructorId,
      startDate,
      endDate,
    );

    return {
      instructor: {
        id: user.id,
        fullName: user.fullName || user.email,
        email: user.email,
        avatarUrl: user.avatarUrl || user.avatar || null,
        status: user.status,
        createdAt: new Date(user.createdAt).toISOString(),
        commissionRate: user.commissionRate ?? 30,
        commissionRateUpdatedAt: user.commissionRateUpdatedAt
          ? new Date(user.commissionRateUpdatedAt).toISOString()
          : null,
      },
      kpi,
    };
  }

  async getInstructorCourses(
    instructorId: string,
    query: RevenueTransactionsQueryDto,
  ): Promise<PaginationResult<IInstructorCourseRevenue>> {
    const user = await this.userRepository.findById(instructorId);
    if (!user || user.deletedAt || user.role !== RoleEnum.INSTRUCTOR) {
      throw new NotFoundException('Không tìm thấy thông tin giảng viên');
    }

    const { startDate, endDate } = parseRevenueTimeRange(
      query.timeRange,
      query.startDate,
      query.endDate,
    );

    return this.orderRepository.getInstructorCoursesRevenue(
      instructorId,
      startDate,
      endDate,
      query.page,
      query.limit,
    );
  }

  async getInstructorTransactions(
    instructorId: string,
    query: RevenueTransactionsQueryDto,
  ): Promise<PaginationResult<IRevenueTransactionItem>> {
    const user = await this.userRepository.findById(instructorId);
    if (!user || user.deletedAt || user.role !== RoleEnum.INSTRUCTOR) {
      throw new NotFoundException('Không tìm thấy thông tin giảng viên');
    }

    const { startDate, endDate } = parseRevenueTimeRange(
      query.timeRange,
      query.startDate,
      query.endDate,
    );

    return this.orderRepository.getInstructorTransactions(
      instructorId,
      startDate,
      endDate,
      query.page,
      query.limit,
    );
  }

  async getInstructorCommissionHistory(
    instructorId: string,
  ): Promise<ICommissionHistoryItem[]> {
    const user = await this.userRepository.findById(instructorId);
    if (!user || user.deletedAt || user.role !== RoleEnum.INSTRUCTOR) {
      throw new NotFoundException('Không tìm thấy thông tin giảng viên');
    }

    const histories = await this.commissionHistoryRepository.findByInstructorId(instructorId);
    const result: ICommissionHistoryItem[] = [];

    for (const h of histories) {
      const admin = await this.userRepository.findById(h.appliedById);
      result.push({
        id: h.id,
        targetType: h.targetType,
        instructorId: h.instructorId,
        oldRate: h.oldRate,
        newRate: h.newRate,
        reason: h.reason,
        createdAt: new Date(h.createdAt).toISOString(),
        adminName: admin?.fullName || 'Quản trị viên',
        adminEmail: admin?.email || '',
      });
    }

    return result;
  }

  async getCommissionConfig(): Promise<ICommissionConfig> {
    const current = await this.commissionSettingRepository.getCurrentSetting();
    if (!current) {
      return {
        defaultRate: 30,
        updatedAt: null,
        updatedById: null,
        updatedByName: null,
      };
    }

    let adminName: string | null = null;
    if (current.appliedById) {
      const admin = await this.userRepository.findById(current.appliedById);
      if (admin) adminName = admin.fullName || admin.email;
    }

    return {
      defaultRate: current.defaultRate,
      updatedAt: current.updatedAt ? new Date(current.updatedAt).toISOString() : null,
      updatedById: current.appliedById ?? null,
      updatedByName: adminName,
    };
  }

  async updateCommissionConfig(
    dto: UpdateCommissionConfigDto,
    adminId: string,
  ): Promise<ICommissionConfig> {
    const current = await this.commissionSettingRepository.getCurrentSetting();
    const currentRate = current?.defaultRate ?? 30;

    if (currentRate === dto.defaultRate) {
      throw new BadRequestException('Tỷ lệ hoa hồng mới phải khác tỷ lệ hiện tại');
    }

    const reason =
      dto.reason?.trim() ||
      'Cập nhật cấu hình hoa hồng mặc định toàn hệ thống (áp dụng cho tất cả giảng viên)';

    let updatedSetting: ICommissionSettingDomain | null = null;

    await this.commissionSettingRepository.withTransaction(async (session) => {
      // 1. Cập nhật cấu hình hoa hồng mặc định toàn hệ thống
      updatedSetting = await this.commissionSettingRepository.updateDefaultRate(
        dto.defaultRate,
        adminId,
        session,
      );

      // 2. Ghi đè tỷ lệ hoa hồng đồng loạt cho TẤT CẢ giảng viên
      await this.userRepository.updateAllInstructorsCommissionRate(
        dto.defaultRate,
        adminId,
        session,
      );

      // 3. Ghi log lịch sử thay đổi toàn hệ thống
      await this.commissionHistoryRepository.create(
        {
          targetType: 'SYSTEM',
          oldRate: currentRate,
          newRate: dto.defaultRate,
          reason,
          appliedById: adminId,
        },
        session,
      );
    });

    const admin = await this.userRepository.findById(adminId);
    return {
      defaultRate: updatedSetting ? (updatedSetting as ICommissionSettingDomain).defaultRate : dto.defaultRate,
      updatedAt: updatedSetting ? new Date((updatedSetting as ICommissionSettingDomain).updatedAt).toISOString() : new Date().toISOString(),
      updatedById: adminId,
      updatedByName: admin?.fullName || 'Quản trị viên',
    };
  }

  async updateInstructorCommission(
    instructorId: string,
    dto: UpdateInstructorCommissionDto,
    adminId: string,
  ): Promise<{ commissionRate: number; message: string }> {
    const user = await this.userRepository.findById(instructorId);
    if (!user || user.deletedAt || user.role !== RoleEnum.INSTRUCTOR) {
      throw new NotFoundException('Không tìm thấy thông tin giảng viên');
    }

    const currentRate = user.commissionRate ?? 30;
    if (currentRate === dto.commissionRate) {
      throw new BadRequestException('Tỷ lệ hoa hồng mới phải khác tỷ lệ hiện tại');
    }

    const reason = dto.reason?.trim();
    if (!reason) {
      throw new BadRequestException('Lý do thay đổi hoa hồng không được để trống');
    }

    await this.commissionSettingRepository.withTransaction(async (session) => {
      await this.userRepository.updateCommissionRate(
        instructorId,
        dto.commissionRate,
        adminId,
        session,
      );

      await this.commissionHistoryRepository.create(
        {
          instructorId,
          oldRate: currentRate,
          newRate: dto.commissionRate,
          reason,
          appliedById: adminId,
        },
        session,
      );
    });

    return {
      commissionRate: dto.commissionRate,
      message: 'Cập nhật tỷ lệ hoa hồng cho giảng viên thành công',
    };
  }
}
