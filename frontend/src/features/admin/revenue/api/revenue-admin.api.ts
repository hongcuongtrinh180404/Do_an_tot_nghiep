'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type {
  IApiResponse,
  IRevenueOverviewKpi,
  IRevenueChartItem,
  IRevenueTransactionItem,
  IRevenueTransactionDetail,
  IInstructorRevenueSummary,
  IInstructorRevenueDetail,
  IInstructorCourseRevenue,
  ICommissionConfig,
  ICommissionHistoryItem,
} from 'share-lib';
import { apiClient } from '@/lib/api-client';

export interface RevenuePaginationResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface RevenueTimeRangeParams {
  timeRange?: string;
  startDate?: string;
  endDate?: string;
}

export interface RevenueTransactionsParams extends RevenueTimeRangeParams {
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
  status?: string;
}

export interface InstructorsRevenueParams extends RevenueTimeRangeParams {
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
}

export const revenueAdminKeys = {
  all: ['admin-revenue'] as const,
  overview: (params: RevenueTimeRangeParams) =>
    [...revenueAdminKeys.all, 'overview', params] as const,
  chart: (params: RevenueTimeRangeParams) =>
    [...revenueAdminKeys.all, 'chart', params] as const,
  transactions: (params: RevenueTransactionsParams) =>
    [...revenueAdminKeys.all, 'transactions', params] as const,
  transactionDetail: (orderCode: string) =>
    [...revenueAdminKeys.all, 'transaction-detail', orderCode] as const,
  instructors: (params: InstructorsRevenueParams) =>
    [...revenueAdminKeys.all, 'instructors', params] as const,
  instructorDetail: (id: string, params: RevenueTimeRangeParams) =>
    [...revenueAdminKeys.all, 'instructor-detail', id, params] as const,
  instructorCourses: (id: string, params: RevenueTransactionsParams) =>
    [...revenueAdminKeys.all, 'instructor-courses', id, params] as const,
  instructorTransactions: (id: string, params: RevenueTransactionsParams) =>
    [...revenueAdminKeys.all, 'instructor-transactions', id, params] as const,
  instructorCommissionHistory: (id: string) =>
    [...revenueAdminKeys.all, 'instructor-commission-history', id] as const,
  commissionConfig: () => [...revenueAdminKeys.all, 'commission-config'] as const,
};

export interface UpdateCommissionConfigPayload {
  defaultRate: number;
  reason?: string;
}

export const revenueAdminApi = {
  async getOverview(params: RevenueTimeRangeParams): Promise<IRevenueOverviewKpi> {
    const { data } = await apiClient.get<IApiResponse<IRevenueOverviewKpi>>(
      '/payments/revenue/overview',
      { params },
    );
    return data.data;
  },

  async getChart(params: RevenueTimeRangeParams): Promise<IRevenueChartItem[]> {
    const { data } = await apiClient.get<IApiResponse<IRevenueChartItem[]>>(
      '/payments/revenue/chart',
      { params },
    );
    return data.data;
  },

  async getTransactions(
    params: RevenueTransactionsParams,
  ): Promise<RevenuePaginationResult<IRevenueTransactionItem>> {
    const { data } = await apiClient.get<
      IApiResponse<RevenuePaginationResult<IRevenueTransactionItem>>
    >('/payments/revenue/transactions', { params });
    return data.data;
  },

  async getTransactionDetail(orderCode: string): Promise<IRevenueTransactionDetail> {
    const { data } = await apiClient.get<IApiResponse<IRevenueTransactionDetail>>(
      `/payments/revenue/transactions/${orderCode}`,
    );
    return data.data;
  },

  async getInstructors(
    params: InstructorsRevenueParams,
  ): Promise<RevenuePaginationResult<IInstructorRevenueSummary>> {
    const { data } = await apiClient.get<
      IApiResponse<RevenuePaginationResult<IInstructorRevenueSummary>>
    >('/payments/revenue/instructors', { params });
    return data.data;
  },

  async getInstructorDetail(
    id: string,
    params: RevenueTimeRangeParams,
  ): Promise<IInstructorRevenueDetail> {
    const { data } = await apiClient.get<IApiResponse<IInstructorRevenueDetail>>(
      `/payments/revenue/instructors/${id}`,
      { params },
    );
    return data.data;
  },

  async getInstructorCourses(
    id: string,
    params: RevenueTransactionsParams,
  ): Promise<RevenuePaginationResult<IInstructorCourseRevenue>> {
    const { data } = await apiClient.get<
      IApiResponse<RevenuePaginationResult<IInstructorCourseRevenue>>
    >(`/payments/revenue/instructors/${id}/courses`, { params });
    return data.data;
  },

  async getInstructorTransactions(
    id: string,
    params: RevenueTransactionsParams,
  ): Promise<RevenuePaginationResult<IRevenueTransactionItem>> {
    const { data } = await apiClient.get<
      IApiResponse<RevenuePaginationResult<IRevenueTransactionItem>>
    >(`/payments/revenue/instructors/${id}/transactions`, { params });
    return data.data;
  },

  async getInstructorCommissionHistory(
    id: string,
  ): Promise<ICommissionHistoryItem[]> {
    const { data } = await apiClient.get<IApiResponse<ICommissionHistoryItem[]>>(
      `/payments/revenue/instructors/${id}/commission-history`,
    );
    return data.data;
  },

  async getCommissionConfig(): Promise<ICommissionConfig> {
    const { data } = await apiClient.get<IApiResponse<ICommissionConfig>>(
      '/payments/revenue/commission-config',
    );
    return data.data;
  },

  async updateCommissionConfig(
    payload: UpdateCommissionConfigPayload | number,
  ): Promise<ICommissionConfig> {
    const body =
      typeof payload === 'number'
        ? { defaultRate: payload }
        : payload;
    const { data } = await apiClient.patch<IApiResponse<ICommissionConfig>>(
      '/payments/revenue/commission-config',
      body,
    );
    return data.data;
  },

  async updateInstructorCommission(
    instructorId: string,
    payload: { commissionRate: number; reason: string },
  ): Promise<{ commissionRate: number; message: string }> {
    const { data } = await apiClient.patch<
      IApiResponse<{ commissionRate: number; message: string }>
    >(`/payments/revenue/instructors/${instructorId}/commission`, payload);
    return data.data;
  },
};

// React Query Hooks

export function useRevenueOverviewQuery(params: RevenueTimeRangeParams) {
  return useQuery({
    queryKey: revenueAdminKeys.overview(params),
    queryFn: () => revenueAdminApi.getOverview(params),
    staleTime: 60 * 1000,
  });
}

export function useRevenueChartQuery(params: RevenueTimeRangeParams) {
  return useQuery({
    queryKey: revenueAdminKeys.chart(params),
    queryFn: () => revenueAdminApi.getChart(params),
    staleTime: 60 * 1000,
  });
}

export function useRevenueTransactionsQuery(params: RevenueTransactionsParams) {
  return useQuery({
    queryKey: revenueAdminKeys.transactions(params),
    queryFn: () => revenueAdminApi.getTransactions(params),
    staleTime: 30 * 1000,
  });
}

export function useRevenueTransactionDetailQuery(orderCode: string, enabled = true) {
  return useQuery({
    queryKey: revenueAdminKeys.transactionDetail(orderCode),
    queryFn: () => revenueAdminApi.getTransactionDetail(orderCode),
    enabled: Boolean(orderCode) && enabled,
    staleTime: 60 * 1000,
  });
}

export function useInstructorsRevenueQuery(params: InstructorsRevenueParams) {
  return useQuery({
    queryKey: revenueAdminKeys.instructors(params),
    queryFn: () => revenueAdminApi.getInstructors(params),
    staleTime: 30 * 1000,
  });
}

export function useInstructorRevenueDetailQuery(
  id: string,
  params: RevenueTimeRangeParams,
) {
  return useQuery({
    queryKey: revenueAdminKeys.instructorDetail(id, params),
    queryFn: () => revenueAdminApi.getInstructorDetail(id, params),
    enabled: Boolean(id),
    staleTime: 60 * 1000,
  });
}

export function useInstructorCoursesRevenueQuery(
  id: string,
  params: RevenueTransactionsParams,
) {
  return useQuery({
    queryKey: revenueAdminKeys.instructorCourses(id, params),
    queryFn: () => revenueAdminApi.getInstructorCourses(id, params),
    enabled: Boolean(id),
    staleTime: 30 * 1000,
  });
}

export function useInstructorTransactionsQuery(
  id: string,
  params: RevenueTransactionsParams,
) {
  return useQuery({
    queryKey: revenueAdminKeys.instructorTransactions(id, params),
    queryFn: () => revenueAdminApi.getInstructorTransactions(id, params),
    enabled: Boolean(id),
    staleTime: 30 * 1000,
  });
}

export function useInstructorCommissionHistoryQuery(id: string) {
  return useQuery({
    queryKey: revenueAdminKeys.instructorCommissionHistory(id),
    queryFn: () => revenueAdminApi.getInstructorCommissionHistory(id),
    enabled: Boolean(id),
    staleTime: 30 * 1000,
  });
}

export function useCommissionConfigQuery() {
  return useQuery({
    queryKey: revenueAdminKeys.commissionConfig(),
    queryFn: () => revenueAdminApi.getCommissionConfig(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateCommissionConfigMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateCommissionConfigPayload | number) =>
      revenueAdminApi.updateCommissionConfig(payload),
    onSuccess: () => {
      toast.success(
        'Đã cập nhật hoa hồng mặc định và áp dụng đồng loạt cho tất cả giảng viên',
      );
      queryClient.invalidateQueries({ queryKey: revenueAdminKeys.commissionConfig() });
      queryClient.invalidateQueries({ queryKey: revenueAdminKeys.all });
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Không thể cập nhật cấu hình hoa hồng';
      toast.error(msg);
    },
  });
}

export function useUpdateInstructorCommissionMutation(instructorId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { commissionRate: number; reason: string }) =>
      revenueAdminApi.updateInstructorCommission(instructorId, payload),
    onSuccess: (data) => {
      toast.success(data.message || 'Cập nhật tỷ lệ hoa hồng giảng viên thành công');
      queryClient.invalidateQueries({
        queryKey: revenueAdminKeys.instructorDetail(instructorId, {}),
      });
      queryClient.invalidateQueries({
        queryKey: revenueAdminKeys.instructorCommissionHistory(instructorId),
      });
      queryClient.invalidateQueries({
        queryKey: revenueAdminKeys.all,
      });
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Không thể cập nhật tỷ lệ hoa hồng';
      toast.error(msg);
    },
  });
}
