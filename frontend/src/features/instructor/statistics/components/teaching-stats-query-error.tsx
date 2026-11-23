'use client';

import { Button } from '@/components/ui/button';
import { teachingStatsErrorMessage } from '../utils/teaching-stats-error';

interface TeachingStatsQueryErrorProps {
  title: string;
  error: unknown;
  onRetry: () => void;
  isRetrying: boolean;
}

export function TeachingStatsQueryError({
  title,
  error,
  onRetry,
  isRetrying,
}: TeachingStatsQueryErrorProps): React.JSX.Element {
  return (
    <div role="alert" className="flex flex-col gap-3 p-5 text-left sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1 space-y-1">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">{teachingStatsErrorMessage(error)}</p>
      </div>
      <Button
        type="button"
        variant="outline"
        className="min-h-11 sm:min-h-8"
        onClick={onRetry}
        disabled={isRetrying}
      >
        {isRetrying ? 'Đang thử lại...' : 'Thử lại'}
      </Button>
    </div>
  );
}
