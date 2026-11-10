'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Icon } from '@/components/ui/icon';
import { DeleteConfirmDialog } from '@/components/shared/dialog/delete-confirm-dialog';
import { useCurrentUserQuery } from '@/features/auth/api/auth.api';
import {
  useCourseReviewStatsQuery,
  useCourseReviewsQuery,
  useReviewEligibilityQuery,
  useMyReviewQuery,
  useCreateReviewMutation,
  useUpdateReviewMutation,
  useDeleteReviewMutation,
} from '../../api/review.api';
import { ReviewForm } from './review-form';

interface CourseReviewsTabProps {
  courseId: string;
  initialRating?: number;
  initialReviewCount?: number;
}

function formatReviewDate(dateValue: string | Date): string {
  try {
    const d = new Date(dateValue);
    if (isNaN(d.getTime())) return 'Gần đây';
    return d.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return 'Gần đây';
  }
}

export function CourseReviewsTab({
  courseId,
  initialRating,
  initialReviewCount,
}: CourseReviewsTabProps): React.JSX.Element {
  const { data: currentUser } = useCurrentUserQuery();
  const isLoggedIn = Boolean(currentUser);

  const [page, setPage] = useState<number>(1);
  const [isEditingMyReview, setIsEditingMyReview] = useState<boolean>(false);
  const [reviewToDeleteId, setReviewToDeleteId] = useState<string | null>(null);

  // Queries
  const { data: stats } = useCourseReviewStatsQuery(courseId);
  const { data: reviewsData, isLoading: isReviewsLoading } = useCourseReviewsQuery(
    courseId,
    page,
    10,
  );
  const { data: eligibility } = useReviewEligibilityQuery(
    courseId,
    isLoggedIn,
  );
  const { data: myReview } = useMyReviewQuery(courseId, isLoggedIn);

  // Mutations
  const createMutation = useCreateReviewMutation(courseId);
  const updateMutation = useUpdateReviewMutation(courseId);
  const deleteMutation = useDeleteReviewMutation(courseId);

  const totalReviews = stats?.totalReviews ?? initialReviewCount ?? 0;
  const averageRating = stats?.averageRating ?? initialRating ?? 0;
  const distribution = stats?.distribution ?? [
    { stars: 5, count: 0, percentage: 0 },
    { stars: 4, count: 0, percentage: 0 },
    { stars: 3, count: 0, percentage: 0 },
    { stars: 2, count: 0, percentage: 0 },
    { stars: 1, count: 0, percentage: 0 },
  ];

  const handleCreateReview = (data: { rating: number; comment?: string }) => {
    createMutation.mutate({
      rating: data.rating,
      comment: data.comment,
    });
  };

  const handleUpdateReview = (data: { rating: number; comment?: string }) => {
    if (!myReview) return;
    updateMutation.mutate(
      {
        reviewId: myReview.id,
        payload: {
          rating: data.rating,
          comment: data.comment,
        },
      },
      {
        onSuccess: () => {
          setIsEditingMyReview(false);
        },
      },
    );
  };

  const handleConfirmDelete = () => {
    if (!reviewToDeleteId) return;
    deleteMutation.mutate(reviewToDeleteId, {
      onSuccess: () => {
        setReviewToDeleteId(null);
        setIsEditingMyReview(false);
      },
    });
  };

  return (
    <div
      role="tabpanel"
      id="tabpanel-reviews"
      aria-labelledby="tab-reviews"
      className="space-y-8 pt-2"
    >
      {/* ========================================================= */}
      {/* 1. RATING SUMMARY OVERVIEW BOX (DỮ LIỆU THẬT)              */}
      {/* ========================================================= */}
      <section
        data-ui="review-summary"
        className="rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-2xs"
      >
        {totalReviews > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {/* Big Score Box */}
            <div className="text-center md:border-r border-[#e5e7eb] md:pr-6 space-y-1">
              <div className="text-4xl sm:text-5xl font-extrabold text-[#161616] tracking-tight">
                {averageRating.toFixed(1)}
              </div>
              <div className="flex items-center justify-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Icon
                    key={star}
                    icon="lucide:star"
                    className={`size-5 ${star <= Math.round(averageRating)
                        ? 'fill-[#ffd100] text-[#ffd100]'
                        : 'text-neutral-300'
                      }`}
                  />
                ))}
              </div>
              <p className="text-xs text-[#666666]">
                Dựa trên <strong>{totalReviews}</strong> lượt đánh giá
              </p>
            </div>

            {/* Distribution Bars */}
            <div className="md:col-span-2 space-y-2">
              {distribution.map((item) => (
                <div key={item.stars} className="flex items-center gap-3 text-xs">
                  <div className="w-12 flex items-center gap-1 font-medium text-[#161616]">
                    <span>{item.stars}</span>
                    <Icon icon="lucide:star" className="size-3 fill-[#ffd100] text-[#ffd100]" />
                  </div>
                  <div className="flex-1 h-2 rounded-full bg-neutral-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#027D88] transition-all duration-500"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                  <span className="w-12 text-right text-[#666666] font-medium">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="py-8 text-center space-y-2">
            <div className="mx-auto size-12 rounded-full bg-neutral-100 flex items-center justify-center text-[#666666]">
              <Icon icon="lucide:star" className="size-6 text-neutral-400" />
            </div>
            <h3 className="text-base font-bold text-[#161616]">
              Khóa học chưa có đánh giá nào
            </h3>
            <p className="text-xs text-[#666666] max-w-md mx-auto">
              Hãy là học viên đầu tiên hoàn thành hơn 20% khóa học và để lại nhận xét hữu ích cho cộng đồng!
            </p>
          </div>
        )}
      </section>

      {/* ========================================================= */}
      {/* 2. KHU VỰC TƯƠNG TÁC ĐÁNH GIÁ CỦA HỌC VIÊN                  */}
      {/* ========================================================= */}
      <section data-ui="learner-review-zone">
        {!isLoggedIn ? (
          <div className="rounded-2xl border border-dashed border-[#e5e7eb] bg-neutral-50/70 p-6 text-center space-y-3">
            <p className="text-sm text-[#666666]">
              Bạn cần đăng nhập và tham gia khóa học để có thể gửi đánh giá & nhận xét.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#027D88] hover:bg-[#02666F] text-white text-xs font-bold transition-colors"
            >
              <Icon icon="lucide:log-in" className="size-4" />
              <span>Đăng nhập để đánh giá</span>
            </Link>
          </div>
        ) : myReview && !isEditingMyReview ? (
          /* Đã có đánh giá -> Hiển thị review của chính mình */
          <div className="rounded-2xl border-2 border-[#027D88]/30 bg-[#f3fcfc] p-6 space-y-3 shadow-xs">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#027D88] text-white text-[11px] font-bold">
                  <Icon icon="lucide:check" className="size-3" />
                  <span>Đánh giá của bạn</span>
                </span>
                <span className="text-xs text-[#666666]">
                  {formatReviewDate(myReview.updatedAt || myReview.createdAt)}
                </span>
                {new Date(myReview.updatedAt).getTime() - new Date(myReview.createdAt).getTime() > 1000 && (
                  <span className="text-[11px] text-neutral-400 italic">
                    (Đã chỉnh sửa)
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingMyReview(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#027D88]/30 text-[#027D88] hover:bg-[#027D88]/10 text-xs font-semibold transition-colors"
                >
                  <Icon icon="lucide:edit-3" className="size-3.5" />
                  <span>Chỉnh sửa</span>
                </button>
                <button
                  type="button"
                  onClick={() => setReviewToDeleteId(myReview.id)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-destructive/20 text-destructive hover:bg-destructive/10 text-xs font-semibold transition-colors"
                >
                  <Icon icon="lucide:trash-2" className="size-3.5" />
                  <span>Xóa</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Icon
                  key={star}
                  icon="lucide:star"
                  className={`size-4 ${star <= myReview.rating
                      ? 'fill-[#ffd100] text-[#ffd100]'
                      : 'text-neutral-300'
                    }`}
                />
              ))}
            </div>

            {myReview.comment && (
              <p className="text-sm text-[#161616] leading-relaxed whitespace-pre-line">
                {myReview.comment}
              </p>
            )}
          </div>
        ) : isEditingMyReview && myReview ? (
          /* Đang ở chế độ chỉnh sửa đánh giá */
          <ReviewForm
            isEdit
            initialRating={myReview.rating}
            initialComment={myReview.comment}
            isSubmitting={updateMutation.isPending}
            onSubmit={handleUpdateReview}
            onCancel={() => setIsEditingMyReview(false)}
          />
        ) : eligibility?.canReview ? (
          /* Đủ điều kiện và chưa có đánh giá -> Form tạo mới */
          <ReviewForm
            isSubmitting={createMutation.isPending}
            onSubmit={handleCreateReview}
          />
        ) : (
          /* Không đủ điều kiện -> Hiển thị nguyên nhân cụ thể */
          <div className="rounded-2xl border border-neutral-200 bg-neutral-50/60 p-5 flex items-start gap-3.5">
            <div className="size-8 rounded-full bg-neutral-100 flex items-center justify-center shrink-0 text-[#666666] mt-0.5">
              <Icon icon="lucide:info" className="size-4 text-[#027D88]" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-[#161616] uppercase tracking-wider">
                Điều kiện đánh giá khóa học
              </h4>
              <p className="text-xs text-[#666666] leading-relaxed">
                {eligibility?.reason ||
                  'Bạn cần sở hữu khóa học và hoàn thành hơn 20% tiến độ bài giảng để có thể gửi đánh giá.'}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* ========================================================= */}
      {/* 3. DANH SÁCH TẤT CẢ ĐÁNH GIÁ CÔNG KHAI                     */}
      {/* ========================================================= */}
      <section className="space-y-4 pt-4 border-t border-[#e5e7eb]">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-[#161616]">
            Nhận xét từ học viên ({totalReviews})
          </h3>
        </div>

        {isReviewsLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="animate-pulse rounded-2xl border border-[#e5e7eb] bg-white p-5 space-y-3"
              >
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-full bg-neutral-200" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-4 w-32 bg-neutral-200 rounded" />
                    <div className="h-3 w-20 bg-neutral-200 rounded" />
                  </div>
                </div>
                <div className="h-12 w-full bg-neutral-200 rounded" />
              </div>
            ))}
          </div>
        ) : reviewsData?.items && reviewsData.items.length > 0 ? (
          <div className="space-y-4">
            {reviewsData.items.map((review) => {
              const isOwner = currentUser && (review.userId === currentUser.id || review.user?.id === currentUser.id);
              const isEdited =
                new Date(review.updatedAt).getTime() - new Date(review.createdAt).getTime() > 1000;

              return (
                <article
                  key={review.id}
                  className={`rounded-2xl border p-5 transition-colors ${isOwner
                      ? 'border-[#027D88]/30 bg-[#f9fefe]'
                      : 'border-[#e5e7eb] bg-white'
                    }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* User Info */}
                    <div className="flex items-center gap-3">
                      <div className="relative size-10 rounded-full overflow-hidden bg-neutral-100 border border-[#e5e7eb] shrink-0">
                        {review.user?.avatarUrl ? (
                          <Image
                            src={review.user.avatarUrl}
                            alt={review.user.fullName}
                            fill
                            sizes="40px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="size-full flex items-center justify-center font-bold text-xs text-[#666666]">
                            {review.user?.fullName?.charAt(0) || 'H'}
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-[#161616]">
                            {review.user?.fullName || 'Học viên Mindly'}
                          </h4>
                          {isOwner && (
                            <span className="text-[10px] font-semibold text-[#027D88] bg-[#027D88]/10 px-1.5 py-0.5 rounded">
                              Bạn
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[#666666]">
                          <span>{formatReviewDate(review.createdAt)}</span>
                          {isEdited && (
                            <span className="text-[11px] text-neutral-400 italic">
                              (Đã chỉnh sửa)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Owner Action Buttons */}
                    {isOwner && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditingMyReview(true);
                            window.scrollTo({ top: 400, behavior: 'smooth' });
                          }}
                          aria-label="Chỉnh sửa đánh giá"
                          className="p-1.5 rounded-lg text-[#666666] hover:text-[#027D88] hover:bg-neutral-100 transition-colors"
                        >
                          <Icon icon="lucide:edit-3" className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setReviewToDeleteId(review.id)}
                          aria-label="Xóa đánh giá"
                          className="p-1.5 rounded-lg text-[#666666] hover:text-destructive hover:bg-neutral-100 transition-colors"
                        >
                          <Icon icon="lucide:trash-2" className="size-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Stars Rating */}
                  <div className="mt-3 flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Icon
                        key={star}
                        icon="lucide:star"
                        className={`size-3.5 ${star <= review.rating
                            ? 'fill-[#ffd100] text-[#ffd100]'
                            : 'text-neutral-300'
                          }`}
                      />
                    ))}
                  </div>

                  {/* Comment */}
                  {review.comment && (
                    <p className="mt-2.5 text-xs sm:text-sm text-[#161616] leading-relaxed whitespace-pre-line">
                      {review.comment}
                    </p>
                  )}
                </article>
              );
            })}

            {/* Pagination Controls */}
            {reviewsData.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg border border-[#e5e7eb] text-xs font-semibold text-[#161616] hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Trang trước
                </button>
                <span className="text-xs text-[#666666]">
                  Trang {page} / {reviewsData.totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= reviewsData.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 rounded-lg border border-[#e5e7eb] text-xs font-semibold text-[#161616] hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Trang sau
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-[#666666] bg-neutral-50/50 rounded-xl border border-dashed border-[#e5e7eb]">
            Chưa có nhận xét nào từ học viên.
          </div>
        )}
      </section>

      {/* ========================================================= */}
      {/* 4. DIALOG XÁC NHẬN XÓA ĐÁNH GIÁ (SOFT DELETE)              */}
      {/* ========================================================= */}
      <DeleteConfirmDialog
        open={Boolean(reviewToDeleteId)}
        onOpenChange={(open) => {
          if (!open) setReviewToDeleteId(null);
        }}
        title="Xóa đánh giá"
        itemName="đánh giá này"
        description="Bạn có chắc chắn muốn xóa đánh giá này? Hành động này không thể hoàn tác."
        confirmText="Xóa đánh giá"
        cancelText="Hủy"
        isLoading={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
