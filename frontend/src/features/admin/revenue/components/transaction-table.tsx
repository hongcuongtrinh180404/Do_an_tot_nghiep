'use client';

import * as React from 'react';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { IRevenueTransactionItem } from 'share-lib';
import { toast } from 'sonner';
import { formatVnd, formatDateVn, formatTimeVn } from '../utils/revenue-format.util';
import type { RevenuePaginationResult } from '../api/revenue-admin.api';
import type { RevenueTimeFilterValue } from './revenue-time-filter';

export type TransactionStatusFilterType = 'ALL' | 'MATCHED' | 'UNDERPAID' | 'OVERPAID';

interface TransactionTableProps {
  data?: RevenuePaginationResult<IRevenueTransactionItem>;
  isLoading?: boolean;
  search: string;
  onSearchChange: (val: string) => void;
  statusFilter: TransactionStatusFilterType;
  onStatusFilterChange: (val: TransactionStatusFilterType) => void;
  sort: string;
  onSortChange: (val: string) => void;
  timeFilter?: RevenueTimeFilterValue;
  onResetTimeFilter?: () => void;
  page: number;
  onPageChange: (val: number) => void;
  limit: number;
  onLimitChange: (val: number) => void;
  onSelectTransaction: (orderCode: string) => void;
}

const SORT_OPTIONS = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'oldest', label: 'Cũ nhất' },
  { value: 'amount_desc', label: 'Số tiền cao nhất' },
  { value: 'amount_asc', label: 'Số tiền thấp nhất' },
];

const STATUS_FILTERS: { key: TransactionStatusFilterType; label: string; icon: string }[] = [
  { key: 'ALL', label: 'Tất cả', icon: 'lucide:layers' },
  { key: 'MATCHED', label: 'Thành công', icon: 'lucide:check-circle-2' },
  { key: 'UNDERPAID', label: 'Thiếu tiền', icon: 'lucide:alert-circle' },
  { key: 'OVERPAID', label: 'Thừa tiền', icon: 'lucide:arrow-up-right' },
];

/**
 * Determine display status for a transaction row
 */
export function getTransactionStatusInfo(tx: IRevenueTransactionItem): {
  type: 'MATCHED' | 'UNDERPAID' | 'OVERPAID';
  label: string;
  badgeClass: string;
  dotClass: string;
} {
  const recon = tx.reconciliationStatus;
  const received = tx.receivedAmount !== undefined ? tx.receivedAmount : tx.amount;
  const target = tx.amount;

  if (recon === 'UNDERPAID' || (received > 0 && received < target)) {
    return {
      type: 'UNDERPAID',
      label: 'Thiếu tiền',
      badgeClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25',
      dotClass: 'bg-amber-500',
    };
  }

  if (recon === 'OVERPAID' || received > target) {
    return {
      type: 'OVERPAID',
      label: 'Thừa tiền',
      badgeClass: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/25',
      dotClass: 'bg-sky-500',
    };
  }

  return {
    type: 'MATCHED',
    label: 'Thành công',
    badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25',
    dotClass: 'bg-emerald-500',
  };
}

export function TransactionTable({
  data,
  isLoading = false,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  sort,
  onSortChange,
  timeFilter,
  onResetTimeFilter,
  page,
  onPageChange,
  limit,
  onLimitChange,
  onSelectTransaction,
}: TransactionTableProps): React.JSX.Element {
  const [localSearch, setLocalSearch] = React.useState(search);

  const isTimeFilterActive =
    timeFilter &&
    timeFilter.timeRange !== 'all' &&
    timeFilter.timeRange !== '30days';
  const hasAnyFilterActive = Boolean(search || statusFilter !== 'ALL' || isTimeFilterActive);

  const handleResetAllFilters = () => {
    handleClearSearch();
    onStatusFilterChange('ALL');
    if (onResetTimeFilter) {
      onResetTimeFilter();
    }
  };

  // Sync prop changes
  React.useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  // Debounced search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== search) {
        onSearchChange(localSearch);
        onPageChange(1);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [localSearch, search, onSearchChange, onPageChange]);

  const items = data?.items || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  const handleClearSearch = () => {
    setLocalSearch('');
    onSearchChange('');
    onPageChange(1);
  };

  const handleCopy = (e: React.MouseEvent, text: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    toast.success(`Đã sao chép: ${text}`);
  };

  const handleKeyDownRow = (e: React.KeyboardEvent<HTMLTableRowElement>, orderCode: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelectTransaction(orderCode);
    }
  };

  return (
    <div className="space-y-4">
      {/* Integrated Toolbar: Search, Quick Status Filter & Sort */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border/60 shadow-2xs">
        {/* Left: Search input */}
        <div className="relative flex-1 min-w-[240px]">
          <Icon
            icon="lucide:search"
            className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
          />
          <Input
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Tìm theo mã đơn, học viên, khóa học..."
            className="h-9 pl-9 pr-8 text-xs bg-muted/40 border-border/50 focus-visible:bg-card"
          />
          {localSearch && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground rounded cursor-pointer"
              aria-label="Xóa từ khóa tìm kiếm"
            >
              <Icon icon="lucide:x" className="size-3.5" />
            </button>
          )}
        </div>

        {/* Center: Quick Status Filter Pills */}
        <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg border border-border/40 shrink-0 overflow-x-auto">
          {STATUS_FILTERS.map((f) => {
            const isActive = statusFilter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => {
                  onStatusFilterChange(f.key);
                  onPageChange(1);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap cursor-pointer select-none ${
                  isActive
                    ? 'bg-card text-foreground shadow-2xs border border-border/60'
                    : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
                }`}
              >
                <Icon icon={f.icon} className="size-3.5 shrink-0" />
                <span>{f.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right: Sort selector */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Sắp xếp:</span>
          <div className="w-40 shrink-0">
            <Select<string>
              value={sort}
              onValueChange={(val) => {
                if (val) {
                  onSortChange(val);
                  onPageChange(1);
                }
              }}
            >
              <SelectTrigger className="h-9 text-xs px-3">
                <span className="truncate">
                  {SORT_OPTIONS.find((opt) => opt.value === sort)?.label || 'Mới nhất'}
                </span>
              </SelectTrigger>
              <SelectContent align="end" className="min-w-40">
                {SORT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-2xs">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border/60">
              <TableHead className="w-[170px] text-xs font-semibold">Mã đơn hàng</TableHead>
              <TableHead className="w-[220px] text-xs font-semibold">Học viên</TableHead>
              <TableHead className="min-w-[240px] text-xs font-semibold">Khóa học</TableHead>
              <TableHead className="w-[180px] text-right text-xs font-semibold">
                Số tiền thực nhận
              </TableHead>
              <TableHead className="w-[140px] text-center text-xs font-semibold">Trạng thái</TableHead>
              <TableHead className="w-[160px] text-right text-xs font-semibold">
                Thời gian giao dịch
              </TableHead>
              <TableHead className="w-[48px] text-center text-xs font-semibold sr-only">
                Chi tiết
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {isLoading ? (
              // Loading Skeleton
              [1, 2, 3, 4, 5, 6].map((i) => (
                <TableRow key={i} className="animate-pulse">
                  <TableCell className="py-3.5">
                    <div className="h-4 w-28 bg-muted rounded" />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className="size-8 rounded-full bg-muted shrink-0" />
                      <div className="space-y-1">
                        <div className="h-3.5 w-24 bg-muted rounded" />
                        <div className="h-3 w-32 bg-muted/60 rounded" />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="h-3.5 w-48 bg-muted rounded" />
                      <div className="h-3 w-28 bg-muted/60 rounded" />
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="h-4 w-24 bg-muted rounded ml-auto" />
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="h-5 w-24 bg-muted rounded-full mx-auto" />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="h-3.5 w-28 bg-muted rounded ml-auto" />
                  </TableCell>
                  <TableCell>
                    <div className="size-4 bg-muted rounded mx-auto" />
                  </TableCell>
                </TableRow>
              ))
            ) : items.length === 0 ? (
              // Empty State
              <TableRow>
                <TableCell colSpan={7} className="h-52 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <div className="size-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground/60">
                      <Icon icon="lucide:receipt" className="size-5" />
                    </div>
                    <p className="text-sm font-semibold text-foreground">Không tìm thấy giao dịch nào</p>
                    <p className="text-xs text-muted-foreground max-w-sm">
                      {hasAnyFilterActive
                        ? 'Không có giao dịch nào khớp với bộ lọc hiện tại. Hãy thử tìm kiếm hoặc chọn khoảng thời gian khác.'
                        : 'Chưa phát sinh giao dịch nào trong khoảng thời gian đã chọn.'}
                    </p>
                    {hasAnyFilterActive && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleResetAllFilters}
                        className="h-8 text-xs mt-2"
                      >
                        Đặt lại bộ lọc
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              // Data Rows
              items.map((tx) => {
                const statusInfo = getTransactionStatusInfo(tx);
                const receivedAmount =
                  tx.receivedAmount !== undefined ? tx.receivedAmount : tx.amount;
                const requiredAmount = tx.amount;
                const hasDifference = receivedAmount !== requiredAmount;

                return (
                  <TableRow
                    key={tx.id || tx.orderCode}
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelectTransaction(tx.orderCode)}
                    onKeyDown={(e) => handleKeyDownRow(e, tx.orderCode)}
                    className="group hover:bg-muted/40 transition-colors cursor-pointer select-none"
                    aria-label={`Xem chi tiết đơn hàng ${tx.orderCode}`}
                  >
                    {/* Cột 1: Mã đơn hàng */}
                    <TableCell className="py-3 font-mono text-xs font-medium text-foreground">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold">{tx.orderCode}</span>
                        <button
                          type="button"
                          onClick={(e) => handleCopy(e, tx.orderCode)}
                          className="opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground hover:text-foreground transition-opacity rounded cursor-pointer"
                          title="Sao chép mã đơn"
                          aria-label="Sao chép mã đơn"
                        >
                          <Icon icon="lucide:copy" className="size-3" />
                        </button>
                      </div>
                    </TableCell>

                    {/* Cột 2: Học viên */}
                    <TableCell className="py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase shrink-0">
                          {tx.studentName?.charAt(0) || 'H'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">
                            {tx.studentName}
                          </p>
                          {tx.studentEmail && (
                            <p className="text-[11px] text-muted-foreground truncate">
                              {tx.studentEmail}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* Cột 3: Khóa học */}
                    <TableCell className="py-3">
                      <div className="min-w-0 space-y-0.5">
                        <p className="text-xs font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1">
                          {tx.courseTitle}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                          <Icon icon="lucide:user-check" className="size-3 shrink-0" />
                          <span>GV: {tx.instructorName}</span>
                        </p>
                      </div>
                    </TableCell>

                    {/* Cột 4: Số tiền thực nhận */}
                    <TableCell className="py-3 text-right">
                      <div className="flex flex-col items-end">
                        <span
                          className={`font-mono tabular-nums text-xs font-bold ${
                            statusInfo.type === 'MATCHED'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : statusInfo.type === 'UNDERPAID'
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-sky-600 dark:text-sky-400'
                          }`}
                        >
                          {formatVnd(receivedAmount)}
                        </span>
                        {hasDifference && (
                          <span className="text-[10px] text-muted-foreground font-mono tabular-nums">
                            Cần: {formatVnd(requiredAmount)}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* Cột 5: Trạng thái */}
                    <TableCell className="py-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${statusInfo.badgeClass}`}
                      >
                        <span className={`size-1.5 rounded-full shrink-0 ${statusInfo.dotClass}`} />
                        <span>{statusInfo.label}</span>
                      </span>
                    </TableCell>

                    {/* Cột 6: Thời gian giao dịch */}
                    <TableCell className="py-3 text-right font-mono tabular-nums text-xs text-muted-foreground">
                      <div className="flex flex-col items-end">
                        <span className="font-medium text-foreground">
                          {formatDateVn(tx.paidAt)}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {formatTimeVn(tx.paidAt)}
                        </span>
                      </div>
                    </TableCell>

                    {/* Action icon */}
                    <TableCell className="py-3 text-center pr-3">
                      <Icon
                        icon="lucide:chevron-right"
                        className="size-4 text-muted-foreground/60 group-hover:text-primary group-hover:translate-x-0.5 transition-all"
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Bar */}
      {total > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-card border border-border/60 rounded-xl text-xs select-none shadow-2xs">
          <div className="text-muted-foreground text-xs">
            Tổng cộng <strong className="text-foreground font-semibold">{total}</strong> giao dịch
          </div>

          <div className="flex items-center gap-4">
            {/* Page Size Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Hiển thị</span>
              <div className="w-24 shrink-0">
                <Select<string>
                  value={String(limit)}
                  onValueChange={(val) => {
                    if (val) {
                      onLimitChange(Number(val));
                      onPageChange(1);
                    }
                  }}
                >
                  <SelectTrigger className="h-8 text-xs px-2.5">
                    <span>{limit} dòng</span>
                  </SelectTrigger>
                  <SelectContent align="end" className="min-w-24">
                    {[10, 20, 50].map((size) => (
                      <SelectItem key={size} value={String(size)} className="text-xs">
                        {size} dòng
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Current Page */}
            <div className="text-muted-foreground">
              Trang <strong className="text-foreground">{page}</strong> /{' '}
              <strong className="text-foreground">{totalPages}</strong>
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="size-8 p-0"
                onClick={() => onPageChange(1)}
                disabled={page <= 1}
                aria-label="Trang đầu"
              >
                <Icon icon="lucide:chevrons-left" className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="size-8 p-0"
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
                aria-label="Trang trước"
              >
                <Icon icon="lucide:chevron-left" className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="size-8 p-0"
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages}
                aria-label="Trang sau"
              >
                <Icon icon="lucide:chevron-right" className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="size-8 p-0"
                onClick={() => onPageChange(totalPages)}
                disabled={page >= totalPages}
                aria-label="Trang cuối"
              >
                <Icon icon="lucide:chevrons-right" className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
