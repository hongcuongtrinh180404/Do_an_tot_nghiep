'use client';

import type { UseQueryResult } from '@tanstack/react-query';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';

export type UserCoursesQuery<T> = Pick<UseQueryResult<T>,
  'data' | 'isPending' | 'isError' | 'error' | 'refetch'>;

export function UserCoursesLoading({ label }: { label: string }) {
  return (
    <div role="status" className="rounded-xl border border-border/60 bg-card p-6 text-sm text-muted-foreground">
      <div className="flex items-center gap-2">
        <Icon icon="lucide:loader-2" className="size-4 animate-spin" />
        {label}
      </div>
      <div className="mt-4 h-16 animate-pulse rounded-lg bg-muted/50" aria-hidden="true" />
    </div>
  );
}

export function UserCoursesError({ title, error, onRetry }: {
  title: string;
  error: unknown;
  onRetry: () => void;
}) {
  const response = error && typeof error === 'object' && 'response' in error
    ? (error as { response?: { data?: { message?: unknown } } }).response
    : undefined;
  const message = response?.data?.message;
  return (
    <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 space-y-3">
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {typeof message === 'string' ? message : 'Không thể tải dữ liệu từ hệ thống. Vui lòng thử lại.'}
        </p>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>
        <Icon icon="lucide:refresh-cw" className="mr-1.5 size-3.5" />
        Thử lại
      </Button>
    </div>
  );
}
