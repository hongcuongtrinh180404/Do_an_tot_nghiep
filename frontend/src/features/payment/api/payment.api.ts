'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import type {
  IApiResponse,
  ICreateOrderResponse,
  IOrderStatusResponse,
  ICheckoutOrderResponse,
} from 'share-lib';
import { apiClient } from '@/lib/api-client';
import { getOrderPollInterval, isFatalPaymentError } from '../utils/checkout.util';

export const paymentKeys = {
  all: ['payments'] as const,
  orderStatus: (orderCode: string) => [...paymentKeys.all, 'order-status', orderCode] as const,
  orderDetail: (orderCode: string) => [...paymentKeys.all, 'order-detail', orderCode] as const,
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
      `/payments/order-status/${encodeURIComponent(orderCode)}`,
    );
    return res.data.data;
  },

  async getCheckoutOrder(orderCode: string): Promise<ICheckoutOrderResponse> {
    const res = await apiClient.get<IApiResponse<ICheckoutOrderResponse>>(
      `/payments/orders/${encodeURIComponent(orderCode)}`,
    );
    return res.data.data;
  },
};

export function useCreateOrderMutation() {
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
    initialData?: IOrderStatusResponse;
  },
) {
  return useQuery({
    queryKey: paymentKeys.orderStatus(orderCode),
    queryFn: () => paymentApi.getOrderStatus(orderCode),
    enabled: Boolean(orderCode) && (options?.enabled ?? true),
    initialData: options?.initialData,
    refetchInterval: (query) => getOrderPollInterval(query.state),
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: (query) => getOrderPollInterval(query.state) !== false,
    retry: false,
    staleTime: 1000,
  });
}

export function useCheckoutOrderQuery(orderCode: string) {
  return useQuery({
    queryKey: paymentKeys.orderDetail(orderCode),
    queryFn: () => paymentApi.getCheckoutOrder(orderCode),
    enabled: Boolean(orderCode),
    staleTime: 60000,
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => !isFatalPaymentError(error) && failureCount < 2,
  });
}
