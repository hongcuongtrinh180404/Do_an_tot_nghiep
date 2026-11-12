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
import type { IRevenueTransactionItem } from 'share-lib';
import { TransactionCard } from './transaction-card';
import type { RevenuePaginationResult } from '../api/revenue-admin.api';

interface TransactionCardsListProps {
  data?: RevenuePaginationResult<IRevenueTransactionItem>;
  isLoading?: boolean;
  search: string;
  onSearchChange: (val: string) => void;
  sort: string;
  onSortChange: (val: string) => void;
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

export function TransactionCardsList({
  data,
  isLoading = false,
  search,
  onSearchChange,
  sort,
  onSortChange,
  page,
  onPageChange,
  limit,
  onLimitChange,
  onSelectTransaction,
}: TransactionCardsListProps): React.JSX.Element {
  const [localSearch, setLocalSearch] = React.useState(search);

  // Sync with prop when prop changes
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

  return (
    <div className="space-y-4">
      {/* Search & Sort Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border/60">
        {/* Unified Search Input */}
        <div className="relative flex-1">
          <Icon
            icon="lucide:search"
            className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
          />
          <Input
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Tìm mã đơn, học viên, khóa học, giảng viên..."
            className="h-9 pl-9 pr-8 text-xs bg-muted/40 border-border/50 focus-visible:bg-card"
          />
          {localSearch && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground rounded"
              aria-label="Xóa từ khóa tìm kiếm"
            >
              <Icon icon="lucide:x" className="size-3.5" />
            </button>
          )}
        </div>

        {/* Sort Select */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Sắp xếp:</span>
          <div className="w-44 shrink-0">
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
              <SelectContent align="end" className="min-w-44">
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

      {/* Cards List Content */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="w-full bg-card border border-border/50 rounded-xl p-5 animate-pulse space-y-3"
            >
              <div className="flex justify-between items-center">
                <div className="h-4 w-56 bg-muted rounded" />
                <div className="h-5 w-24 bg-muted rounded" />
              </div>
              <div className="flex gap-4">
                <div className="h-3.5 w-32 bg-muted/60 rounded" />
                <div className="h-3.5 w-32 bg-muted/60 rounded" />
                <div className="h-3.5 w-24 bg-muted/60 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="w-full bg-card border border-border/60 rounded-xl p-12 text-center flex flex-col items-center justify-center gap-3">
          <div className="size-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
            <Icon icon="lucide:receipt" className="size-6" />
          </div>
          <div>
            <h5 className="text-sm font-semibold text-foreground">Không tìm thấy giao dịch nào</h5>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              {search
                ? `Không có giao dịch nào khớp với từ khóa "${search}". Hãy thử tìm kiếm với từ khóa khác.`
                : 'Chưa có giao dịch thành công nào trong khoảng thời gian đã chọn.'}
            </p>
          </div>
          {search && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearSearch}
              className="h-8 text-xs mt-2"
            >
              Xóa bộ lọc tìm kiếm
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((tx) => (
            <TransactionCard
              key={tx.id || tx.orderCode}
              transaction={tx}
              onClick={onSelectTransaction}
            />
          ))}
        </div>
      )}

      {/* Pagination Bar */}
      {total > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-card border border-border/60 rounded-xl text-xs select-none">
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
