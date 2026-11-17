'use client';

import React, { useState } from 'react';
import type { ProfileCourseType } from 'share-lib';
import { Button } from '@/components/ui/button';
import { usePublicProfileCoursesQuery } from '../api/public-profile-courses.api';
import { ProfileCourseCard } from './profile-course-card';

export function ProfileCourseTabs({ username, isInstructor }: { username: string; isInstructor: boolean }): React.JSX.Element {
  const [tab, setTab] = useState<ProfileCourseType>(isInstructor ? 'teaching' : 'learning');
  const learning = usePublicProfileCoursesQuery(username, 'learning', tab === 'learning');
  const teaching = usePublicProfileCoursesQuery(username, 'teaching', isInstructor && tab === 'teaching');
  const query = tab === 'learning' ? learning : teaching;
  const newest = teaching.dataUpdatedAt > learning.dataUpdatedAt ? teaching : learning;
  const counts = newest.data?.pages[0]?.counts;
  const courses = Array.from(new Map(query.data?.pages.flatMap((page) => page.items).map((course) => [course.id, course])).values());
  const tabs: { type: ProfileCourseType; label: string }[] = [
    { type: 'learning', label: 'Đã sở hữu' },
    ...(isInstructor ? [{ type: 'teaching' as const, label: 'Giảng dạy' }] : []),
  ];

  return (
    <section aria-labelledby="profile-courses" className="space-y-5">
      <h2 id="profile-courses" className="text-xl font-semibold">Khóa học</h2>
      <div role="tablist" aria-label="Loại khóa học" className="flex flex-wrap gap-2 border-b border-border">
        {tabs.map((item, index) => (
          <button
            key={item.type}
            id={`profile-tab-${item.type}`}
            type="button"
            role="tab"
            aria-selected={tab === item.type}
            aria-controls={`profile-panel-${item.type}`}
            tabIndex={tab === item.type ? 0 : -1}
            onClick={() => setTab(item.type)}
            onKeyDown={(event) => {
              const offset = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
              if (!offset && event.key !== 'Home' && event.key !== 'End') return;
              event.preventDefault();
              const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + offset + tabs.length) % tabs.length;
              setTab(tabs[next].type);
              document.getElementById(`profile-tab-${tabs[next].type}`)?.focus();
            }}
            className={`min-h-11 border-b-2 px-3 py-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-foreground ${tab === item.type ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            {item.label}{counts ? ` (${counts[item.type]})` : ''}
          </button>
        ))}
      </div>
      <div id={`profile-panel-${tab}`} role="tabpanel" aria-labelledby={`profile-tab-${tab}`} className="space-y-5">
        {query.isPending && <p role="status" className="rounded-lg bg-muted/40 p-5 text-sm text-muted-foreground">Đang tải khóa học…</p>}
        {query.isError && (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border p-5">
            <p className="text-sm">Không thể tải khóa học. Vui lòng thử lại.</p>
            <Button variant="outline" className="min-h-11 shadow-none" onClick={() => void query.refetch()}>Thử lại</Button>
          </div>
        )}
        {!query.isPending && courses.length === 0 && !query.isError && (
          <p className="rounded-lg bg-muted/40 p-6 text-sm text-muted-foreground">
            {tab === 'teaching' ? 'Chưa có khóa học giảng dạy công khai.' : 'Chưa có khóa học đã sở hữu được công khai.'}
          </p>
        )}
        {courses.length > 0 && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => <ProfileCourseCard key={course.id} course={course} />)}
          </div>
        )}
        {query.hasNextPage && (
          <div className="flex justify-center">
            <Button variant="outline" className="min-h-11 min-w-36 shadow-none" disabled={query.isFetching} onClick={() => void query.fetchNextPage()}>
              {query.isFetchingNextPage ? 'Đang tải…' : 'Xem thêm'}
            </Button>
          </div>
        )}
        {courses.length > 0 && <p aria-live="polite" className="text-sm text-muted-foreground">Đang hiển thị {courses.length} / {counts?.[tab] ?? courses.length} khóa học</p>}
      </div>
    </section>
  );
}
