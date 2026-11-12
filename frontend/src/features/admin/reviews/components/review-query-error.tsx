'use client';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';

interface ReviewQueryErrorProps {
  title: string;
  onRetry: () => void;
  isRetrying: boolean;
}

export function ReviewQueryError({ title, onRetry, isRetrying }: ReviewQueryErrorProps) {
  return (
    <div role="alert" className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-8 text-center">
      <Icon icon="lucide:alert-circle" className="size-5 text-destructive" />
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground">
        Không thể tải dữ liệu từ máy chủ. Vui lòng kiểm tra kết nối và thử lại.
      </p>
      <Button type="button" variant="outline" size="sm" onClick={onRetry} disabled={isRetrying}>
        <Icon icon="lucide:refresh-cw" className={`mr-1.5 size-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
        {isRetrying ? 'Đang thử lại...' : 'Thử lại'}
      </Button>
    </div>
  );
}
