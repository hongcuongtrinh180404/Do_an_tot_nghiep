import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { IPublicProfileCourse } from 'share-lib';
import { getPublicProfilePath } from '../utils/profile-url';

export function ProfileCourseCard({ course }: { course: IPublicProfileCourse }): React.JSX.Element {
  const coursePath = `/courses/${encodeURIComponent(course.slug || course.id)}`;
  const percent = course.progress?.percent;
  return (
    <article data-testid="profile-course-card" className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card">
      <Link href={coursePath} aria-label={`Xem khóa học ${course.title}`} className="relative block aspect-video bg-muted focus-visible:outline-2 focus-visible:outline-foreground">
        {course.thumbnailUrl && <Image src={course.thumbnailUrl} alt="" fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover" />}
      </Link>
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="space-y-2">
          <h3 className="line-clamp-2 text-base font-semibold leading-snug">
            <Link href={coursePath} className="hover:underline focus-visible:underline focus-visible:outline-none">{course.title}</Link>
          </h3>
          <p className="text-sm text-muted-foreground">
            {course.instructorUsername ? (
              <Link href={getPublicProfilePath(course.instructorUsername)} className="hover:underline">{course.instructorName}</Link>
            ) : course.instructorName}
          </p>
        </div>
        {course.progress && (
          <div className="mt-auto space-y-2">
            {typeof percent === 'number' ? (
              <>
                <p className="flex justify-between gap-2 text-sm"><span>Đã hoàn thành</span><span className="font-medium tabular-nums">{percent}%</span></p>
                <div role="progressbar" aria-label={`Tiến độ ${course.title}`} aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-[#027D88]" style={{ width: `${percent}%` }} />
                </div>
              </>
            ) : <p className="text-sm text-muted-foreground">Chưa xác định tiến độ</p>}
          </div>
        )}
        <Link href={coursePath} className="inline-flex min-h-11 items-center self-start text-sm font-medium underline underline-offset-4">
          Xem khóa học
        </Link>
      </div>
    </article>
  );
}
