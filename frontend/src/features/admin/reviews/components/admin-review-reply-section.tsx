'use client';

import * as React from 'react';
import type { IReview } from 'share-lib';
import { AdminReviewReplyDisplay } from '@/components/shared/review/admin-review-reply-display';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Textarea } from '@/components/ui/textarea';

interface AdminReviewReplySectionProps {
  review: IReview;
  isPending: boolean;
  onSave: (reply: string) => Promise<unknown>;
}

export function AdminReviewReplySection({
  review,
  isPending,
  onSave,
}: AdminReviewReplySectionProps): React.JSX.Element {
  const [isEditing, setIsEditing] = React.useState(false);
  const [draft, setDraft] = React.useState('');
  const [error, setError] = React.useState('');
  const inputRef = React.useRef<HTMLTextAreaElement>(null);
  const savingRef = React.useRef(false);
  const canReply = review.status === 'visible' && !review.deletedAt;
  const isComposing = canReply && (!review.adminReply || isEditing);
  const fieldId = `admin-review-reply-${review.id}`;
  const content = draft.trim();

  React.useEffect(() => {
    if (isEditing) inputRef.current?.focus();
  }, [isEditing]);

  const startEditing = () => {
    setDraft(review.adminReply?.content ?? '');
    setError('');
    setIsEditing(true);
  };

  const submit = async () => {
    if (!canReply || !content || draft.length > 2000 || isPending || savingRef.current) return;
    savingRef.current = true;
    setError('');
    try {
      await onSave(content);
      setIsEditing(false);
      setDraft('');
    } catch {
      setError('Chưa gửi được phản hồi. Nội dung đã nhập vẫn được giữ lại; vui lòng thử lại.');
    } finally {
      savingRef.current = false;
    }
  };

  return (
    <section data-ui="admin-review-reply" className="space-y-2">
      {isComposing ? (
        <form
          aria-busy={isPending}
          className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <Icon icon="lucide:shield-check" className="size-4 shrink-0 text-primary" />
            Phản hồi từ ban quản trị
          </h3>
          <div className="space-y-2">
            <label htmlFor={fieldId} className="text-sm font-medium text-foreground">
              {review.adminReply ? 'Chỉnh sửa nội dung phản hồi' : 'Nội dung phản hồi'}
            </label>
            <Textarea
              ref={inputRef}
              id={fieldId}
              name="adminReply"
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value);
                setIsEditing(true);
                setError('');
              }}
              rows={4}
              required
              maxLength={2000}
              disabled={isPending}
              aria-invalid={Boolean(error)}
              aria-describedby={`${fieldId}-help ${fieldId}-count${error ? ` ${fieldId}-error` : ''}`}
              placeholder="Giải đáp phản ánh hoặc cập nhật tình trạng xử lý lỗi hệ thống..."
              className="bg-background text-sm"
            />
          </div>
          <p id={`${fieldId}-help`} className="text-xs text-muted-foreground">
            Hiển thị công khai dưới đánh giá với tư cách ban quản trị. Tối đa 2.000 ký tự.
          </p>
          {error && (
            <p id={`${fieldId}-error`} role="alert" className="text-xs text-destructive">
              {error}
            </p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span id={`${fieldId}-count`} className="text-xs text-muted-foreground tabular-nums">
              {draft.length}/2000
            </span>
            <div className="flex items-center gap-2">
              {review.adminReply && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  className="h-11 sm:h-8 text-xs"
                  onClick={() => {
                    setIsEditing(false);
                    setDraft('');
                    setError('');
                  }}
                >
                  Hủy
                </Button>
              )}
              <Button
                type="submit"
                size="sm"
                disabled={!content || draft.length > 2000 || isPending || content === review.adminReply?.content}
                className="h-11 sm:h-8 text-xs"
              >
                {isPending ? (
                  <>
                    <Icon icon="lucide:loader-2" className="size-3.5 mr-1 animate-spin" />
                    Đang gửi...
                  </>
                ) : review.adminReply ? 'Lưu thay đổi' : 'Gửi phản hồi'}
              </Button>
            </div>
          </div>
        </form>
      ) : review.adminReply ? (
        <AdminReviewReplyDisplay
          reply={review.adminReply}
          showAuthor
          action={canReply ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-11 sm:h-8 text-xs"
              disabled={isPending}
              onClick={startEditing}
            >
              <Icon icon="lucide:edit-3" className="size-3.5 mr-1" />
              Sửa phản hồi
            </Button>
          ) : undefined}
        />
      ) : (
        <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-1">
          <h3 className="text-sm font-semibold text-foreground">Phản hồi từ ban quản trị</h3>
          <p className="text-sm text-muted-foreground">Chưa có phản hồi.</p>
        </div>
      )}
      {!canReply && (
        <p className="text-xs text-muted-foreground">
          Đánh giá đã bị ẩn hoặc xóa. Chỉ có thể gửi hoặc sửa phản hồi khi đánh giá đang hiển thị công khai.
        </p>
      )}
    </section>
  );
}
