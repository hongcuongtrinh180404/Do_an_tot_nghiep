'use client';

import { Card } from '@/components/ui/card';

export type CategoryStatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

interface CategoryStatsCardsProps {
  totalCount: number;
  activeCount: number;
  inactiveCount: number;
  totalCoursesCount: number;
  currentStatus: CategoryStatusFilter;
  onStatusChange: (status: CategoryStatusFilter) => void;
  isLoading: boolean;
}

interface CategoryStatCard {
  key: string;
  label: string;
  value: number;
  status: CategoryStatusFilter | null;
}

export function CategoryStatsCards({
  totalCount,
  activeCount,
  inactiveCount,
  totalCoursesCount,
  currentStatus,
  onStatusChange,
  isLoading,
}: CategoryStatsCardsProps): React.JSX.Element {
  const cards: CategoryStatCard[] = [
    { key: 'total', label: 'Tổng danh mục', value: totalCount, status: 'ALL' },
    { key: 'active', label: 'Đang hiển thị', value: activeCount, status: 'ACTIVE' },
    { key: 'inactive', label: 'Đang tạm ẩn', value: inactiveCount, status: 'INACTIVE' },
    { key: 'courses', label: 'Khóa học liên kết', value: totalCoursesCount, status: null },
  ];

  return (
    <section
      aria-label="Thống kê danh mục"
      aria-busy={isLoading}
      className="shrink-0 grid grid-cols-2 xl:grid-cols-4 gap-3"
    >
      {cards.map((card) => {
        const status = card.status;
        const isSelected = status !== null && currentStatus === status;
        const content = (
          <>
            <span className="text-xs font-medium text-muted-foreground">{card.label}</span>
            <span
              data-stat-value
              className="text-xl sm:text-2xl font-semibold text-foreground tabular-nums"
            >
              {isLoading ? (
                <span
                  aria-label="Đang tải số liệu"
                  className="block h-7 sm:h-8 w-14 rounded bg-muted"
                />
              ) : (
                card.value.toLocaleString('vi-VN')
              )}
            </span>
          </>
        );

        return (
          <Card
            key={card.key}
            data-stat={card.key}
            className={`p-0 border [box-shadow:none] transition-colors ${
              isSelected
                ? 'border-foreground/30 bg-muted/40'
                : 'bg-card/60 border-border/60'
            } ${status !== null ? 'hover:border-foreground/25' : ''}`}
          >
            {status !== null ? (
              <button
                type="button"
                aria-pressed={isSelected}
                disabled={isLoading}
                onClick={() => onStatusChange(status)}
                className="flex flex-1 flex-col gap-1 p-3.5 text-left cursor-pointer rounded-xl focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring disabled:cursor-wait"
              >
                {content}
              </button>
            ) : (
              <div className="flex flex-1 flex-col gap-1 p-3.5">{content}</div>
            )}
          </Card>
        );
      })}
    </section>
  );
}
