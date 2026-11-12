import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  Header,
} from '@nestjs/common';
import {
  ApiResponse,
  ParseObjectIdPipe,
} from '../base/index.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import {
  RoleEnum,
  type IRevenueOverviewKpi,
  type IRevenueChartItem,
  type IRevenueTransactionItem,
  type IRevenueTransactionDetail,
  type IInstructorRevenueSummary,
  type IInstructorRevenueDetail,
  type IInstructorCourseRevenue,
  type ICommissionConfig,
  type ICommissionHistoryItem,
} from 'share-lib';
import { RevenueService } from './services/revenue.service.js';
import {
  RevenueTimeRangeQueryDto,
  RevenueTransactionsQueryDto,
  InstructorsRevenueQueryDto,
  UpdateCommissionConfigDto,
  UpdateInstructorCommissionDto,
} from './dto/revenue.dto.js';
import { PaginationResult } from '../base/index.js';

@Controller('payments/revenue')
@Roles(RoleEnum.ADMIN)
export class RevenueController {
  constructor(private readonly revenueService: RevenueService) {}

  /**
   * Lấy 4 thẻ thống kê KPI doanh thu toàn hệ thống
   */
  @Get('overview')
  @Header('Cache-Control', 'no-store')
  async getOverview(
    @Query() query: RevenueTimeRangeQueryDto,
  ): Promise<ApiResponse<IRevenueOverviewKpi>> {
    const kpi = await this.revenueService.getOverview(query);
    return ApiResponse.success(kpi, 'Lấy dữ liệu tổng quan doanh thu thành công');
  }

  /**
   * Lấy dữ liệu biểu đồ doanh thu theo chu kỳ thời gian
   */
  @Get('chart')
  @Header('Cache-Control', 'no-store')
  async getChart(
    @Query() query: RevenueTimeRangeQueryDto,
  ): Promise<ApiResponse<IRevenueChartItem[]>> {
    const chart = await this.revenueService.getChart(query);
    return ApiResponse.success(chart, 'Lấy dữ liệu biểu đồ doanh thu thành công');
  }

  /**
   * Lấy danh sách giao dịch thành công (hiển thị dạng card ngang)
   */
  @Get('transactions')
  @Header('Cache-Control', 'no-store')
  async getTransactions(
    @Query() query: RevenueTransactionsQueryDto,
  ): Promise<ApiResponse<PaginationResult<IRevenueTransactionItem>>> {
    const result = await this.revenueService.getTransactions(query);
    return ApiResponse.success(result, 'Lấy danh sách giao dịch thành công');
  }

  /**
   * Lấy chi tiết một giao dịch thành công (mở drawer 5 nhóm thông tin)
   */
  @Get('transactions/:orderCode')
  @Header('Cache-Control', 'no-store')
  async getTransactionDetail(
    @Param('orderCode') orderCode: string,
  ): Promise<ApiResponse<IRevenueTransactionDetail>> {
    const detail = await this.revenueService.getTransactionDetail(orderCode);
    return ApiResponse.success(detail, 'Lấy chi tiết giao dịch thành công');
  }

  /**
   * Lấy danh sách doanh thu theo giảng viên
   */
  @Get('instructors')
  @Header('Cache-Control', 'no-store')
  async getInstructors(
    @Query() query: InstructorsRevenueQueryDto,
  ): Promise<ApiResponse<PaginationResult<IInstructorRevenueSummary>>> {
    const result = await this.revenueService.getInstructors(query);
    return ApiResponse.success(result, 'Lấy danh sách doanh thu giảng viên thành công');
  }

  /**
   * Lấy chi tiết doanh thu và KPI của một giảng viên
   */
  @Get('instructors/:id')
  @Header('Cache-Control', 'no-store')
  async getInstructorDetail(
    @Param('id', ParseObjectIdPipe) id: string,
    @Query() query: RevenueTimeRangeQueryDto,
  ): Promise<ApiResponse<IInstructorRevenueDetail>> {
    const result = await this.revenueService.getInstructorDetail(id, query);
    return ApiResponse.success(result, 'Lấy chi tiết giảng viên thành công');
  }

  /**
   * Lấy doanh thu theo từng khóa học của giảng viên
   */
  @Get('instructors/:id/courses')
  @Header('Cache-Control', 'no-store')
  async getInstructorCourses(
    @Param('id', ParseObjectIdPipe) id: string,
    @Query() query: RevenueTransactionsQueryDto,
  ): Promise<ApiResponse<PaginationResult<IInstructorCourseRevenue>>> {
    const result = await this.revenueService.getInstructorCourses(id, query);
    return ApiResponse.success(result, 'Lấy danh sách khóa học giảng viên thành công');
  }

  /**
   * Lấy danh sách giao dịch gần đây của giảng viên
   */
  @Get('instructors/:id/transactions')
  @Header('Cache-Control', 'no-store')
  async getInstructorTransactions(
    @Param('id', ParseObjectIdPipe) id: string,
    @Query() query: RevenueTransactionsQueryDto,
  ): Promise<ApiResponse<PaginationResult<IRevenueTransactionItem>>> {
    const result = await this.revenueService.getInstructorTransactions(id, query);
    return ApiResponse.success(result, 'Lấy danh sách giao dịch của giảng viên thành công');
  }

  /**
   * Lấy lịch sử điều chỉnh hoa hồng của giảng viên
   */
  @Get('instructors/:id/commission-history')
  @Header('Cache-Control', 'no-store')
  async getInstructorCommissionHistory(
    @Param('id', ParseObjectIdPipe) id: string,
  ): Promise<ApiResponse<ICommissionHistoryItem[]>> {
    const result = await this.revenueService.getInstructorCommissionHistory(id);
    return ApiResponse.success(result, 'Lấy lịch sử hoa hồng thành công');
  }

  /**
   * Lấy cấu hình hoa hồng mặc định toàn hệ thống
   */
  @Get('commission-config')
  @Header('Cache-Control', 'no-store')
  async getCommissionConfig(): Promise<ApiResponse<ICommissionConfig>> {
    const config = await this.revenueService.getCommissionConfig();
    return ApiResponse.success(config, 'Lấy cấu hình hoa hồng mặc định thành công');
  }

  /**
   * Cập nhật cấu hình hoa hồng mặc định hệ thống
   */
  @Patch('commission-config')
  @HttpCode(HttpStatus.OK)
  async updateCommissionConfig(
    @CurrentUser('id') adminId: string,
    @Body() dto: UpdateCommissionConfigDto,
  ): Promise<ApiResponse<ICommissionConfig>> {
    const result = await this.revenueService.updateCommissionConfig(dto, adminId);
    return ApiResponse.success(result, 'Cập nhật cấu hình hoa hồng mặc định thành công');
  }

  /**
   * Cập nhật tỷ lệ hoa hồng riêng cho từng giảng viên
   */
  @Patch('instructors/:id/commission')
  @HttpCode(HttpStatus.OK)
  async updateInstructorCommission(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: UpdateInstructorCommissionDto,
  ): Promise<ApiResponse<{ commissionRate: number; message: string }>> {
    const result = await this.revenueService.updateInstructorCommission(id, dto, adminId);
    return ApiResponse.success(result, result.message);
  }
}

