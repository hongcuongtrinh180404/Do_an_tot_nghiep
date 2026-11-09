'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Icon } from '@/components/ui/icon';
import { useCheckoutOrderQuery, useOrderStatusQuery } from '../api/payment.api';
import { enrollmentKeys } from '@/features/course/api/enrollment.api';
import { courseKeys } from '@/features/course/api/course.api';
import { OrderStatusEnum } from 'share-lib';
import { calculateSecondsRemaining, formatCountdown, getCurrentPaymentInfo, isFatalPaymentError, requiresPaymentReview, shouldCheckExpiry } from '../utils/checkout.util';

interface CheckoutViewProps {
  orderCode: string;
}

function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
}

export function CheckoutView({ orderCode }: CheckoutViewProps): React.JSX.Element {
  const queryClient = useQueryClient();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const expiryCheckedKey = useRef<string | null>(null);
  const copyTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: checkout, isLoading, error: checkoutError, refetch: refetchDetails } = useCheckoutOrderQuery(orderCode);

  const {
    data: orderStatus,
    error: statusError,
    dataUpdatedAt,
    refetch,
  } = useOrderStatusQuery(orderCode, {
    enabled: Boolean(checkout),
    initialData: checkout,
  });

  const status = orderStatus?.status === OrderStatusEnum.PAID ? orderStatus
    : checkout?.status === OrderStatusEnum.PAID ? checkout : orderStatus ?? checkout;
  const isError = (!checkout && Boolean(checkoutError)) || isFatalPaymentError(checkoutError) || isFatalPaymentError(statusError);
  const isPaid = status?.status === OrderStatusEnum.PAID;
  const isExpired = status?.status === OrderStatusEnum.EXPIRED;
  const isCancelled = status?.status === OrderStatusEnum.CANCELLED;
  const needsReview = requiresPaymentReview(status?.reconciliationStatus);

  useEffect(() => {
    if (checkout && status?.status === OrderStatusEnum.PENDING && checkout.receivedAmount !== status.receivedAmount) {
      void refetchDetails();
    }
  }, [checkout, status?.status, status?.receivedAmount, refetchDetails]);

  useEffect(() => () => {
    if (copyTimeout.current) clearTimeout(copyTimeout.current);
  }, []);

  // Invalidate queries when order is paid
  useEffect(() => {
    if (isPaid) {
      void queryClient.invalidateQueries({ queryKey: enrollmentKeys.all });
      void queryClient.invalidateQueries({ queryKey: courseKeys.all });
    }
  }, [isPaid, queryClient]);

  // Countdown timer logic
  useEffect(() => {
    if (!status?.expiresAt || isPaid || isExpired || isCancelled || needsReview) return;
    const key = `${orderCode}:${status.expiresAt}`;
    const clockOffset = new Date(status.serverTime).getTime() - dataUpdatedAt;

    const updateTimer = () => {
      const diff = calculateSecondsRemaining(status.expiresAt, Date.now(), clockOffset);
      setSecondsRemaining(diff);

      if (shouldCheckExpiry(key, diff, expiryCheckedKey.current)) {
        expiryCheckedKey.current = key;
        void refetch();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [orderCode, status?.expiresAt, status?.serverTime, dataUpdatedAt, isPaid, isExpired, isCancelled, needsReview, refetch]);

  const countdownFormatted = formatCountdown(secondsRemaining ?? 0);

  const handleCopy = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      toast.success(`Đã sao chép ${fieldName}`);
      if (copyTimeout.current) clearTimeout(copyTimeout.current);
      copyTimeout.current = setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast.error('Không thể sao chép');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center py-12 px-4">
        <div className="flex flex-col items-center gap-3">
          <Icon icon="lucide:loader-2" className="size-10 animate-spin text-[#027D88]" />
          <p className="text-sm font-medium text-neutral-600">Đang tải thông tin thanh toán...</p>
        </div>
      </div>
    );
  }

  if (isError || !status || !checkout) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full bg-white border border-[#e5e7eb] rounded-2xl p-8 text-center shadow-xs">
          <div className="size-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
            <Icon icon="lucide:alert-triangle" className="size-6" />
          </div>
          <h2 className="text-lg font-bold text-neutral-900">Không tìm thấy đơn hàng</h2>
          <p className="text-sm text-neutral-600 mt-2">
            Đơn hàng không tồn tại, bạn không có quyền xem hoặc đã xảy ra sự cố.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/courses"
              className="px-4 py-2 rounded-xl border border-[#e5e7eb] text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
            >
              Về danh sách khóa học
            </Link>
            <button
              type="button"
              onClick={() => { void refetchDetails(); void refetch(); }}
              className="px-4 py-2 rounded-xl bg-[#027D88] text-white text-xs font-semibold hover:bg-[#02666F] transition-colors"
            >
              Thử lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  const course = checkout.course;
  // Never show a stale QR for the full price after a partial transfer has been received.
  const paymentInfo = getCurrentPaymentInfo(checkout, status);

  return (
    <div className="w-full min-h-screen bg-[#fbfbfb] py-8 lg:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1100px] mx-auto space-y-6">
        {(statusError || checkoutError) && (
          <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Kết nối đang gián đoạn, hệ thống sẽ kiểm tra lại. Nếu đã chuyển tiền, vui lòng không chuyển thêm.
          </p>
        )}
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href={course ? `/courses/${course.id}` : '/courses'}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#027D88] hover:text-[#02666F] transition-colors"
          >
            <Icon icon="lucide:arrow-left" className="size-4" />
            <span>Quay lại trang khóa học</span>
          </Link>
          <span className="text-xs font-medium text-neutral-500">
            Mã đơn hàng: <strong className="text-neutral-800">{orderCode}</strong>
          </span>
        </div>

        {/* ============================================================== */}
        {/* SUCCESS STATE WHEN PAID                                        */}
        {/* ============================================================== */}
        {isPaid ? (
          <div className="rounded-3xl border border-emerald-200 bg-white p-8 sm:p-12 text-center shadow-sm space-y-6 animate-fade-in">
            <div className="size-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <Icon icon="lucide:check-circle-2" className="size-12" />
            </div>

            <div className="space-y-2 max-w-lg mx-auto">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-neutral-900">
                Thanh toán thành công!
              </h2>
              <p className="text-sm text-neutral-600">
                Hệ thống SePay đã ghi nhận giao dịch của bạn. Quyền truy cập khóa học đã được kích hoạt tức thì.
              </p>
            </div>

            {course && (
              <div className="max-w-md mx-auto p-4 rounded-2xl bg-neutral-50 border border-[#e5e7eb] flex items-center gap-4 text-left">
                <div className="relative size-16 rounded-xl overflow-hidden bg-neutral-200 shrink-0">
                  {course.thumbnailUrl ? (
                    <Image
                      src={course.thumbnailUrl}
                      alt={course.title}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="size-full flex items-center justify-center text-neutral-400">
                      <Icon icon="lucide:book-open" className="size-6" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-neutral-900 line-clamp-1">{course.title}</h4>
                  <p className="text-[11px] text-neutral-500 mt-0.5">Truy cập trọn đời • Đã kích hoạt</p>
                </div>
              </div>
            )}

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href={course ? `/courses/${course.id}` : '/my-courses'}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#027D88] hover:bg-[#02666F] text-white font-bold py-3 px-8 text-sm shadow-sm transition-all"
              >
                <Icon icon="lucide:play-circle" className="size-4" />
                <span>Bắt đầu học ngay</span>
              </Link>
              <Link
                href="/my-courses"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-[#e5e7eb] bg-white hover:bg-neutral-50 text-neutral-700 font-semibold py-3 px-6 text-sm transition-all"
              >
                <span>Xem khóa học của tôi</span>
              </Link>
            </div>
          </div>
        ) : isExpired || isCancelled || needsReview ? (
          /* ============================================================== */
          /* EXPIRED STATE                                                  */
          /* ============================================================== */
          <div className="rounded-3xl border border-amber-200 bg-white p-8 sm:p-12 text-center shadow-sm space-y-6">
            <div className="size-20 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <Icon icon="lucide:clock" className="size-10" />
            </div>

            <div className="space-y-2 max-w-lg mx-auto">
              <h2 className="text-xl sm:text-2xl font-extrabold text-neutral-900">
                {needsReview ? 'Giao dịch cần được đối soát' : isCancelled ? 'Đơn hàng đã được hủy' : 'Đơn hàng đã hết hạn thanh toán'}
              </h2>
              <p className="text-sm text-neutral-600">
                Mã đơn hàng: <strong className="text-neutral-800">{orderCode}</strong>.
                {' '}Nếu đã chuyển tiền, vui lòng không chuyển thêm hoặc tạo đơn mới. Bạn có thể kiểm tra lại thanh toán hoặc liên hệ quản trị viên kèm mã đơn để đối soát.
              </p>
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => { void refetch(); void refetchDetails(); }}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#027D88] hover:bg-[#02666F] text-white font-bold py-3 px-8 text-sm shadow-sm transition-all"
              >
                Kiểm tra lại thanh toán
              </button>
              {!needsReview && status.receivedAmount === 0 && <Link
                href={course ? `/courses/${course.id}` : '/courses'}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#027D88] hover:bg-[#02666F] text-white font-bold py-3 px-8 text-sm shadow-sm transition-all"
              >
                <Icon icon="lucide:rotate-ccw" className="size-4" />
                <span>Chưa chuyển tiền? Về trang khóa học</span>
              </Link>}
            </div>
          </div>
        ) : (
          /* ============================================================== */
          /* ACTIVE PENDING CHECKOUT GRID (2 COLUMNS)                       */
          /* ============================================================== */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* CỘT TRÁI: VIETQR & THÔNG TIN CHUYỂN KHOẢN (7 CỘT) */}
            <div className="lg:col-span-7 space-y-6">
              <div className="rounded-2xl border border-[#e5e7eb] bg-white p-6 sm:p-8 shadow-xs space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-neutral-900">Thanh toán chuyển khoản VietQR</h3>
                  <p className="text-xs text-neutral-500 mt-1">
                    Mở app ngân hàng quét mã QR hoặc chuyển khoản thủ công với nội dung bên dưới
                  </p>
                </div>

                {status.receivedAmount > 0 && (
                  <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    Đã nhận {formatVND(status.receivedAmount)}. Vui lòng chuyển phần còn thiếu {formatVND(Math.max(0, status.amount - status.receivedAmount))} với cùng mã đơn trước khi hết hạn.
                  </p>
                )}

                {!paymentInfo && (
                  <p role="status" className="text-sm text-neutral-600">
                    Đang cập nhật thông tin chuyển khoản. Vui lòng không sử dụng mã QR cũ.
                    {' '}<button type="button" onClick={() => void refetchDetails()} className="font-semibold text-[#027D88] underline">Tải lại thông tin</button>
                  </p>
                )}

                {/* VietQR Code Display */}
                {paymentInfo?.qrUrl && (
                  <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-neutral-50 border border-[#e5e7eb]">
                    <div className="relative size-60 sm:size-64 bg-white p-3 rounded-xl shadow-xs border border-neutral-200">
                      <Image
                        src={paymentInfo.qrUrl}
                        alt="Mã VietQR thanh toán SePay"
                        width={256}
                        height={256}
                        priority
                        unoptimized
                        className="size-full object-contain"
                      />
                    </div>
                    <span className="text-[11px] text-neutral-500 mt-3 font-medium flex items-center gap-1.5">
                      <Icon icon="lucide:scan" className="size-3.5 text-[#027D88]" />
                      Quét mã bằng bất kỳ ứng dụng ngân hàng nào
                    </span>
                  </div>
                )}

                {/* Bank Information Details */}
                {paymentInfo && (
                  <div className="space-y-3 pt-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                      Thông tin tài khoản nhận tiền
                    </h4>

                    <div className="divide-y divide-[#f2f2f2] rounded-xl border border-[#e5e7eb] bg-white overflow-hidden text-xs sm:text-sm">
                      {/* Ngân hàng */}
                      <div className="p-3 sm:p-3.5 flex items-center justify-between">
                        <span className="text-neutral-500">Ngân hàng:</span>
                        <span className="font-bold text-neutral-900">{paymentInfo.bankCode}</span>
                      </div>

                      {/* Số tài khoản */}
                      <div className="p-3 sm:p-3.5 flex items-center justify-between gap-2">
                        <span className="text-neutral-500 shrink-0">Số tài khoản:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-neutral-900 text-sm sm:text-base">
                            {paymentInfo.bankAccount}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(paymentInfo.bankAccount, 'Số tài khoản')}
                            className="p-1 rounded-md text-[#027D88] hover:bg-[#f3fcfc] transition-colors"
                            title="Sao chép số tài khoản"
                          >
                            <Icon
                              icon={copiedField === 'Số tài khoản' ? 'lucide:check' : 'lucide:copy'}
                              className="size-4"
                            />
                          </button>
                        </div>
                      </div>

                      {/* Tên chủ tài khoản */}
                      <div className="p-3 sm:p-3.5 flex items-center justify-between">
                        <span className="text-neutral-500">Chủ tài khoản:</span>
                        <span className="font-bold text-neutral-900 uppercase">
                          {paymentInfo.accountName}
                        </span>
                      </div>

                      {/* Số tiền */}
                      <div className="p-3 sm:p-3.5 flex items-center justify-between gap-2">
                        <span className="text-neutral-500 shrink-0">Số tiền:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-base sm:text-lg text-[#027D88]">
                            {formatVND(paymentInfo.amount)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(String(paymentInfo.amount), 'Số tiền')}
                            className="p-1 rounded-md text-[#027D88] hover:bg-[#f3fcfc] transition-colors"
                            title="Sao chép số tiền"
                          >
                            <Icon
                              icon={copiedField === 'Số tiền' ? 'lucide:check' : 'lucide:copy'}
                              className="size-4"
                            />
                          </button>
                        </div>
                      </div>

                      {/* Nội dung chuyển khoản */}
                      <div className="p-3 sm:p-3.5 flex items-center justify-between gap-2 bg-[#f3fcfc]">
                        <div className="min-w-0">
                          <span className="text-[#027D88] font-medium block text-xs">
                            Nội dung chuyển khoản (Bắt buộc):
                          </span>
                          <span className="font-mono font-extrabold text-[#027D88] text-base sm:text-lg tracking-wider">
                            {paymentInfo.orderCode}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(paymentInfo.orderCode, 'Nội dung chuyển khoản')}
                          className="px-3 py-1.5 rounded-lg bg-[#027D88] text-white text-xs font-semibold hover:bg-[#02666F] transition-colors flex items-center gap-1.5 shrink-0"
                        >
                          <Icon
                            icon={copiedField === 'Nội dung chuyển khoản' ? 'lucide:check' : 'lucide:copy'}
                            className="size-3.5"
                          />
                          <span>{copiedField === 'Nội dung chuyển khoản' ? 'Đã sao chép' : 'Sao chép'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Important Alert Notice */}
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-amber-950">
                    <Icon icon="lucide:alert-circle" className="size-4 text-amber-600 shrink-0" />
                    <span>Lưu ý quan trọng</span>
                  </div>
                  <p className="leading-relaxed">
                    Vui lòng giữ nguyên nội dung chuyển khoản <strong>{orderCode}</strong> để hệ thống tự động xác minh qua SePay Webhook và mở khóa học tức thì.
                  </p>
                </div>
              </div>
            </div>

            {/* CỘT PHẢI: TÓM TẮT ĐƠN HÀNG & BỘ ĐẾM GIỜ (5 CỘT) */}
            <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
              {/* Countdown & Status Monitor Card */}
              <div className="rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    Thời hạn thanh toán
                  </span>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#027D88]">
                    <span className="relative flex size-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#027D88] opacity-75" />
                      <span className="relative inline-flex rounded-full size-2 bg-[#027D88]" />
                    </span>
                    <span>Đang chờ chuyển khoản...</span>
                  </div>
                </div>

                <div className="flex items-center justify-center p-4 rounded-xl bg-neutral-50 border border-neutral-200">
                  <div className="text-center">
                    <div className="font-mono text-3xl sm:text-4xl font-extrabold text-neutral-900 tracking-wider">
                      {countdownFormatted}
                    </div>
                    <span className="text-[11px] text-neutral-500 mt-1 block">
                      Mã thanh toán sẽ hết hạn nếu chưa thanh toán đủ
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-neutral-500 flex items-center justify-center gap-1.5">
                  <Icon icon="lucide:refresh-cw" className="size-3.5 animate-spin text-[#027D88]" />
                  <span>Tự động cập nhật mỗi 3 giây qua SePay</span>
                </div>
              </div>

              {/* Course & Pricing Summary Card */}
              {course && (
                <div className="rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-xs space-y-5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                    Khóa học đăng ký
                  </h4>

                  <div className="flex gap-4 items-start">
                    <div className="relative size-16 rounded-xl overflow-hidden bg-neutral-100 shrink-0 border border-neutral-200">
                      {course.thumbnailUrl ? (
                        <Image
                          src={course.thumbnailUrl}
                          alt={course.title}
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="size-full flex items-center justify-center text-neutral-400">
                          <Icon icon="lucide:book-open" className="size-6" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-bold text-neutral-900 leading-snug line-clamp-2">
                        {course.title}
                      </h3>
                      {course.instructorName && (
                        <p className="text-xs text-neutral-500 mt-1">
                          Giảng viên: {course.instructorName}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-[#f2f2f2] pt-4 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-neutral-600">
                      <span>Giá gốc:</span>
                      <span className={checkout.discountAmount > 0 ? 'line-through' : ''}>
                        {formatVND(checkout.originalPrice)}
                      </span>
                    </div>

                    {checkout.discountAmount > 0 && (
                      <div className="flex items-center justify-between text-emerald-600 font-semibold">
                        <span>Tiết kiệm:</span>
                        <span>-{formatVND(checkout.discountAmount)}</span>
                      </div>
                    )}

                    <div className="border-t border-[#f2f2f2] pt-2 flex items-baseline justify-between">
                      <span className="text-sm font-bold text-neutral-900">Tổng thanh toán:</span>
                      <span className="text-xl font-extrabold text-[#027D88]">
                        {formatVND(status.amount)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
