'use client';

import * as React from 'react';
import { Icon } from '@/components/ui/icon';
import type { IRevenueTransactionItem } from 'share-lib';
import { formatVnd, formatDateVn, formatTimeVn } from '../utils/revenue-format.util';

interface TransactionCardProps {
  transaction: IRevenueTransactionItem;
  onClick: (orderCode: string) => void;
}

export function TransactionCard({
  transaction,
  onClick,
}: TransactionCardProps): React.JSX.Element {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(transaction.orderCode);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(transaction.orderCode)}
      onKeyDown={handleKeyDown}
      className="group w-full bg-card hover:bg-muted/30 border border-border/60 hover:border-primary/40 rounded-xl p-4 sm:p-5 transition-all duration-150 cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-primary/40 shadow-2xs hover:shadow-xs"
      aria-label={`Xem chi tiết đơn hàng ${transaction.orderCode}`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Course & Order Info */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm sm:text-base font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
              {transaction.courseTitle}
            </h4>
            <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border/50">
              {transaction.orderCode}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Icon icon="lucide:user" className="size-3.5 text-muted-foreground/70" />
              <span>Người mua: <strong className="font-medium text-foreground">{transaction.studentName}</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <Icon icon="lucide:graduation-cap" className="size-3.5 text-muted-foreground/70" />
              <span>Giảng viên: <strong className="font-medium text-foreground">{transaction.instructorName}</strong></span>
            </div>
          </div>
        </div>

        {/* Center: Payment Date & Time */}
        <div className="md:px-4 shrink-0 flex items-center md:flex-col md:items-start gap-2 md:gap-0.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5 font-medium text-foreground">
            <Icon icon="lucide:calendar-days" className="size-3.5 text-primary" />
            <span>{formatDateVn(transaction.paidAt)}</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground/80 md:pl-5">
            <Icon icon="lucide:clock" className="size-3" />
            <span>{formatTimeVn(transaction.paidAt)}</span>
          </div>
        </div>

        {/* Right: Payment Amount & View Action */}
        <div className="shrink-0 flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-border/40">
          <div className="text-left md:text-right">
            <span className="text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {formatVnd(transaction.amount)}
            </span>
          </div>

          <div className="flex items-center gap-1 text-xs font-medium text-primary group-hover:translate-x-0.5 transition-transform">
            <span className="hidden sm:inline">Chi tiết</span>
            <Icon icon="lucide:chevron-right" className="size-4" />
          </div>
        </div>
      </div>
    </div>
  );
}

