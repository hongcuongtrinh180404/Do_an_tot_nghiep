'use client';

import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import type { IRevenueOverviewKpi } from 'share-lib';
import { formatVnd } from '../utils/revenue-format.util';

interface RevenueKpiCardsProps {
  kpi?: IRevenueOverviewKpi;
  isLoading?: boolean;
}

export function RevenueKpiCards({
  kpi,
  isLoading = false,
}: RevenueKpiCardsProps): React.JSX.Element {
  const cards = [
    {
      title: 'Tổng doanh thu',
      value: formatVnd(kpi?.totalRevenue ?? 0),
      rawNumber: kpi?.totalRevenue ?? 0,
      description: 'Học viên đã thanh toán thành công',
      icon: 'lucide:circle-dollar-sign',
      iconColor: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
    },
    {
      title: 'Hoa hồng nền tảng',
      value: formatVnd(kpi?.platformCommission ?? 0),
      rawNumber: kpi?.platformCommission ?? 0,
      description: 'Mindly nhận theo tỷ lệ đã chốt',
      icon: 'lucide:pie-chart',
      iconColor: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Thu nhập giảng viên',
      value: formatVnd(kpi?.instructorEarnings ?? 0),
      rawNumber: kpi?.instructorEarnings ?? 0,
      description: 'Doanh thu thuộc về các giảng viên',
      icon: 'lucide:wallet-cards',
      iconColor: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
    },
    {
      title: 'Đơn hàng thành công',
      value: (kpi?.successfulOrders ?? 0).toLocaleString('vi-VN'),
      rawNumber: kpi?.successfulOrders ?? 0,
      description: 'Đơn hàng đã xác nhận thanh toán',
      icon: 'lucide:badge-check',
      iconColor: 'text-indigo-500',
      bgColor: 'bg-indigo-500/10',
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse border-border/60">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-3.5 w-24 bg-muted rounded" />
                <div className="h-7 w-32 bg-muted rounded" />
                <div className="h-3 w-40 bg-muted/60 rounded" />
              </div>
              <div className="size-11 rounded-xl bg-muted shrink-0" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card
          key={card.title}
          className="border-border/60 hover:shadow-xs transition-shadow"
        >
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                {card.title}
              </p>
              <p className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {card.value}
              </p>
              <p className="text-[11px] text-muted-foreground/80">
                {card.description}
              </p>
            </div>
            <div
              className={`size-11 rounded-xl ${card.bgColor} ${card.iconColor} flex items-center justify-center shrink-0`}
            >
              <Icon icon={card.icon} className="size-5.5" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

