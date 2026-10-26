'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';

export interface AdminTabPlaceholderStat {
  label: string;
  value?: string;
  hint?: string;
  icon?: string;
}

export interface AdminTabPlaceholderProps {
  title: string;
  description: string;
  icon: string;
  badge?: string;
  stats?: AdminTabPlaceholderStat[];
}

export function AdminTabPlaceholder({
  title,
  description,
  icon,
  badge = 'Phân hệ quản trị',
  stats,
}: AdminTabPlaceholderProps): React.JSX.Element {
  return (
    <div className="flex-1 min-h-0 flex flex-col p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20 uppercase tracking-wider">
              {badge}
            </span>
            <span className="text-xs text-muted-foreground/80">•</span>
            <span className="text-xs text-muted-foreground font-medium">Chưa triển khai nghiệp vụ</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            {title}
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-3xl leading-relaxed">
            {description}
          </p>
        </div>
      </div>

      {/* KPI Stats Overview Placeholder */}
      {stats && stats.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, idx) => (
            <Card key={idx} className="border-border/60 bg-card/60 backdrop-blur-xs shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
                <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Icon icon={stat.icon || icon} className="size-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {stat.value || '--'}
                </div>
                {stat.hint && (
                  <p className="text-[11px] text-muted-foreground mt-1 truncate">
                    {stat.hint}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Main Empty State Content Canvas */}
      <Card className="flex-1 min-h-[380px] border-border/60 border-dashed bg-card/40 flex flex-col items-center justify-center text-center p-8 rounded-xl shadow-xs">
        <div className="size-16 rounded-2xl bg-muted/80 border border-border/60 flex items-center justify-center mb-4 text-primary shadow-xs">
          <Icon icon={icon} className="size-8" />
        </div>

        <h3 className="text-base sm:text-lg font-semibold text-foreground">
          {title}
        </h3>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-lg mt-2 leading-relaxed">
          Cấu trúc điều hướng và khung layout của trang đã hoàn tất. Nghiệp vụ chi tiết, bảng dữ liệu và các API quản lý tương ứng sẽ được tích hợp trong giai đoạn tiếp theo.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1.5 rounded-full border border-emerald-500/20">
            <Icon icon="lucide:check-circle-2" className="size-3.5" />
            Điều hướng & Layout: Hoàn tất
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-muted text-muted-foreground px-3 py-1.5 rounded-full border border-border/60">
            <Icon icon="lucide:code-2" className="size-3.5" />
            Nghiệp vụ chi tiết: Sắp ra mắt
          </span>
        </div>
      </Card>
    </div>
  );
}
