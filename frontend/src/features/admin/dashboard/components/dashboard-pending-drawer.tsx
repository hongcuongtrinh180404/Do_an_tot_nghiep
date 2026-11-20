'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/icon';
import type { PendingTaskCategory } from '../types';
import { PENDING_TASKS_DATA } from '../constants/mock-dashboard-data';

interface DashboardPendingDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DashboardPendingDrawer({
  isOpen,
  onClose,
}: DashboardPendingDrawerProps): React.JSX.Element | null {
  const router = useRouter();
  const [filterType, setFilterType] = React.useState<'all' | PendingTaskCategory>('all');

  const filteredTasks = React.useMemo(() => {
    if (filterType === 'all') return PENDING_TASKS_DATA;
    return PENDING_TASKS_DATA.filter((task) => task.type === filterType);
  }, [filterType]);

  const counts = React.useMemo(() => ({
    all: PENDING_TASKS_DATA.length,
    course: PENDING_TASKS_DATA.filter((t) => t.type === 'course').length,
    instructor: PENDING_TASKS_DATA.filter((t) => t.type === 'instructor').length,
    review: PENDING_TASKS_DATA.filter((t) => t.type === 'review').length,
  }), []);

  if (!isOpen) return null;

  const handleNavigate = (route: string) => {
    onClose();
    router.push(route);
  };

  const getBadgeStyle = (type: PendingTaskCategory) => {
    switch (type) {
      case 'course':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'instructor':
        return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20';
      case 'review':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs transition-opacity animate-in fade-in"
      />

      {/* Drawer */}
      <aside className="fixed top-0 right-0 z-50 h-screen w-full max-w-lg bg-card border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Icon icon="lucide:clipboard-check" className="size-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Công việc đang chờ Admin xử lý
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Tổng cộng {counts.all} yêu cầu cần phê duyệt & kiểm duyệt
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
          >
            <Icon icon="lucide:x" className="size-4" />
          </button>
        </div>

        {/* Filter Pills */}
        <div className="p-4 border-b border-border/60 bg-card">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`p-2.5 rounded-xl text-left border transition cursor-pointer ${
                filterType === 'all'
                  ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
                  : 'border-border/60 bg-muted/20 hover:border-border'
              }`}
            >
              <p className="text-base font-extrabold text-foreground tabular-nums">
                {counts.all}
              </p>
              <p className="text-[11px] font-semibold text-primary">Tất cả</p>
            </button>

            <button
              type="button"
              onClick={() => setFilterType('course')}
              className={`p-2.5 rounded-xl text-left border transition cursor-pointer ${
                filterType === 'course'
                  ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
                  : 'border-border/60 bg-muted/20 hover:border-border'
              }`}
            >
              <p className="text-base font-extrabold text-foreground tabular-nums">
                {counts.course}
              </p>
              <p className="text-[11px] font-medium text-muted-foreground">Khóa học</p>
            </button>

            <button
              type="button"
              onClick={() => setFilterType('instructor')}
              className={`p-2.5 rounded-xl text-left border transition cursor-pointer ${
                filterType === 'instructor'
                  ? 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/20'
                  : 'border-border/60 bg-muted/20 hover:border-border'
              }`}
            >
              <p className="text-base font-extrabold text-foreground tabular-nums">
                {counts.instructor}
              </p>
              <p className="text-[11px] font-medium text-muted-foreground">Giảng viên</p>
            </button>

            <button
              type="button"
              onClick={() => setFilterType('review')}
              className={`p-2.5 rounded-xl text-left border transition cursor-pointer ${
                filterType === 'review'
                  ? 'border-rose-500 bg-rose-500/10 ring-2 ring-rose-500/20'
                  : 'border-border/60 bg-muted/20 hover:border-border'
              }`}
            >
              <p className="text-base font-extrabold text-foreground tabular-nums">
                {counts.review}
              </p>
              <p className="text-[11px] font-medium text-muted-foreground">Đánh giá</p>
            </button>
          </div>
        </div>

        {/* Tasks List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {filteredTasks.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              Không có công việc nào trong danh mục này cần xử lý.
            </div>
          ) : (
            filteredTasks.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-xl border border-border/80 hover:border-primary/40 bg-card transition flex items-start justify-between gap-3 shadow-2xs"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getBadgeStyle(
                        item.type,
                      )}`}
                    >
                      {item.badgeLabel}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      • {item.timeAgo}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-foreground leading-snug">
                    {item.title}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{item.actor}</p>
                </div>

                <button
                  type="button"
                  onClick={() => handleNavigate(item.route)}
                  className="shrink-0 px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground text-[11px] font-semibold transition cursor-pointer"
                >
                  Đi tới xử lý
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border/60 bg-muted/20 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">
            Nhấn &quot;Đi tới xử lý&quot; để mở trang nghiệp vụ
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-card border border-border text-foreground hover:bg-muted transition cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </aside>
    </>
  );
}
