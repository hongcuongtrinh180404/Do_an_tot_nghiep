'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';

export function AdminUsersPlaceholder(): React.JSX.Element {
  return (
    <div className="flex-1 min-h-0 flex flex-col p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Quản Lý Người Dùng
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Quản lý tài khoản, trạng thái hoạt động và phân quyền người dùng trong toàn hệ thống.
          </p>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/60 bg-card/60 backdrop-blur-xs shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Tổng người dùng
            </CardTitle>
            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Icon icon="lucide:users" className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">--</div>
            <p className="text-[11px] text-muted-foreground mt-1">Đang chờ kết nối API</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur-xs shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Giảng viên
            </CardTitle>
            <div className="size-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Icon icon="lucide:graduation-cap" className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">--</div>
            <p className="text-[11px] text-muted-foreground mt-1">Role: Instructor</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur-xs shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Sinh viên
            </CardTitle>
            <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Icon icon="lucide:user-check" className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">--</div>
            <p className="text-[11px] text-muted-foreground mt-1">Role: Student</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur-xs shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Quản trị viên
            </CardTitle>
            <div className="size-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Icon icon="lucide:shield-check" className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">--</div>
            <p className="text-[11px] text-muted-foreground mt-1">Role: Admin</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Placeholder Frame */}
      <Card className="flex-1 min-h-[380px] border-border/60 border-dashed bg-card/40 flex flex-col items-center justify-center text-center p-8 rounded-xl shadow-xs">
        <div className="size-16 rounded-2xl bg-muted/80 border border-border/60 flex items-center justify-center mb-4 text-muted-foreground shadow-xs">
          <Icon icon="lucide:table-2" className="size-8" />
        </div>

        <h3 className="text-base font-semibold text-foreground">
          Khu Vực Bảng Dữ Liệu Danh Sách Người Dùng
        </h3>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-md mt-1.5 leading-relaxed">
          Trang mẫu và cấu trúc điều hướng đã sẵn sàng. Giao diện bảng dữ liệu người dùng (BaseDataTable) và API quản lý sẽ được tích hợp tại bước tiếp theo.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-primary/10 text-primary px-3 py-1.5 rounded-full border border-primary/20">
            <Icon icon="lucide:check-circle-2" className="size-3.5" />
            Sidebar & Routing: Hoàn tất
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-muted text-muted-foreground px-3 py-1.5 rounded-full border border-border/60">
            <Icon icon="lucide:code-2" className="size-3.5" />
            User Table: Đang chờ code
          </span>
        </div>
      </Card>
    </div>
  );
}
