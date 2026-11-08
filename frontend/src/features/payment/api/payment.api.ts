'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type {
  IApiResponse,
  ICreateOrderResponse,
  IOrderStatusResponse,
} from 'share-lib';
import { apiClient } from '@/lib/api-client';
import { enrollmentKeys } from '@/features/course/api/enrollment.api';
import { courseKeys } from '@/features/course/api/course.api';

export const paymentKeys = {
  all: ['payments'] as const,
  orderStatus: (orderCode: string) => [...paymentKeys.all, 'order-status', orderCode] as const,
};

export const paymentApi = {
  async createOrder(courseId: string): Promise<ICreateOrderResponse> {
    const res = await apiClient.post<IApiResponse<ICreateOrderResponse>>(
      '/payments/create-order',
      { courseId },
    );
    return res.data.data;
  },

  async getOrderStatus(orderCode: string): Promise<IOrderStatusResponse> {
    const res = await apiClient.get<IApiResponse<IOrderStatusResponse>>(
      `/payments/order-status/${orderCode}`,
    );
    return res.data.data;
  },
};

export function useCreateOrderMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (courseId: string) => paymentApi.createOrder(courseId),
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      const message =
        err.response?.data?.message || 'Không thể tạo đơn hàng thanh toán. Vui lòng thử lại sau.';
      toast.error(message);
    },
  });
}

export function useOrderStatusQuery(
  orderCode: string,
  options?: {
    enabled?: boolean;
    refetchInterval?: number | false | ((query: { state: { data?: IOrderStatusResponse } }) => number | false);
  },
) {
  return useQuery({
    queryKey: paymentKeys.orderStatus(orderCode),
    queryFn: () => paymentApi.getOrderStatus(orderCode),
    enabled: Boolean(orderCode) && (options?.enabled ?? true),
    refetchInterval: options?.refetchInterval ?? 3000,
    staleTime: 1000,
  });
}

