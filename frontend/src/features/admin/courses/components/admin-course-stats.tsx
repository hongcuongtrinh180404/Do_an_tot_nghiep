'use client';

import { CourseStatusEnum, type IAdminCourseStats } from 'share-lib';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';

const STAT_CARDS: Array<{
  key: keyof IAdminCourseStats;
  status: CourseStatusEnum | 'ALL';
  label: string;
  icon: string;
  textClassName: string;
  activeClassName: string;
}> = [
  {
    key: 'total',
    status: 'ALL',
    label: 'Tổng khóa học',
    icon: 'lucide:book-open',
    textClassName: 'text-foreground',
    activeClassName: 'border-foreground/30 bg-muted/40',
  },
  {
    key: 'published',
    status: CourseStatusEnum.PUBLISHED,
    label: 'Đã xuất bản',
    icon: 'lucide:check-circle-2',
    textClassName: 'text-emerald-700 dark:text-emerald-300',
    activeClassName: 'border-emerald-500/40 bg-emerald-500/10',
  },
  {
    key: 'draft',
    status: CourseStatusEnum.DRAFT,
    label: 'Bản nháp',
    icon: 'lucide:file-edit',
    textClassName: 'text-amber-700 dark:text-amber-300',
    activeClassName: 'border-amber-500/40 bg-amber-500/10',
  },
  {
    key: 'archived',
    status: CourseStatusEnum.ARCHIVED,
    label: 'Ngưng bán',
    icon: 'lucide:archive',
    textClassName: 'text-muted-foreground',
    activeClassName: 'border-foreground/30 bg-muted/40',
  },
  {
    key: 'pendingApproval',
    status: CourseStatusEnum.PENDING_APPROVAL,
    label: 'Chờ duyệt',
    icon: 'lucide:clock',
    textClassName: 'text-sky-700 dark:text-sky-300',
    activeClassName: 'border-sky-500/40 bg-sky-500/10',
  },
];

interface AdminCourseStatsProps {
  stats?: IAdminCourseStats;
  currentStatus: string;
  isPending: boolean;
  isFetching: boolean;
  isError: boolean;
  onStatusChange: (status: string) => void;
  onRetry: () => void;
}

export function AdminCourseStats({
  stats,
  currentStatus,
  isPending,
  isFetching,
  isError,
  onStatusChange,
  onRetry,
}: AdminCourseStatsProps): React.JSX.Element {
  return (
    <section aria-label="Thống kê khóa học" aria-busy={isFetching} className="shrink-0 space-y-2">
      {/* Five equal columns on desktop; the total leads four status cards on smaller screens. */}
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
        {STAT_CARDS.map((card) => (
          <Card
            key={card.key}
            data-stat={card.key}
            className={`p-0 border [box-shadow:none] transition-colors ${
              card.key === 'total' ? 'col-span-2 xl:col-span-1' : ''
            } ${
              currentStatus === card.status
                ? card.activeClassName
                : 'bg-card/60 border-border/60 hover:border-foreground/25'
            }`}
          >
            <button
              type="button"
              aria-pressed={currentStatus === card.status}
              onClick={() => onStatusChange(card.status)}
              className="flex flex-1 flex-col gap-1 p-3.5 text-left cursor-pointer rounded-xl focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
            >
              <span className={`flex w-full items-center justify-between gap-2 ${card.textClassName}`}>
                <span className="text-xs font-medium">{card.label}</span>
                <Icon icon={card.icon} className="size-4 shrink-0" />
              </span>
              <span data-stat-value className="text-xl sm:text-2xl font-bold text-foreground tabular-nums">
                {stats ? (
                  stats[card.key].toLocaleString('vi-VN')
                ) : isPending ? (
                  <span
                    aria-label="Đang tải số liệu"
                    className="block h-7 w-14 rounded bg-muted"
                  />
                ) : (
                  <span className="text-base text-muted-foreground">—</span>
                )}
              </span>
            </button>
          </Card>
        ))}
      </div>
      {isError && (
        <p role="alert" className="text-xs text-muted-foreground">
          {stats
            ? 'Chưa thể cập nhật thống kê. Số liệu đang hiển thị có thể chưa mới nhất.'
            : 'Không tải được thống kê khóa học.'}{' '}
          <button
            type="button"
            onClick={onRetry}
            disabled={isFetching}
            className="underline underline-offset-2 cursor-pointer disabled:cursor-wait focus-visible:outline-2 focus-visible:outline-ring"
          >
            Thử lại
          </button>
        </p>
      )}
    </section>
  );
}
