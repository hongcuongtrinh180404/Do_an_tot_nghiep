'use client';

import * as React from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useInstructorRevenueDetailQuery,
  useInstructorCoursesRevenueQuery,
  useInstructorTransactionsQuery,
  useInstructorCommissionHistoryQuery,
} from '../api/revenue-admin.api';
import { RevenueTimeFilter, type RevenueTimeFilterValue } from './revenue-time-filter';
import { TransactionCard } from './transaction-card';
import { TransactionDetailDrawer } from './transaction-detail-drawer';
import { InstructorCommissionDialog } from './instructor-commission-dialog';
import { formatVnd, formatDateTimeVn } from '../utils/revenue-format.util';

interface InstructorDetailViewProps {
  instructorId: string;
}

export function InstructorDetailView({
  instructorId,
}: InstructorDetailViewProps): React.JSX.Element {
  const [timeFilter, setTimeFilter] = React.useState<RevenueTimeFilterValue>({
    timeRange: '30days',
  });

  const [coursesPage, setCoursesPage] = React.useState(1);
  const [txPage, setTxPage] = React.useState(1);
  const [isCommissionModalOpen, setIsCommissionModalOpen] = React.useState(false);
  const [selectedOrderCode, setSelectedOrderCode] = React.useState<string | null>(null);

  // Queries
  const detailQuery = useInstructorRevenueDetailQuery(instructorId, timeFilter);
  const coursesQuery = useInstructorCoursesRevenueQuery(instructorId, {
    ...timeFilter,
    page: coursesPage,
    limit: 5,
  });
  const txQuery = useInstructorTransactionsQuery(instructorId, {
    ...timeFilter,
    page: txPage,
    limit: 5,
  });
  const historyQuery = useInstructorCommissionHistoryQuery(instructorId);

  const instructor = detailQuery.data?.instructor;
  const kpi = detailQuery.data?.kpi;
  const commissionRate = instructor?.commissionRate ?? 30;
  const instructorShare = Number((100 - commissionRate).toFixed(2));

  return (
    <div className="flex-1 min-h-0 flex flex-col p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Navigation Back Button */}
      <div className="flex items-center gap-3 shrink-0">
        <Link
          href="/admin/revenue?tab=instructors"
          className="inline-flex items-center h-9 px-3 text-xs font-medium gap-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <Icon icon="lucide:arrow-left" className="size-4" />
          <span>Quay lại danh sách giảng viên</span>
        </Link>
      </div>

      {/* Instructor Profile Header Card */}
      <div className="bg-card p-5 rounded-xl border border-border/60 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="size-14 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xl uppercase shrink-0">
            {instructor?.fullName?.charAt(0) || 'G'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-foreground">
                {instructor?.fullName || 'Đang tải...'}
              </h2>
              <Badge variant="outline" className="text-[11px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-medium capitalize">
                {instructor?.status || 'Active'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{instructor?.email}</p>
            {instructor?.createdAt && (
              <p className="text-[11px] text-muted-foreground/80 mt-1">
                Gia nhập nền tảng: {formatDateTimeVn(instructor.createdAt)}
              </p>
            )}
          </div>
        </div>

        {/* Time Filter for Detail Page */}
        <div className="shrink-0 w-full sm:w-auto">
          <RevenueTimeFilter
            value={timeFilter}
            onChange={(val) => {
              setTimeFilter(val);
              setCoursesPage(1);
              setTxPage(1);
            }}
          />
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/60">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Tổng doanh thu</p>
              <p className="text-xl sm:text-2xl font-bold text-foreground">
                {formatVnd(kpi?.totalRevenue ?? 0)}
              </p>
              <p className="text-[11px] text-muted-foreground/80">Từ các khóa học của giảng viên</p>
            </div>
            <div className="size-11 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
              <Icon icon="lucide:circle-dollar-sign" className="size-5.5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Thu nhập giảng viên</p>
              <p className="text-xl sm:text-2xl font-bold text-foreground">
                {formatVnd(kpi?.instructorEarnings ?? 0)}
              </p>
              <p className="text-[11px] text-muted-foreground/80">Số tiền giảng viên thực nhận</p>
            </div>
            <div className="size-11 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
              <Icon icon="lucide:wallet" className="size-5.5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Tổng khóa học</p>
              <p className="text-xl sm:text-2xl font-bold text-foreground">
                {kpi?.totalCourses ?? 0}
              </p>
              <p className="text-[11px] text-muted-foreground/80">Khóa học đã khởi tạo trên sàn</p>
            </div>
            <div className="size-11 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
              <Icon icon="lucide:book-open" className="size-5.5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Lượt bán thành công</p>
              <p className="text-xl sm:text-2xl font-bold text-foreground">
                {kpi?.successfulSales ?? 0}
              </p>
              <p className="text-[11px] text-muted-foreground/80">Đơn hàng trong khoảng thời gian</p>
            </div>
            <div className="size-11 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
              <Icon icon="lucide:badge-check" className="size-5.5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Card Tỷ lệ hoa hồng hiện tại */}
      <div className="bg-card p-5 rounded-xl border border-border/60 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Icon icon="lucide:pie-chart" className="size-4.5 text-primary" />
              <span>Tỷ Lệ Hoa Hồng Hiện Tại</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Áp dụng cho toàn bộ khóa học của giảng viên này đối với các đơn hàng mới
            </p>
          </div>

          <Button
            size="sm"
            onClick={() => setIsCommissionModalOpen(true)}
            className="h-8.5 px-3.5 text-xs font-medium gap-1.5"
          >
            <Icon icon="lucide:edit-3" className="size-3.5" />
            <span>Thay đổi tỷ lệ hoa hồng</span>
          </Button>
        </div>

        {/* Visual Ratio Progress Bar */}
        <div className="space-y-2 pt-1">
          <div className="h-3.5 w-full bg-muted rounded-full overflow-hidden flex">
            <div
              className="bg-blue-500 h-full transition-all duration-300"
              style={{ width: `${commissionRate}%` }}
              title={`Mindly: ${commissionRate}%`}
            />
            <div
              className="bg-amber-500 h-full transition-all duration-300"
              style={{ width: `${instructorShare}%` }}
              title={`Giảng viên: ${instructorShare}%`}
            />
          </div>

          <div className="flex justify-between items-center text-xs font-semibold">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <span className="size-2.5 rounded-full bg-blue-500" />
              <span>Nền tảng Mindly: {commissionRate}%</span>
            </div>
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <span className="size-2.5 rounded-full bg-amber-500" />
              <span>Giảng viên hưởng: {instructorShare}%</span>
            </div>
          </div>
        </div>

        {instructor?.commissionRateUpdatedAt && (
          <p className="text-[11px] text-muted-foreground italic">
            Cập nhật gần nhất lúc: {formatDateTimeVn(instructor.commissionRateUpdatedAt)}
          </p>
        )}
      </div>

      {/* Doanh thu theo khóa học */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-foreground">Doanh Thu Theo Khóa Học</h3>
        <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-2xs">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="text-xs font-semibold">Tên khóa học</TableHead>
                <TableHead className="text-center text-xs font-semibold">Trạng thái</TableHead>
                <TableHead className="text-right text-xs font-semibold">Giá bán hiện tại</TableHead>
                <TableHead className="text-center text-xs font-semibold">Lượt bán</TableHead>
                <TableHead className="text-right text-xs font-semibold">Tổng doanh thu</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coursesQuery.isLoading ? (
                [1, 2, 3].map((i) => (
                  <TableRow key={i} className="animate-pulse">
                    <TableCell><div className="h-4 w-48 bg-muted rounded" /></TableCell>
                    <TableCell className="text-center"><div className="h-4 w-16 bg-muted rounded mx-auto" /></TableCell>
                    <TableCell className="text-right"><div className="h-4 w-20 bg-muted rounded ml-auto" /></TableCell>
                    <TableCell className="text-center"><div className="h-4 w-10 bg-muted rounded mx-auto" /></TableCell>
                    <TableCell className="text-right"><div className="h-4 w-24 bg-muted rounded ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : (coursesQuery.data?.items || []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-28 text-center text-xs text-muted-foreground">
                    Chưa có khóa học nào phát sinh doanh thu trong khoảng thời gian này
                  </TableCell>
                </TableRow>
              ) : (
                (coursesQuery.data?.items || []).map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-semibold text-xs text-foreground">
                      {c.title}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="text-[11px] uppercase">
                        {c.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs font-medium">
                      {formatVnd(c.price)}
                    </TableCell>
                    <TableCell className="text-center text-xs font-semibold">
                      {c.successfulSales}
                    </TableCell>
                    <TableCell className="text-right text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      {formatVnd(c.totalRevenue)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Giao dịch gần đây (Card ngang) */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-foreground">Giao Dịch Gần Đây Của Giảng Viên</h3>
        <p className="text-xs text-muted-foreground">
          Danh sách các đơn hàng thanh toán thành công trong khoảng thời gian đã chọn
        </p>

        {txQuery.isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-card border border-border/50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (txQuery.data?.items || []).length === 0 ? (
          <div className="p-8 bg-card border border-border/60 rounded-xl text-center text-xs text-muted-foreground">
            Chưa có giao dịch nào của giảng viên này trong khoảng thời gian đã chọn
          </div>
        ) : (
          <div className="space-y-3">
            {(txQuery.data?.items || []).map((tx) => (
              <TransactionCard
                key={tx.id || tx.orderCode}
                transaction={tx}
                onClick={(code) => setSelectedOrderCode(code)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Lịch sử điều chỉnh hoa hồng */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
          <Icon icon="lucide:history" className="size-4 text-primary" />
          <span>Lịch Sử Điều Chỉnh Hoa Hồng</span>
        </h3>

        <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-2xs">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="text-xs font-semibold">Thời gian</TableHead>
                <TableHead className="text-center text-xs font-semibold">Phạm vi</TableHead>
                <TableHead className="text-center text-xs font-semibold">Tỷ lệ cũ</TableHead>
                <TableHead className="text-center text-xs font-semibold">Tỷ lệ mới</TableHead>
                <TableHead className="text-xs font-semibold">Admin thực hiện</TableHead>
                <TableHead className="text-xs font-semibold">Lý do điều chỉnh</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historyQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-xs text-muted-foreground animate-pulse">
                    Đang tải lịch sử...
                  </TableCell>
                </TableRow>
              ) : (historyQuery.data || []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-xs text-muted-foreground">
                    Chưa có lịch sử điều chỉnh hoa hồng nào cho giảng viên này
                  </TableCell>
                </TableRow>
              ) : (
                (historyQuery.data || []).map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDateTimeVn(h.createdAt)}
                    </TableCell>
                    <TableCell className="text-center">
                      {h.targetType === 'SYSTEM' ? (
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 whitespace-nowrap"
                        >
                          Toàn hệ thống
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 whitespace-nowrap"
                        >
                          Tùy chỉnh riêng
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center text-xs font-medium text-muted-foreground">
                      {h.oldRate}%
                    </TableCell>
                    <TableCell className="text-center text-xs font-bold text-primary">
                      {h.newRate}%
                    </TableCell>
                    <TableCell className="text-xs font-medium text-foreground whitespace-nowrap">
                      {h.adminName}
                    </TableCell>
                    <TableCell className="text-xs text-foreground max-w-xs">
                      {h.reason}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Transaction Detail Drawer */}
      <TransactionDetailDrawer
        orderCode={selectedOrderCode}
        isOpen={Boolean(selectedOrderCode)}
        onClose={() => setSelectedOrderCode(null)}
      />

      {/* Commission Edit Dialog */}
      {instructor && (
        <InstructorCommissionDialog
          instructorId={instructor.id}
          instructorName={instructor.fullName}
          currentRate={commissionRate}
          isOpen={isCommissionModalOpen}
          onClose={() => setIsCommissionModalOpen(false)}
        />
      )}
    </div>
  );
}
