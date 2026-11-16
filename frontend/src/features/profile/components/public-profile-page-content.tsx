'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { RoleEnum, type IPublicUserProfile } from 'share-lib';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { usePublicProfileCoursesQuery } from '../api/public-profile-courses.api';
import { CopyProfileLinkButton } from './copy-profile-link-button';

const roleLabels = {
  [RoleEnum.ADMIN]: 'Quản trị viên',
  [RoleEnum.INSTRUCTOR]: 'Giảng viên',
  [RoleEnum.STUDENT]: 'Học viên',
};

export function PublicProfilePageContent({ profile }: { profile: IPublicUserProfile }): React.JSX.Element {
  const [avatarError, setAvatarError] = useState(false);
  const [page, setPage] = useState(1);
  const courses = usePublicProfileCoursesQuery(profile.instructorId, page);
  const memberSince = new Date(profile.createdAt).toLocaleDateString('vi-VN', {
    month: '2-digit', year: 'numeric',
  });

  return (
    <div data-testid="public-profile" className="mx-auto w-full max-w-6xl px-4 py-8 text-foreground sm:px-6 sm:py-12 lg:px-8">
      <section aria-labelledby="profile-name" className="space-y-6 rounded-xl bg-muted/40 p-5 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4 sm:gap-6">
            <div className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted sm:size-24">
              {profile.avatarUrl && !avatarError ? (
                <Image
                  src={profile.avatarUrl}
                  alt={`Ảnh đại diện của ${profile.fullName}`}
                  fill
                  sizes="96px"
                  className="object-cover"
                  onError={() => setAvatarError(true)}
                />
              ) : (
                <span className="text-3xl font-semibold" aria-hidden="true">
                  {profile.fullName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0 space-y-2">
              <h1 id="profile-name" className="break-words text-2xl font-semibold tracking-tight sm:text-3xl">
                {profile.fullName}
              </h1>
              <p className="break-all text-sm text-muted-foreground">@{profile.username}</p>
              <p className="text-sm">{roleLabels[profile.role]}</p>
            </div>
          </div>
          <div className="shrink-0">
            <CopyProfileLinkButton username={profile.username} />
          </div>
        </div>
        <div className="space-y-3">
          <h2 className="text-base font-semibold">Giới thiệu</h2>
          <p className="whitespace-pre-wrap break-words text-base leading-relaxed">
            {profile.bio || 'Người dùng chưa cập nhật phần giới thiệu.'}
          </p>
          <p className="text-sm text-muted-foreground">Tham gia từ {memberSince}</p>
        </div>
      </section>

      {profile.role === RoleEnum.INSTRUCTOR && (
        <section aria-labelledby="profile-courses" className="mt-8 space-y-5 sm:mt-10">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="profile-courses" className="text-xl font-semibold">Khóa học của giảng viên</h2>
            {courses.data && <p className="text-sm text-muted-foreground">{courses.data.total} khóa học đã xuất bản</p>}
          </div>

          {courses.isPending && (
            <div role="status" className="space-y-4">
              <p className="text-sm text-muted-foreground">Đang tải khóa học…</p>
              {[1, 2].map((index) => (
                <div key={index} className="h-32 rounded-lg bg-muted" aria-hidden="true" />
              ))}
            </div>
          )}

          {courses.isError && (
            <div role="alert" className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border p-5">
              <p className="text-sm">Không thể tải khóa học. Vui lòng thử lại.</p>
              <Button variant="outline" className="min-h-11 shadow-none" onClick={() => void courses.refetch()}>Thử lại</Button>
            </div>
          )}

          {!courses.isPending && !courses.isError && courses.data?.items.length === 0 && (
            <p className="rounded-lg bg-muted/40 p-6 text-sm text-muted-foreground">
              Giảng viên chưa có khóa học công khai.
            </p>
          )}

          {!courses.isError && courses.data && (
            <div className="space-y-4" aria-busy={courses.isFetching}>
              {courses.data.items.map((course) => (
                <article key={course.id} className="flex flex-col gap-4 rounded-lg border border-border p-4 sm:flex-row sm:gap-6">
                  <Link
                    href={`/courses/${course.id}`}
                    className="relative aspect-video w-full shrink-0 overflow-hidden rounded-md bg-muted focus-visible:outline-2 focus-visible:outline-foreground sm:w-48"
                    aria-label={`Xem khóa học ${course.title}`}
                  >
                    {course.thumbnailUrl && (
                      <Image src={course.thumbnailUrl} alt="" fill sizes="(max-width: 640px) 100vw, 192px" className="object-cover" />
                    )}
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col justify-between gap-4">
                    <h3 className="text-base font-semibold leading-snug">
                      <Link href={`/courses/${course.id}`} className="hover:underline focus-visible:underline focus-visible:outline-none">
                        {course.title}
                      </Link>
                    </h3>
                    <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-muted-foreground">
                        <span>{course.studentCount.toLocaleString('vi-VN')} học viên</span>
                        <span className="inline-flex items-center gap-1">
                          {course.reviewCount > 0 ? (
                            <>
                              <Icon icon="lucide:star" className="size-4" />
                              {course.rating.toFixed(1)} ({course.reviewCount} đánh giá)
                            </>
                          ) : 'Chưa có đánh giá'}
                        </span>
                        <span>{course.durationFormatted}</span>
                      </div>
                      <p className="font-semibold tabular-nums">
                        {course.price === 0 ? 'Miễn phí' : `${course.price.toLocaleString('vi-VN')} đ`}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          {courses.data && courses.data.totalPages > 1 && (
            <nav aria-label="Phân trang khóa học" className="flex flex-wrap items-center justify-center gap-4 pt-2">
              <Button variant="outline" className="min-h-11 shadow-none" disabled={page === 1 || courses.isFetching} onClick={() => setPage(page - 1)}>Trang trước</Button>
              <span className="text-sm tabular-nums" aria-live="polite">Trang {page} / {courses.data.totalPages}</span>
              <Button variant="outline" className="min-h-11 shadow-none" disabled={page >= courses.data.totalPages || courses.isFetching} onClick={() => setPage(page + 1)}>Trang sau</Button>
            </nav>
          )}
        </section>
      )}
    </div>
  );
}
