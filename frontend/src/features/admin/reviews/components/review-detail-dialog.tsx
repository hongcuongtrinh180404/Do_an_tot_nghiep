'use client';

import * as React from 'react';
import type { IReview, ReviewStatusEnum } from 'share-lib';
import { DialogLayout } from '@/components/shared/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import { RatingStars } from '@/components/shared/rating/rating-stars';
import {
  useAdminReviewDetailQuery,
  useAdminDismissReportsMutation,
  useAdminReplyReviewMutation,
} from '../api/admin-reviews.api';
import { ReviewQueryError } from './review-query-error';
import { AdminReviewReplySection } from './admin-review-reply-section';

interface ReviewDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reviewId: string | null;
  onHideClick?: (review: IReview) => void;
  onRestoreClick?: (review: IReview) => void;
  onDeleteClick?: (review: IReview) => void;
}

function formatDate(dateValue?: string | Date | null): string {
  if (!dateValue) return '---';
  try {
    const d = new Date(dateValue);
    if (isNaN(d.getTime())) return '---';
    return d.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '---';
  }
}

export function ReviewDetailDialog({
  open,
  onOpenChange,
  reviewId,
  onHideClick,
  onRestoreClick,
  onDeleteClick,
}: ReviewDetailDialogProps): React.JSX.Element | null {
  const { data: review, isLoading, isError, isFetching, refetch } = useAdminReviewDetailQuery(reviewId);
  const dismissMutation = useAdminDismissReportsMutation();
  const replyMutation = useAdminReplyReviewMutation();

  if (!open) return null;

  const handleDismissReports = () => {
    if (!reviewId) return;
    dismissMutation.mutate(reviewId);
  };

  const getStatusBadge = (status: ReviewStatusEnum, deletedAt?: string | Date | null) => {
    if (deletedAt || status === 'deleted') {
      return (
        <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">
          <Icon icon="lucide:trash-2" className="size-3 mr-1" />
          Đã xóa mềm
        </Badge>
      );
    }
    if (status === 'hidden') {
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
          <Icon icon="lucide:eye-off" className="size-3 mr-1" />
          Đã bị ẩn
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
        <Icon icon="lucide:check-circle-2" className="size-3 mr-1" />
        Đang hiển thị
      </Badge>
    );
  };

  return (
    <DialogLayout
      open={open}
      onOpenChange={(nextOpen) => {
        if (!replyMutation.isPending) onOpenChange(nextOpen);
      }}
      title="Chi Tiết Đánh Giá Khóa Học"
      description="Xem đánh giá, phản hồi học viên và theo dõi lịch sử kiểm duyệt."
      icon="lucide:message-square"
      iconClassName="bg-primary/10 text-primary ring-primary/20"
      className="sm:max-w-2xl max-h-[90vh] flex flex-col"
      bodyClassName="min-h-0 overflow-y-auto pr-1 space-y-5"
    >
      {isLoading ? (
        <div className="py-12 flex flex-col items-center justify-center gap-2 text-muted-foreground text-xs">
          <Icon icon="lucide:loader-2" className="size-6 animate-spin text-primary" />
          <span>Đang tải thông tin đánh giá...</span>
        </div>
      ) : isError ? (
        <ReviewQueryError
          title="Không thể tải chi tiết đánh giá"
          isRetrying={isFetching}
          onRetry={() => { void refetch(); }}
        />
      ) : !review ? (
        <div className="py-8 text-center text-muted-foreground text-xs">
          Không tìm thấy dữ liệu đánh giá
        </div>
      ) : (
        <>
          {/* Header Card: Student & Course */}
          <div className="rounded-xl border border-border/80 bg-muted/30 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Student info */}
              <div className="flex items-center gap-3">
                {review.user?.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={review.user.avatarUrl}
                    alt={review.user.fullName || 'Học viên'}
                    className="size-11 rounded-full object-cover shrink-0 ring-1 ring-border/60"
                  />
                ) : (
                  <div className="size-11 rounded-full bg-primary/10 text-primary font-bold text-sm flex items-center justify-center shrink-0 ring-1 ring-primary/20">
                    {review.user?.fullName?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-bold text-foreground">
                    {review.user?.fullName || 'Học viên ẩn danh'}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {review.user?.email || 'Chưa có email'}
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <div>{getStatusBadge(review.status, review.deletedAt)}</div>
            </div>

            {/* Course row */}
            <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5 truncate max-w-md">
                <Icon icon="lucide:book-open" className="size-3.5 text-primary shrink-0" />
                <span>Khóa học:</span>
                <span className="font-semibold text-foreground truncate">
                  {review.course?.title || 'Khóa học'}
                </span>
              </div>
              <span className="shrink-0">{formatDate(review.createdAt)}</span>
            </div>
          </div>

          {/* Rating & Content */}
          <div className="rounded-xl border border-border/80 bg-card p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Điểm đánh giá:</span>
              <div className="flex items-center gap-1">
                <RatingStars
                  rating={review.rating}
                  size="md"
                  fillClassName="fill-amber-400 text-amber-400"
                  emptyClassName="text-muted-foreground/30"
                />
                <span className="text-xs font-bold text-foreground ml-1.5">
                  {review.rating}/5 sao
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-semibold text-muted-foreground">Nội dung nhận xét:</span>
              <div className="rounded-lg bg-muted/40 p-3 text-xs text-foreground leading-relaxed whitespace-pre-line border border-border/40">
                {review.comment ? (
                  review.comment
                ) : (
                  <span className="italic text-muted-foreground">
                    Học viên không để lại nhận xét bằng chữ.
                  </span>
                )}
              </div>
            </div>

            {/* If Hidden -> Show hideReason */}
            {review.status === 'hidden' && review.hideReason && (
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-800 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-900">
                  <Icon icon="lucide:alert-circle" className="size-4 text-amber-600" />
                  <span>Lý do Admin ẩn đánh giá:</span>
                </div>
                <p className="leading-relaxed pl-5">{review.hideReason}</p>
              </div>
            )}
          </div>

          <AdminReviewReplySection
            key={review.id}
            review={review}
            isPending={replyMutation.isPending}
            onSave={(reply) => replyMutation.mutateAsync({ id: review.id, payload: { reply } })}
          />

          {/* Instructor Reply */}
          {review.instructorReply && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Icon icon="lucide:message-circle-reply" className="size-4 text-primary" />
                <span className="font-bold text-foreground">Phản hồi từ giảng viên</span>
                {review.instructorReply.instructorName && (
                  <span className="text-muted-foreground">
                    {review.instructorReply.instructorName}
                  </span>
                )}
                <span className="text-muted-foreground">
                  · {formatDate(review.instructorReply.repliedAt)}
                </span>
                {review.instructorReply.updatedAt && (
                  <span className="italic text-muted-foreground">(đã chỉnh sửa)</span>
                )}
              </div>
              <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere] pl-6">
                {review.instructorReply.content}
              </p>
            </div>
          )}

          {/* Reports Section (if any reports) */}
          {review.reports && review.reports.length > 0 && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-destructive">
                  <Icon icon="lucide:flag" className="size-4" />
                  <span>Báo cáo vi phạm từ người dùng ({review.reports.length})</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDismissReports}
                  disabled={dismissMutation.isPending || replyMutation.isPending}
                  className="h-7 text-xs border-destructive/30 hover:bg-destructive/10 text-destructive"
                >
                  <Icon icon="lucide:check" className="size-3 mr-1" />
                  Bỏ qua báo cáo
                </Button>
              </div>

              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {review.reports.map((rep, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-background border border-border/60 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="font-semibold text-foreground">
                        {rep.userName || 'Người dùng ẩn danh'}
                      </span>
                      <span>{formatDate(rep.createdAt)}</span>
                    </div>
                    <p className="text-foreground/90 italic">&quot;{rep.reason}&quot;</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Moderation History Timeline */}
          <div className="rounded-xl border border-border/80 bg-card p-4 space-y-3">
            <h5 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Icon icon="lucide:history" className="size-4 text-primary" />
              <span>Lịch sử kiểm duyệt & xử lý</span>
            </h5>

            {review.moderationHistory && review.moderationHistory.length > 0 ? (
              <div className="space-y-2.5 border-l-2 border-primary/20 pl-3 ml-1.5">
                {review.moderationHistory.map((entry, idx) => (
                  <div key={idx} className="relative space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className={
                          entry.action === 'HIDE'
                            ? 'bg-amber-100 text-amber-800'
                            : entry.action === 'RESTORE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                        }
                      >
                        {entry.action === 'HIDE'
                          ? 'ẨN ĐÁNH GIÁ'
                          : entry.action === 'RESTORE'
                            ? 'KHÔI PHỤC'
                            : 'XÓA MỀM'}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground">
                        {formatDate(entry.createdAt)}
                      </span>
                    </div>

                    <p className="text-muted-foreground text-[11px]">
                      Thực hiện bởi: <span className="font-semibold text-foreground">{entry.adminName || 'Admin'}</span>
                    </p>

                    {entry.reason && (
                      <p className="text-foreground/90 bg-muted/40 p-2 rounded border border-border/40 text-[11px]">
                        Lý do: {entry.reason}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                Chưa có lịch sử kiểm duyệt nào được ghi nhận.
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="pt-2 border-t border-border/60 flex flex-wrap items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={replyMutation.isPending}
              onClick={() => onOpenChange(false)}
            >
              Đóng
            </Button>

            <div className="flex flex-wrap items-center gap-2">
              {review.status === 'visible' && !review.deletedAt && onHideClick && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={replyMutation.isPending}
                  className="border-amber-300 text-amber-700 hover:bg-amber-50"
                  onClick={() => {
                    onOpenChange(false);
                    onHideClick(review);
                  }}
                >
                  <Icon icon="lucide:eye-off" className="size-3.5 mr-1" />
                  Ẩn đánh giá
                </Button>
              )}

              {review.status === 'hidden' && onRestoreClick && (
                <Button
                  type="button"
                  size="sm"
                  disabled={replyMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => {
                    onOpenChange(false);
                    onRestoreClick(review);
                  }}
                >
                  <Icon icon="lucide:rotate-ccw" className="size-3.5 mr-1" />
                  Khôi phục
                </Button>
              )}

              {!review.deletedAt && onDeleteClick && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={replyMutation.isPending}
                  onClick={() => {
                    onOpenChange(false);
                    onDeleteClick(review);
                  }}
                >
                  <Icon icon="lucide:trash-2" className="size-3.5 mr-1" />
                  Xóa vi phạm
                </Button>
              )}
            </div>
          </div>
        </>
      )}
    </DialogLayout>
  );
}
