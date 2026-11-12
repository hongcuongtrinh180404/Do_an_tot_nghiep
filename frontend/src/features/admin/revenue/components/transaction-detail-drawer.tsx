'use client';

import * as React from 'react';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRevenueTransactionDetailQuery } from '../api/revenue-admin.api';
import { formatVnd, formatDateTimeVn } from '../utils/revenue-format.util';
import { toast } from 'sonner';

interface TransactionDetailDrawerProps {
  orderCode: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function TransactionDetailDrawer({
  orderCode,
  isOpen,
  onClose,
}: TransactionDetailDrawerProps): React.JSX.Element | null {
  const { data: detail, isLoading } = useRevenueTransactionDetailQuery(
    orderCode || '',
    isOpen && Boolean(orderCode),
  );

  // Close on Escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Đã sao chép ${label}`);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over Panel */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-lg bg-card border-l border-border/80 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200 ease-out">
          {/* Header */}
          <div className="h-16 px-6 border-b border-border/60 flex items-center justify-between shrink-0 bg-muted/20">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Icon icon="lucide:receipt" className="size-4.5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Chi Tiết Giao Dịch</h3>
                <p className="text-[11px] text-muted-foreground font-mono">
                  {orderCode || '--'}
                </p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="size-8 p-0 text-muted-foreground hover:text-foreground"
              aria-label="Đóng chi tiết"
            >
              <Icon icon="lucide:x" className="size-4.5" />
            </Button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {isLoading ? (
              <div className="space-y-6 animate-pulse">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="space-y-2 p-4 bg-muted/30 rounded-xl border border-border/40">
                    <div className="h-4 w-32 bg-muted rounded" />
                    <div className="h-3 w-48 bg-muted/60 rounded" />
                    <div className="h-3 w-40 bg-muted/60 rounded" />
                  </div>
                ))}
              </div>
            ) : !detail ? (
              <div className="py-12 text-center text-muted-foreground space-y-2">
                <Icon icon="lucide:alert-circle" className="size-8 mx-auto text-destructive" />
                <p className="text-sm">Không tìm thấy thông tin giao dịch</p>
              </div>
            ) : (
              <>
                {/* Group 1: Thông tin đơn hàng */}
                <div className="bg-muted/20 rounded-xl p-4 border border-border/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Icon icon="lucide:file-text" className="size-3.5 text-primary" />
                      1. Thông tin đơn hàng
                    </span>
                    <Badge variant="outline" className="text-[11px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-medium">
                      {detail.status === 'paid' ? 'Thanh toán thành công' : detail.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Mã đơn hàng:</span>
                      <div className="flex items-center gap-1 font-mono font-semibold text-foreground">
                        <span>{detail.orderCode}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(detail.orderCode, 'mã đơn')}
                          className="text-muted-foreground hover:text-foreground"
                          title="Sao chép"
                        >
                          <Icon icon="lucide:copy" className="size-3" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <span className="text-muted-foreground block text-[11px]">Mã GD SePay:</span>
                      <span className="font-mono text-foreground font-medium">
                        {detail.sepayTransactionId || 'Không có'}
                      </span>
                    </div>

                    <div>
                      <span className="text-muted-foreground block text-[11px]">Ngày tạo đơn:</span>
                      <span className="text-foreground">{formatDateTimeVn(detail.createdAt)}</span>
                    </div>

                    <div>
                      <span className="text-muted-foreground block text-[11px]">Thời gian thanh toán:</span>
                      <span className="text-foreground font-medium">{formatDateTimeVn(detail.paidAt)}</span>
                    </div>

                    <div className="col-span-2">
                      <span className="text-muted-foreground block text-[11px]">Phương thức:</span>
                      <span className="text-foreground">{detail.paymentMethod}</span>
                    </div>
                  </div>
                </div>

                {/* Group 2: Thông tin học viên */}
                <div className="bg-muted/20 rounded-xl p-4 border border-border/60 space-y-2.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Icon icon="lucide:user" className="size-3.5 text-primary" />
                    2. Thông tin học viên
                  </span>
                  <div className="text-xs space-y-1">
                    <p className="font-semibold text-foreground text-sm">
                      {detail.student.fullName}
                    </p>
                    <p className="text-muted-foreground flex items-center gap-1.5">
                      <Icon icon="lucide:mail" className="size-3" />
                      <span>{detail.student.email}</span>
                    </p>
                  </div>
                </div>

                {/* Group 3: Thông tin khóa học */}
                <div className="bg-muted/20 rounded-xl p-4 border border-border/60 space-y-2.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Icon icon="lucide:book-open" className="size-3.5 text-primary" />
                    3. Thông tin khóa học
                  </span>
                  <div className="text-xs space-y-1.5">
                    <p className="font-semibold text-foreground text-sm">
                      {detail.course.title}
                    </p>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Giảng viên: <strong className="text-foreground">{detail.course.instructorName}</strong></span>
                      <span>Giá chốt: <strong className="text-foreground">{formatVnd(detail.course.lockedPrice)}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Group 4: Thông tin thanh toán */}
                <div className="bg-muted/20 rounded-xl p-4 border border-border/60 space-y-2.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Icon icon="lucide:credit-card" className="size-3.5 text-primary" />
                    4. Thông tin thanh toán
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Cần thanh toán:</span>
                      <span className="font-semibold text-foreground">{formatVnd(detail.amountDue)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Thực tế xác nhận:</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {formatVnd(detail.amountPaid)}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground block text-[11px]">Thời điểm giao dịch:</span>
                      <span className="text-foreground">{formatDateTimeVn(detail.paymentDate)}</span>
                    </div>
                  </div>
                </div>

                {/* Group 5: Phân chia doanh thu */}
                <div className="bg-primary/5 rounded-xl p-4 border border-primary/20 space-y-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5">
                    <Icon icon="lucide:pie-chart" className="size-3.5 text-primary" />
                    5. Phân chia doanh thu (Đã chốt)
                  </span>

                  {/* Ratio bar */}
                  <div className="space-y-1.5">
                    <div className="h-3 w-full bg-muted rounded-full overflow-hidden flex">
                      <div
                        className="bg-blue-500 h-full transition-all"
                        style={{ width: `${detail.platformCommissionRate}%` }}
                        title={`Mindly: ${detail.platformCommissionRate}%`}
                      />
                      <div
                        className="bg-amber-500 h-full transition-all"
                        style={{ width: `${detail.instructorCommissionRate}%` }}
                        title={`Giảng viên: ${detail.instructorCommissionRate}%`}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] font-medium">
                      <span className="text-blue-600 dark:text-blue-400">
                        Mindly ({detail.platformCommissionRate}%)
                      </span>
                      <span className="text-amber-600 dark:text-amber-400">
                        Giảng viên ({detail.instructorCommissionRate}%)
                      </span>
                    </div>
                  </div>

                  {/* Earnings Breakdown */}
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-primary/10 text-xs">
                    <div className="p-2.5 rounded-lg bg-card border border-border/60">
                      <span className="text-muted-foreground text-[11px] block">Mindly nhận:</span>
                      <span className="text-base font-bold text-blue-600 dark:text-blue-400">
                        {formatVnd(detail.platformEarnings)}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-card border border-border/60">
                      <span className="text-muted-foreground text-[11px] block">Giảng viên nhận:</span>
                      <span className="text-base font-bold text-amber-600 dark:text-amber-400">
                        {formatVnd(detail.instructorEarnings)}
                      </span>
                    </div>
                  </div>

                  <p className="text-[10px] text-muted-foreground italic text-center">
                    * Số tiền phân chia dựa trên tỷ lệ đã chốt tại thời điểm học viên tạo đơn hàng.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

