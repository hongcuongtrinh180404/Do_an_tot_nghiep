'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Icon } from '@/components/ui/icon';
import type { IPublicCourseDetailResponse } from '../../api/enrollment.api';

interface CoursePurchaseCardProps {
  course: IPublicCourseDetailResponse;
  isEnrolled: boolean;
  isInstructorOwner: boolean;
  isLoggedIn: boolean;
  isPending: boolean;
  totalLessonsCount: number;
  onPurchase: () => void;
  onStartLearning: () => void;
}

function formatVND(price: number): string {
  if (price === 0) return 'Miễn phí';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(price);
}

export function CoursePurchaseCard({
  course,
  isEnrolled,
  isInstructorOwner,
  isLoggedIn,
  isPending,
  totalLessonsCount,
  onPurchase,
  onStartLearning,
}: CoursePurchaseCardProps): React.JSX.Element {
  const isFree = course.price === 0;
  const hasAccess = isEnrolled || isInstructorOwner;

  const discountPercent =
    course.originalPrice && course.originalPrice > course.price
      ? Math.round(((course.originalPrice - course.price) / course.originalPrice) * 100)
      : null;

  return (
    <>
      {/* ============================================================== */}
      {/* 1. Desktop Sticky Purchase Card (Hidden on mobile < 1024px)   */}
      {/* ============================================================== */}
      <aside aria-label="Thông tin mua khóa học" className="hidden lg:block lg:sticky lg:top-24 space-y-6">
        <div className="rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm overflow-hidden">
          {/* Mini Thumbnail Header */}
          <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-neutral-100 mb-5 border border-[#e5e7eb]">
            {course.thumbnailUrl ? (
              <Image
                src={course.thumbnailUrl}
                alt={course.title}
                fill
                sizes="380px"
                className="object-cover"
              />
            ) : (
              <div className="size-full flex items-center justify-center text-neutral-400">
                <Icon icon="lucide:book-open" className="size-10" />
              </div>
            )}
            <div className="absolute top-2.5 right-2.5 rounded bg-black/75 px-2 py-0.5 text-[11px] font-semibold text-white">
              {course.category?.name || 'Khóa học'}
            </div>
          </div>

          {/* Pricing Section (Only relevant when not yet enrolled) */}
          {!hasAccess ? (
            <div className="space-y-1 mb-5">
              <span className="text-xs text-[#666666] font-medium block">Học phí trọn gói</span>
              <div className="flex items-baseline gap-3">
                <span className="text-2xl sm:text-3xl font-extrabold text-[#161616]">
                  {formatVND(course.price)}
                </span>
                {discountPercent !== null && course.originalPrice && (
                  <span className="text-sm text-[#666666] line-through">
                    {formatVND(course.originalPrice)}
                  </span>
                )}
              </div>

              {discountPercent !== null && (
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#dc2626]">
                  <Icon icon="lucide:tag" className="size-3.5" />
                  <span>Tiết kiệm {discountPercent}%</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3 mb-5 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
              <div className="flex items-center gap-2 text-emerald-800 text-sm font-bold">
                <Icon icon="lucide:check-circle-2" className="size-5 text-emerald-600" />
                <span>Bạn đã sở hữu khóa học này</span>
              </div>

              {/* Learning Progress: Initialized cleanly at 0% */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-xs font-semibold text-emerald-900">
                  <span>Tiến độ học tập</span>
                  <span>0%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-emerald-200/70 overflow-hidden">
                  <div className="h-full bg-emerald-600 rounded-full" style={{ width: '0%' }} />
                </div>
                <span className="text-[11px] text-emerald-700 block">
                  0/{totalLessonsCount} bài giảng hoàn thành
                </span>
              </div>
            </div>
          )}

          {/* Action CTA Buttons */}
          <div className="space-y-3">
            {hasAccess ? (
              <button
                type="button"
                onClick={onStartLearning}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#027D88] hover:bg-[#02666F] text-white font-bold py-3.5 px-4 text-sm sm:text-base transition-colors shadow-sm cursor-pointer"
              >
                <Icon icon="lucide:play-circle" className="size-5 shrink-0 fill-white text-[#027D88]" />
                <span>Bắt đầu học</span>
              </button>
            ) : !isLoggedIn ? (
              <Link
                href={`/login?redirect=/courses/${course.id}`}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#027D88] hover:bg-[#02666F] text-white font-bold py-3.5 px-4 text-sm sm:text-base transition-colors shadow-sm text-center"
              >
                <Icon icon="lucide:log-in" className="size-4 shrink-0" />
                <span>{isFree ? 'Đăng nhập để đăng ký' : 'Đăng nhập để mua'}</span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={onPurchase}
                disabled={isPending}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#027D88] hover:bg-[#02666F] text-white font-bold py-3.5 px-4 text-sm sm:text-base transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
              >
                {isPending ? (
                  <>
                    <Icon icon="lucide:loader-2" className="size-4 animate-spin shrink-0" />
                    <span>Đang xử lý đăng ký...</span>
                  </>
                ) : (
                  <>
                    <Icon icon="lucide:shopping-cart" className="size-4.5 shrink-0" />
                    <span>{isFree ? 'Đăng ký miễn phí' : 'Mua ngay'}</span>
                  </>
                )}
              </button>
            )}

            <p className="text-[11px] text-[#666666] text-center pt-1">
              Truy cập trọn đời • Học trên mọi thiết bị • Kích hoạt tức thì
            </p>
          </div>

          {/* Student Included Perks */}
          <div className="mt-6 pt-6 border-t border-[#f2f2f2] space-y-3">
            <h4 className="text-xs font-bold text-[#161616] uppercase tracking-wider">
              Khóa học bao gồm:
            </h4>
            <div className="space-y-2.5 text-xs text-[#444444]">
              <div className="flex items-center gap-2.5">
                <Icon icon="lucide:check" className="size-4 text-emerald-600 shrink-0" />
                <span>Toàn bộ {totalLessonsCount} bài giảng chất lượng cao</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Icon icon="lucide:check" className="size-4 text-emerald-600 shrink-0" />
                <span>Sơ đồ tư duy Mindmap AI cho từng bài học</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Icon icon="lucide:check" className="size-4 text-emerald-600 shrink-0" />
                <span>Hệ thống câu hỏi ôn tập In-video Quiz</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Icon icon="lucide:check" className="size-4 text-emerald-600 shrink-0" />
                <span>Theo dõi tiến độ học tập chi tiết</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Icon icon="lucide:check" className="size-4 text-emerald-600 shrink-0" />
                <span>Tài liệu đính kèm &amp; mã nguồn bài giảng</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Icon icon="lucide:check" className="size-4 text-emerald-600 shrink-0" />
                <span>Học linh hoạt trên máy tính và điện thoại</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* ============================================================== */}
      {/* 2. Mobile Sticky Bottom Action Bar (Visible < 1024px)          */}
      {/* ============================================================== */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#e5e7eb] p-3 px-4 shadow-lg lg:hidden flex items-center justify-between gap-3">
        <div className="min-w-0">
          {!hasAccess ? (
            <div>
              <span className="text-[11px] text-[#666666] block leading-none">Học phí</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-base font-extrabold text-[#161616]">
                  {formatVND(course.price)}
                </span>
                {discountPercent !== null && course.originalPrice && (
                  <span className="text-xs text-[#666666] line-through">
                    {formatVND(course.originalPrice)}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-bold">
              <Icon icon="lucide:check-circle-2" className="size-4" />
              <span>Đã đăng ký (0%)</span>
            </div>
          )}
        </div>

        <div className="shrink-0">
          {hasAccess ? (
            <button
              type="button"
              onClick={onStartLearning}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#027D88] hover:bg-[#02666F] text-white font-bold py-2.5 px-4 text-xs sm:text-sm shadow-sm cursor-pointer"
            >
              <Icon icon="lucide:play-circle" className="size-4 fill-white text-[#027D88]" />
              <span>Bắt đầu học</span>
            </button>
          ) : !isLoggedIn ? (
            <Link
              href={`/login?redirect=/courses/${course.id}`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#027D88] hover:bg-[#02666F] text-white font-bold py-2.5 px-4 text-xs sm:text-sm shadow-sm"
            >
              <Icon icon="lucide:log-in" className="size-4" />
              <span>{isFree ? 'Đăng ký' : 'Mua ngay'}</span>
            </Link>
          ) : (
            <button
              type="button"
              onClick={onPurchase}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#027D88] hover:bg-[#02666F] text-white font-bold py-2.5 px-4 text-xs sm:text-sm shadow-sm disabled:opacity-70 cursor-pointer"
            >
              {isPending ? (
                <>
                  <Icon icon="lucide:loader-2" className="size-3.5 animate-spin" />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <>
                  <Icon icon="lucide:shopping-cart" className="size-3.5" />
                  <span>{isFree ? 'Đăng ký miễn phí' : 'Mua ngay'}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </>
  );
}

