'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import type { IRevenueChartItem } from 'share-lib';
import { formatVnd } from '../utils/revenue-format.util';

interface RevenueChartProps {
  data?: IRevenueChartItem[];
  isLoading?: boolean;
}

export function RevenueChart({
  data = [],
  isLoading = false,
}: RevenueChartProps): React.JSX.Element {
  const [activeItem, setActiveItem] = React.useState<IRevenueChartItem | null>(null);

  const maxValue = React.useMemo(() => {
    if (!data.length) return 1000000;
    const max = Math.max(...data.map((d) => d.totalRevenue), 0);
    return max > 0 ? max * 1.15 : 1000000;
  }, [data]);

  if (isLoading) {
    return (
      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <div className="h-5 w-40 bg-muted rounded animate-pulse" />
          <div className="h-3.5 w-64 bg-muted/60 rounded animate-pulse mt-1" />
        </CardHeader>
        <CardContent className="h-72 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-muted-foreground text-xs">
            <Icon icon="lucide:loader-2" className="size-6 animate-spin text-primary" />
            <span>Đang tải số liệu biểu đồ...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isEmpty = !data.length || data.every((d) => d.totalRevenue === 0);

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <CardTitle className="text-base font-semibold">Biểu Đồ Doanh Thu & Hoa Hồng</CardTitle>
          <CardDescription className="text-xs mt-0.5">
            Biến động doanh thu toàn sàn, hoa hồng Mindly và thu nhập giảng viên
          </CardDescription>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs font-medium">
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-emerald-500" />
            <span className="text-muted-foreground">Tổng doanh thu</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-blue-500" />
            <span className="text-muted-foreground">Hoa hồng nền tảng</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-amber-500" />
            <span className="text-muted-foreground">Thu nhập giảng viên</span>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isEmpty ? (
          <div className="h-64 flex flex-col items-center justify-center text-muted-foreground gap-2">
            <Icon icon="lucide:bar-chart-2" className="size-10 text-muted-foreground/40" />
            <p className="text-xs">Không có dữ liệu doanh thu trong khoảng thời gian này</p>
          </div>
        ) : (
          <div className="relative">
            {/* Active Tooltip Display */}
            <div className="min-h-11 mb-2 px-3 py-1.5 bg-muted/30 border border-border/50 rounded-lg flex flex-wrap items-center justify-between gap-2 text-xs">
              {activeItem ? (
                <>
                  <span className="font-semibold text-foreground">
                    Thời gian: {activeItem.date} ({activeItem.orderCount} đơn)
                  </span>
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      Doanh thu: {formatVnd(activeItem.totalRevenue)}
                    </span>
                    <span className="text-blue-600 dark:text-blue-400 font-medium">
                      Mindly: {formatVnd(activeItem.platformCommission)}
                    </span>
                    <span className="text-amber-600 dark:text-amber-400 font-medium">
                      Giảng viên: {formatVnd(activeItem.instructorEarnings)}
                    </span>
                  </div>
                </>
              ) : (
                <span className="text-muted-foreground italic text-[11px]">
                  Rê chuột hoặc chạm vào các cột để xem chi tiết từng mốc thời gian
                </span>
              )}
            </div>

            {/* SVG Interactive Chart */}
            <div className="h-64 w-full overflow-x-auto overflow-y-hidden">
              <div
                className="h-full flex items-end gap-1.5 sm:gap-2 pb-6 min-w-[320px]"
                style={{ width: `${Math.max(100, data.length * 36)}px` }}
              >
                {data.map((item, idx) => {
                  const totalHeightPct = Math.min(
                    100,
                    Math.max(item.totalRevenue > 0 ? 6 : 2, (item.totalRevenue / maxValue) * 100),
                  );
                  const isHovered = activeItem?.date === item.date;

                  return (
                    <div
                      key={item.date || idx}
                      className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer"
                      onMouseEnter={() => setActiveItem(item)}
                      onClick={() => setActiveItem(item)}
                    >
                      {/* Bar Container */}
                      <div className="w-full flex justify-center items-end h-44 relative">
                        {/* Hover Highlight Column */}
                        <div
                          className={`w-full max-w-[28px] rounded-t-sm transition-all duration-150 flex flex-col justify-end overflow-hidden ${
                            isHovered
                              ? 'ring-2 ring-primary ring-offset-1 bg-emerald-500'
                              : 'bg-emerald-500/80 hover:bg-emerald-500'
                          }`}
                          style={{ height: `${totalHeightPct}%` }}
                        >
                          {/* Inner Platform segment if total > 0 */}
                          {item.totalRevenue > 0 && (
                            <div
                              className="w-full bg-blue-500/90"
                              style={{
                                height: `${Math.min(
                                  100,
                                  (item.platformCommission / item.totalRevenue) * 100,
                                )}%`,
                              }}
                            />
                          )}
                        </div>
                      </div>

                      {/* Label on X-axis */}
                      <div className="text-[10px] text-muted-foreground text-center mt-2 truncate w-full select-none">
                        {item.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

