'use client';

import * as React from 'react';
import Link from 'next/link';
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
import {
  useInstructorsRevenueQuery,
  type InstructorsRevenueParams,
} from '../api/revenue-admin.api';
import { RevenueTimeFilter, type RevenueTimeFilterValue } from './revenue-time-filter';
import { DefaultCommissionDialog } from './default-commission-dialog';
import { formatVnd } from '../utils/revenue-format.util';

interface InstructorsRevenueTableProps {
  timeFilter: RevenueTimeFilterValue;
  onTimeFilterChange: (val: RevenueTimeFilterValue) => void;
}

const INSTRUCTOR_SORT_OPTIONS = [
  { value: 'revenue_desc', label: 'Doanh thu cao nhất' },
  { value: 'revenue_asc', label: 'Doanh thu thấp nhất' },
  { value: 'sales_desc', label: 'Lượt bán nhiều nhất' },
  { value: 'courses_desc', label: 'Nhiều khóa học nhất' },
  { value: 'commission_desc', label: 'Hoa hồng cao nhất' },
  { value: 'commission_asc', label: 'Hoa hồng thấp nhất' },
];

export function InstructorsRevenueTable({
  timeFilter,
  onTimeFilterChange,
}: InstructorsRevenueTableProps): React.JSX.Element {
  const [search, setSearch] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const [sort, setSort] = React.useState('revenue_desc');
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(10);
  const [isConfigOpen, setIsConfigOpen] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const queryParams: InstructorsRevenueParams = {
    ...timeFilter,
    page,
    limit,
    search: debouncedSearch,
    sort,
  };

  const { data, isLoading } = useInstructorsRevenueQuery(queryParams);

  const items = data?.items || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  const handleClearSearch = () => {
    setSearch('');
    setDebouncedSearch('');
    setPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Tab Header with Gear Icon */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/60">
        <div>
          <h3 className="text-lg font-bold text-foreground">Doanh Thu Giảng Viên</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Theo dõi hiệu suất bán hàng và quản lý tỷ lệ hoa hồng của từng đối tác giảng viên
          </p>
        </div>

        {/* Gear Button for Default Commission Config */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsConfigOpen(true)}
            className="h-9 px-3 text-xs font-medium gap-2 border-border/80 hover:bg-muted"
            title="Cấu hình hoa hồng mặc định"
          >
            <Icon icon="lucide:settings" className="size-4 text-primary" />
            <span className="hidden sm:inline">Cấu hình hoa hồng mặc định</span>
          </Button>
        </div>
      </div>

      {/* Filter & Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border/60">
        {/* Time Filter */}
        <RevenueTimeFilter
          value={timeFilter}
          onChange={(val) => {
            onTimeFilterChange(val);
            setPage(1);
          }}
        />

        {/* Search & Sort Group */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Icon
              icon="lucide:search"
              className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên hoặc email giảng viên..."
              className="h-9 pl-9 pr-8 text-xs bg-muted/40 border-border/50 focus-visible:bg-card"
            />
            {search && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground"
                aria-label="Xóa tìm kiếm"
              >
                <Icon icon="lucide:x" className="size-3.5" />
              </button>
            )}
          </div>

          {/* Sort Select */}
          <div className="w-full sm:w-48 shrink-0">
            <Select<string>
              value={sort}
              onValueChange={(val) => {
                if (val) {
                  setSort(val);
                  setPage(1);
                }
              }}
            >
              <SelectTrigger className="h-9 text-xs px-3">
                <span className="truncate">
                  {INSTRUCTOR_SORT_OPTIONS.find((opt) => opt.value === sort)?.label ||
                    'Doanh thu cao nhất'}
                </span>
              </SelectTrigger>
              <SelectContent align="end" className="min-w-48">
                {INSTRUCTOR_SORT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Instructors Table */}
      <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-2xs">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="w-[280px] text-xs font-semibold">Giảng viên</TableHead>
              <TableHead className="text-center text-xs font-semibold">Tổng khóa học</TableHead>
              <TableHead className="text-center text-xs font-semibold">Lượt bán</TableHead>
              <TableHead className="text-right text-xs font-semibold">Tổng doanh thu</TableHead>
              <TableHead className="text-center text-xs font-semibold">Hoa hồng Mindly</TableHead>
              <TableHead className="text-left text-xs font-semibold">Giao dịch gần nhất</TableHead>
              <TableHead className="text-right text-xs font-semibold">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [1, 2, 3, 4, 5].map((i) => (
                <TableRow key={i} className="animate-pulse">
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className="size-9 rounded-full bg-muted" />
                      <div className="space-y-1">
                        <div className="h-3.5 w-28 bg-muted rounded" />
                        <div className="h-3 w-36 bg-muted/60 rounded" />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center"><div className="h-3 w-8 bg-muted rounded mx-auto" /></TableCell>
                  <TableCell className="text-center"><div className="h-3 w-8 bg-muted rounded mx-auto" /></TableCell>
                  <TableCell className="text-right"><div className="h-3.5 w-24 bg-muted rounded ml-auto" /></TableCell>
                  <TableCell className="text-center"><div className="h-3 w-12 bg-muted rounded mx-auto" /></TableCell>
                  <TableCell><div className="h-3 w-28 bg-muted rounded" /></TableCell>
                  <TableCell className="text-right"><div className="h-7 w-20 bg-muted rounded ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-44 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <Icon icon="lucide:user-x" className="size-8 text-muted-foreground/50" />
                    <p className="text-xs">Không tìm thấy giảng viên nào phù hợp</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              items.map((inst) => (
                <TableRow key={inst.id} className="hover:bg-muted/40 transition-colors">
                  {/* Instructor Avatar + Name + Email */}
                  <TableCell className="py-3">
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase shrink-0">
                        {inst.fullName.charAt(0) || 'G'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">
                          {inst.fullName}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {inst.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>

                  {/* Total Courses */}
                  <TableCell className="text-center text-xs font-medium">
                    {inst.totalCourses}
                  </TableCell>

                  {/* Sales Count */}
                  <TableCell className="text-center text-xs font-medium">
                    {inst.successfulSales}
                  </TableCell>

                  {/* Total Revenue */}
                  <TableCell className="text-right text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    {formatVnd(inst.totalRevenue)}
                  </TableCell>

                  {/* Commission Rate Badge */}
                  <TableCell className="text-center">
                    <Badge variant="outline" className="text-xs font-semibold bg-blue-500/10 text-blue-600 border-blue-500/20">
                      {inst.commissionRate}%
                    </Badge>
                  </TableCell>

                  {/* Last Transaction */}
                  <TableCell className="text-xs text-muted-foreground">
                    {inst.lastTransactionDate || 'Chưa có'}
                  </TableCell>

                  {/* Action Link */}
                  <TableCell className="text-right">
                    <Link
                      href={`/admin/revenue/instructors/${inst.id}`}
                      className="inline-flex items-center h-8 px-2.5 rounded-lg text-xs font-medium text-primary hover:text-primary hover:bg-primary/10 transition-colors gap-1"
                    >
                      <span>Xem chi tiết</span>
                      <Icon icon="lucide:arrow-right" className="size-3.5" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Bar */}
      {total > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-card border border-border/60 rounded-xl text-xs select-none">
          <div className="text-muted-foreground text-xs">
            Tổng cộng <strong className="text-foreground font-semibold">{total}</strong> giảng viên
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Hiển thị</span>
              <div className="w-24 shrink-0">
                <Select<string>
                  value={String(limit)}
                  onValueChange={(val) => {
                    if (val) {
                      setLimit(Number(val));
                      setPage(1);
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

            <div className="text-muted-foreground">
              Trang <strong className="text-foreground">{page}</strong> /{' '}
              <strong className="text-foreground">{totalPages}</strong>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="size-8 p-0"
                onClick={() => setPage(1)}
                disabled={page <= 1}
                aria-label="Trang đầu"
              >
                <Icon icon="lucide:chevrons-left" className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="size-8 p-0"
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
                aria-label="Trang trước"
              >
                <Icon icon="lucide:chevron-left" className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="size-8 p-0"
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages}
                aria-label="Trang sau"
              >
                <Icon icon="lucide:chevron-right" className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="size-8 p-0"
                onClick={() => setPage(totalPages)}
                disabled={page >= totalPages}
                aria-label="Trang cuối"
              >
                <Icon icon="lucide:chevrons-right" className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Default Commission Dialog */}
      <DefaultCommissionDialog
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
      />
    </div>
  );
}
