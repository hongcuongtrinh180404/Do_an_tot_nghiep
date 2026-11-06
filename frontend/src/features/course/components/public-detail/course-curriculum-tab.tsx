'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/icon';
import type { IPublicCourseDetailResponse } from '../../api/enrollment.api';

interface CourseCurriculumTabProps {
  sections: IPublicCourseDetailResponse['sections'];
  courseId: string;
  isEnrolled: boolean;
  isInstructorOwner: boolean;
  totalLessonsCount: number;
  totalDurationFormatted: string;
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export function CourseCurriculumTab({
  sections,
  courseId,
  isEnrolled,
  isInstructorOwner,
  totalLessonsCount,
  totalDurationFormatted,
}: CourseCurriculumTabProps): React.JSX.Element {
  // State: expanded section ids (all expanded by default)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    if (sections) {
      sections.forEach((s) => {
        initial[s.id] = true;
      });
    }
    return initial;
  });

  const toggleSection = (sectionId: string): void => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  const handleExpandAll = (): void => {
    const updated: Record<string, boolean> = {};
    sections.forEach((s) => {
      updated[s.id] = true;
    });
    setExpandedSections(updated);
  };

  const handleCollapseAll = (): void => {
    const updated: Record<string, boolean> = {};
    sections.forEach((s) => {
      updated[s.id] = false;
    });
    setExpandedSections(updated);
  };

  return (
    <div
      role="tabpanel"
      id="tabpanel-curriculum"
      aria-labelledby="tab-curriculum"
      className="space-y-6 pt-2"
    >
      {/* 1. Header Summary & Expand/Collapse buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#e5e7eb]">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#161616] tracking-tight">
            Nội dung khóa học
          </h2>
          <p className="text-xs sm:text-sm text-[#666666] mt-0.5">
            {sections?.length || 0} chương • {totalLessonsCount} bài giảng • Tổng thời lượng {totalDurationFormatted}
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs font-semibold">
          <button
            type="button"
            onClick={handleExpandAll}
            className="text-[#027D88] hover:underline cursor-pointer"
          >
            Mở rộng tất cả
          </button>
          <span aria-hidden="true" className="text-neutral-300">•</span>
          <button
            type="button"
            onClick={handleCollapseAll}
            className="text-[#666666] hover:text-[#161616] cursor-pointer"
          >
            Thu gọn tất cả
          </button>
        </div>
      </div>

      {/* 2. Access state banner */}
      {isEnrolled || isInstructorOwner ? (
        <div className="flex items-center gap-2.5 rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 text-xs sm:text-sm text-emerald-900 font-medium">
          <Icon icon="lucide:unlock" className="size-4.5 text-emerald-600 shrink-0" />
          <span>
            Bạn đã ghi danh khóa học này. Toàn bộ <strong>{totalLessonsCount} bài giảng</strong> đã được mở khóa. Nhấn vào bài bất kỳ để bắt đầu học.
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2.5 rounded-xl bg-[#f3fcfc] border border-[#027D88]/20 p-3.5 text-xs sm:text-sm text-[#027D88] font-medium">
          <Icon icon="lucide:info" className="size-4.5 text-[#027D88] shrink-0" />
          <span>
            Các bài học có biểu tượng <strong>Học thử</strong> cho phép xem video miễn phí trước khi đăng ký.
          </span>
        </div>
      )}

      {/* 3. Sections and Lessons List */}
      {sections && sections.length > 0 ? (
        <div className="space-y-4">
          {sections.map((section, sIdx) => {
            const isExpanded = Boolean(expandedSections[section.id]);
            const lessonCount = section.lessons?.length || 0;

            return (
              <div
                key={section.id}
                className="rounded-2xl border border-[#e5e7eb] bg-white overflow-hidden shadow-2xs transition-colors"
              >
                {/* Section Accordion Trigger */}
                <button
                  type="button"
                  onClick={() => toggleSection(section.id)}
                  aria-expanded={isExpanded}
                  className="w-full px-4 sm:px-5 py-3.5 bg-neutral-50/80 hover:bg-neutral-100/70 flex items-center justify-between text-left transition-colors cursor-pointer border-b border-[#e5e7eb]"
                >
                  <div className="flex items-center gap-2.5 pr-2 min-w-0">
                    <Icon
                      icon={isExpanded ? 'lucide:chevron-down' : 'lucide:chevron-right'}
                      className="size-4.5 text-[#666666] shrink-0 transition-transform"
                    />
                    <span className="font-bold text-sm sm:text-base text-[#161616] truncate">
                      Chương {sIdx + 1}: {section.title}
                    </span>
                  </div>

                  <span className="text-xs text-[#666666] font-medium shrink-0">
                    {lessonCount} bài học
                  </span>
                </button>

                {/* Lessons in Section */}
                {isExpanded && (
                  <div className="divide-y divide-[#f2f2f2]">
                    {section.lessons && section.lessons.length > 0 ? (
                      section.lessons.map((lesson, lIdx) => {
                        const hasFullAccess = isEnrolled || isInstructorOwner;
                        const canPlay = hasFullAccess || lesson.isPreview;

                        return (
                          <div
                            key={lesson.id}
                            className="px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3 text-xs sm:text-sm hover:bg-neutral-50/50 transition-colors"
                          >
                            {/* Left: Index + Title + Preview Badge */}
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="shrink-0 size-6 rounded-full bg-neutral-100 text-neutral-600 flex items-center justify-center text-xs font-semibold">
                                {lIdx + 1}
                              </span>

                              <div className="min-w-0">
                                {canPlay ? (
                                  <Link
                                    href={`/courses/${courseId}/lessons/${lesson.id}`}
                                    className="font-medium text-[#161616] hover:text-[#027D88] transition-colors truncate block"
                                    title={lesson.title}
                                  >
                                    {lesson.title}
                                  </Link>
                                ) : (
                                  <span
                                    className="font-medium text-[#666666] truncate block select-none"
                                    title="Bài học yêu cầu ghi danh khóa học"
                                  >
                                    {lesson.title}
                                  </span>
                                )}
                              </div>

                              {lesson.isPreview && !hasFullAccess && (
                                <span className="shrink-0 rounded bg-emerald-100 text-emerald-800 font-bold text-[11px] px-2 py-0.5">
                                  Học thử
                                </span>
                              )}
                            </div>

                            {/* Right: Duration + Status icon button */}
                            <div className="flex items-center gap-3 shrink-0">
                              {lesson.duration > 0 && (
                                <span className="text-xs text-[#666666] tabular-nums">
                                  {formatDuration(lesson.duration)}
                                </span>
                              )}

                              {canPlay ? (
                                <Link
                                  href={`/courses/${courseId}/lessons/${lesson.id}`}
                                  className="size-8 rounded-full bg-[#f3fcfc] text-[#027D88] hover:bg-[#027D88] hover:text-white flex items-center justify-center transition-colors shadow-2xs"
                                  aria-label={`Xem bài giảng ${lesson.title}`}
                                  title={lesson.isPreview && !hasFullAccess ? 'Xem bài học thử' : 'Bắt đầu học bài này'}
                                >
                                  <Icon icon="lucide:play" className="size-3.5 fill-current translate-x-0.5" />
                                </Link>
                              ) : (
                                <div
                                  className="size-8 rounded-full bg-neutral-100 text-neutral-400 flex items-center justify-center"
                                  title="Bài học bị khóa. Vui lòng mua hoặc đăng ký khóa học để mở khóa"
                                >
                                  <Icon icon="lucide:lock" className="size-3.5" />
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-4 text-xs text-[#666666] italic">
                        Chưa có bài học trong chương này.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[#e5e7eb] p-10 text-center text-xs sm:text-sm text-[#666666] bg-white">
          <Icon icon="lucide:book-open" className="size-8 text-neutral-400 mx-auto mb-2" />
          <p>Giảng viên đang biên tập nội dung bài giảng cho khóa học này.</p>
        </div>
      )}
    </div>
  );
}

