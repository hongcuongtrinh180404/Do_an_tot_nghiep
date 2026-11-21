import React, { type ReactNode } from 'react';
import type { IAdminReviewReply } from 'share-lib';
import { Icon } from '@/components/ui/icon';

interface AdminReviewReplyDisplayProps {
  reply: IAdminReviewReply;
  showAuthor?: boolean;
  action?: ReactNode;
}

function formatReplyDate(value: Date | string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AdminReviewReplyDisplay({
  reply,
  showAuthor = false,
  action,
}: AdminReviewReplyDisplayProps): React.JSX.Element {
  return (
    <div
      data-ui="admin-review-reply-display"
      className="rounded-lg border border-border/80 bg-muted/30 p-3 sm:p-4 space-y-2"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <Icon icon="lucide:shield-check" className="size-4 shrink-0 text-primary" />
            Phản hồi từ ban quản trị
          </p>
          <p className="text-xs text-muted-foreground [overflow-wrap:anywhere]">
            {showAuthor && reply.adminName ? `${reply.adminName} · ` : ''}
            {formatReplyDate(reply.repliedAt)}
            {reply.updatedAt && ' · Đã chỉnh sửa'}
          </p>
        </div>
        {action}
      </div>
      <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap [overflow-wrap:anywhere]">
        {reply.content}
      </p>
      {showAuthor && reply.updatedAt && (
        <p className="text-xs text-muted-foreground [overflow-wrap:anywhere]">
          Cập nhật{reply.updatedByName ? ` bởi ${reply.updatedByName}` : ''} · {formatReplyDate(reply.updatedAt)}
        </p>
      )}
    </div>
  );
}
