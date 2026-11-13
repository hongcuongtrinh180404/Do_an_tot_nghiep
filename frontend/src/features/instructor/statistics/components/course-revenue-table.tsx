'use client';

import * as React from 'react';
import Image from 'next/image';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import type { IInstructorCourseRevenue } from 'share-lib';
import { formatVnd } from '@/features/admin/revenue/utils/revenue-format.util';
import type { IPaginatedResult } from '../api/teaching-stats.api';

interface CourseRevenueTableProps {
  data?: IPaginatedResult<IInstructorCourseRevenue>;
  isLoading?: boolean;
  search: string;
  onSearchChange: (val: string) => void;
  sort: 'revenue_desc' | 'earnings_desc' | 'sales_desc';
  onSortChange: (val: 'revenue_desc' | 'earnings_desc' | 'sales_desc') => void;
  page: number;
  onPageChange: (val: number) => void;
}

const SORT_OPTIONS: { value: 'revenue_desc' | 'earnings_desc' | 'sales_desc'; label: string }[] = [
  { value: 'revenue_desc', label: 'Doanh thu cao nhất' },
  { value: 'earnings_desc', label: 'Thu nhập cao nhất' },
  { value: 'sales_desc', label: 'Lượt mua nhiều nhất' },
];

function getStatusBadge(status: string) {
  switch (status?.toUpperCase()) {
    case 'PUBLISHED':
      return (
        <Badge variant="outline" className="text-[11px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-medium">
          Đang mở bán
        </Badge>
      );
    case 'ARCHIVED':
      return (
        <Badge variant="outline" className="text-[11px] bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-500/20 font-medium">
          Đã ngừng bán
        </Badge>
      );
    case 'PENDING_APPROVAL':
      return (
        <Badge variant="outline" className="text-[11px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-medium">
          Chờ phê duyệt
        </Badge>
      );
    case 'DRAFT':
    default:
      return (
        <Badge variant="outline" className="text-[11px] bg-muted text-muted-foreground border-border font-medium">
          Bản nháp
        </Badge>
      );
  }
}

export function CourseRevenueTable({
  data,
  isLoading = false,
  search,
  onSearchChange,
  sort,
  onSortChange,
  page,
  onPageChange,
}: CourseRevenueTableProps): React.JSX.Element {
  const [localSearch, setLocalSearch] = React.useState(search);

  // Sync prop changes
  React.useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  // Debounced search trigger
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== search) {
        onSearchChange(localSearch);
        onPageChange(1);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [localSearch, search, onSearchChange, onPageChange]);

  const items = data?.items || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  return (
    <div className="bg-card rounded-xl border border-border/70 p-5 shadow-2xs space-y-4">
      {/* Section Header & Subtitle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/40">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-foreground">
            Doanh thu theo khóa học
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Thống kê doanh thu và thu nhập thực nhận từ từng khóa học bạn sở hữu (kể cả khóa học ngừng bán).
          </p>
        </div>
        <div className="text-xs text-muted-foreground font-medium shrink-0">
          Tổng cộng: <strong className="text-foreground">{total}</strong> khóa học
        </div>
      </div>

      {/* Toolbar: Search & Sort Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-sm">
          <Icon
            icon="lucide:search"
            className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none"
          />
          <Input
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Tìm theo tên khóa học..."
            className="pl-9 pr-8 h-9 text-xs bg-background"
          />
          {localSearch && (
            <button
              type="button"
              onClick={() => {
                setLocalSearch('');
                onSearchChange('');
                onPageChange(1);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <Icon icon="lucide:x" className="size-3.5" />
            </button>
          )}
        </div>

        {/* Sort Select */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-muted-foreground whitespace-nowrap font-medium">Sắp xếp:</span>
          <div className="w-48">
            <Select<string>
              value={sort}
              onValueChange={(val) => {
                if (val) {
                  onSortChange(val as 'revenue_desc' | 'earnings_desc' | 'sales_desc');
                  onPageChange(1);
                }
              }}
            >
              <SelectTrigger className="h-9 text-xs px-3 font-medium bg-background border-border/80">
                <span className="truncate">
                  {SORT_OPTIONS.find((opt) => opt.value === sort)?.label || 'Doanh thu cao nhất'}
                </span>
              </SelectTrigger>
              <SelectContent align="end" className="min-w-48">
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

      {/* Data Table */}
      <div className="rounded-lg border border-border/60 overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs font-semibold text-muted-foreground min-w-[260px] pl-4">
                Khóa học
              </TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground w-28 text-center">
                Trạng thái
              </TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground text-right w-32">
                Lượt mua
              </TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground text-right w-40">
                Tổng doanh thu
              </TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground text-right w-44 pr-4">
                Thu nhập sau hoa hồng
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <TableRow key={idx}>
                  <TableCell className="pl-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="size-11 rounded-md bg-muted/70 animate-pulse shrink-0" />
                      <div className="space-y-1.5 flex-1">
                        <div className="h-3.5 w-44 bg-muted/70 animate-pulse rounded" />
                        <div className="h-3 w-24 bg-muted/50 animate-pulse rounded" />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center py-3">
                    <div className="h-5 w-20 bg-muted/60 animate-pulse rounded-full mx-auto" />
                  </TableCell>
                  <TableCell className="text-right py-3">
                    <div className="h-4 w-12 bg-muted/60 animate-pulse rounded ml-auto" />
                  </TableCell>
                  <TableCell className="text-right py-3">
                    <div className="h-4 w-20 bg-muted/60 animate-pulse rounded ml-auto" />
                  </TableCell>
                  <TableCell className="text-right pr-4 py-3">
                    <div className="h-4 w-20 bg-muted/60 animate-pulse rounded ml-auto" />
                  </TableCell>
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center">
                  <div className="size-10 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground mb-2">
                    <Icon icon="lucide:book-open" className="size-5" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    Không tìm thấy khóa học nào
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 max-w-sm mx-auto">
                    {localSearch
                      ? `Không có kết quả khớp với từ khóa "${localSearch}". Hãy thử tìm kiếm tên khác.`
                      : 'Bạn chưa tạo khóa học nào trên hệ thống hoặc chưa có dữ liệu trong khoảng thời gian này.'}
                  </p>
                  {localSearch && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setLocalSearch('');
                        onSearchChange('');
                        onPageChange(1);
                      }}
                      className="mt-3 text-xs"
                    >
                      Xóa bộ lọc tìm kiếm
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              items.map((course) => (
                <TableRow key={course.id} className="hover:bg-muted/30 transition-colors">
                  {/* Thumbnail & Title */}
                  <TableCell className="pl-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative size-12 rounded-md bg-muted overflow-hidden shrink-0 border border-border/40">
                        {course.thumbnailUrl ? (
                          <Image
                            src={course.thumbnailUrl}
                            alt={course.title}
                            fill
                            sizes="48px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="size-full flex items-center justify-center text-muted-foreground">
                            <Icon icon="lucide:video" className="size-5" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground line-clamp-1 hover:text-primary transition-colors">
                          {course.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Giá niêm yết: <span className="font-medium text-foreground tabular-nums">{formatVnd(course.price)}</span>
                        </p>
                      </div>
                    </div>
                  </TableCell>

                  {/* Status Badge */}
                  <TableCell className="text-center py-3">
                    {getStatusBadge(course.status)}
                  </TableCell>

                  {/* Sales Count */}
                  <TableCell className="text-right py-3 font-medium text-foreground tabular-nums">
                    {course.successfulSales > 0 ? (
                      <span>{course.successfulSales.toLocaleString('vi-VN')} <span className="text-xs text-muted-foreground">lượt</span></span>
                    ) : (
                      <span className="text-muted-foreground">0 lượt</span>
                    )}
                  </TableCell>

                  {/* Total Revenue */}
                  <TableCell className="text-right py-3 font-semibold text-foreground tabular-nums">
                    {formatVnd(course.totalRevenue)}
                  </TableCell>

                  {/* Instructor Earnings */}
                  <TableCell className="text-right pr-4 py-3 font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {formatVnd(course.instructorEarnings ?? 0)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <p className="text-xs text-muted-foreground">
            Hiển thị trang <strong className="text-foreground">{page}</strong> trên <strong className="text-foreground">{totalPages}</strong>
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || isLoading}
              onClick={() => onPageChange(page - 1)}
              className="h-8 px-2.5 text-xs"
            >
              <Icon icon="lucide:chevron-left" className="size-3.5 mr-1" />
              Trước
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .map((p, idx, arr) => (
                  <React.Fragment key={p}>
                    {idx > 0 && arr[idx - 1] !== p - 1 && (
                      <span className="px-1 text-xs text-muted-foreground">...</span>
                    )}
                    <Button
                      variant={page === p ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => onPageChange(p)}
                      className="size-8 p-0 text-xs font-medium"
                    >
                      {p}
                    </Button>
                  </React.Fragment>
                ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || isLoading}
              onClick={() => onPageChange(page + 1)}
              className="h-8 px-2.5 text-xs"
            >
              Sau
              <Icon icon="lucide:chevron-right" className="size-3.5 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

