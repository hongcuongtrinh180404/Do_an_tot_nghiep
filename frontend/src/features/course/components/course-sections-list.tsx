'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { useCourseSectionsQuery } from '../api/course.api';
import { CreateSectionDialog } from './create-section-dialog';
import { SectionLessonsList } from './section-lessons-list';
import { SectionLessonCreateForm } from './section-lesson-create-form';

interface CourseSectionsListProps {
  courseId: string;
}

export function CourseSectionsList({ courseId }: CourseSectionsListProps): React.JSX.Element {
  const { data: sections, isLoading, isError, refetch } = useCourseSectionsQuery(courseId);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createLessonTarget, setCreateLessonTarget] = useState<{
    sectionId: string;
    sectionTitle: string;
  } | null>(null);

  // Compute next suggested order (defaulting to current count)
  const nextOrder = sections ? sections.length : 0;

  return (
    <>
      <Card className="border-border/50 bg-card/60 shadow-xs">
        <CardHeader className="pb-3 border-b border-border/30">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <Icon icon="lucide:layers" className="size-4 text-muted-foreground" />
                Nội dung khóa học
              </CardTitle>
              {sections && sections.length > 0 && (
                <span className="text-xs text-muted-foreground font-medium bg-muted/50 px-2 py-0.5 rounded-full border border-border/40">
                  {sections.length} chương học
                </span>
              )}
            </div>

            <Button
              size="sm"
              onClick={() => setIsCreateDialogOpen(true)}
              className="self-start sm:self-auto"
            >
              <Icon icon="lucide:plus" className="size-3.5 mr-1.5" />
              Thêm chương
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          {/* 1. Loading State */}
          {isLoading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-start gap-3.5 p-3.5 rounded-lg border border-border/30 bg-muted/20 animate-pulse"
                >
                  <div className="size-8 rounded-md bg-muted/60 shrink-0" />
                  <div className="flex-1 space-y-2 pt-1">
                    <div className="h-4 w-1/3 bg-muted rounded" />
                    <div className="h-3 w-2/3 bg-muted/50 rounded" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 2. Error State */}
          {!isLoading && isError && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-lg bg-destructive/5 border border-destructive/20 text-destructive">
              <div className="flex items-center gap-2.5">
                <Icon icon="lucide:alert-circle" className="size-5 shrink-0" />
                <div>
                  <p className="text-xs sm:text-sm font-medium">Không thể tải danh sách chương học</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Đã xảy ra lỗi khi lấy dữ liệu chương học từ máy chủ.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  void refetch();
                }}
                className={buttonVariants({ variant: 'outline', size: 'sm', className: 'text-xs shrink-0' })}
              >
                <Icon icon="lucide:refresh-cw" className="size-3 mr-1.5" />
                Thử lại
              </button>
            </div>
          )}

          {/* 3. Empty State */}
          {!isLoading && !isError && (!sections || sections.length === 0) && (
            <div className="py-8 text-center space-y-3">
              <div className="size-10 rounded-full bg-muted/50 border border-border/40 mx-auto flex items-center justify-center text-muted-foreground">
                <Icon icon="lucide:book-open" className="size-5" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Khóa học chưa có chương học nào.</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Bắt đầu xây dựng đề cương khóa học bằng cách thêm chương học đầu tiên.
                </p>
              </div>
              <div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(true)}
                >
                  <Icon icon="lucide:plus" className="size-3.5 mr-1.5" />
                  Thêm chương học đầu tiên
                </Button>
              </div>
            </div>
          )}

          {/* 4. Success State: Render Sections in exact order with nested Lessons */}
          {!isLoading && !isError && sections && sections.length > 0 && (
            <div className="space-y-3">
              {sections.map((section) => {
                const displayOrder = String(section.order + 1).padStart(2, '0');
                const hasDescription = Boolean(section.description?.trim());

                return (
                  <div
                    key={section.id}
                    className="rounded-lg border border-border/40 bg-card overflow-hidden transition-colors"
                  >
                    {/* Section Header */}
                    <div className="flex items-start justify-between gap-3.5 p-3.5 bg-muted/10">
                      <div className="flex items-start gap-3.5 flex-1 min-w-0">
                        {/* Order badge */}
                        <div className="flex items-center justify-center size-8 rounded-md bg-muted/60 text-muted-foreground border border-border/40 shrink-0 font-mono text-xs font-semibold">
                          {displayOrder}
                        </div>

                        {/* Title & Description */}
                        <div className="flex-1 min-w-0 pt-0.5">
                          <h4 className="text-sm font-semibold text-foreground leading-snug">
                            {section.title}
                          </h4>
                          {hasDescription && (
                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                              {section.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Button: + Thêm bài học */}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCreateLessonTarget({
                            sectionId: section.id,
                            sectionTitle: section.title,
                          })
                        }
                        className="text-xs shrink-0 h-8 gap-1.5 border-border/60 hover:bg-muted/50"
                      >
                        <Icon icon="lucide:plus" className="size-3.5" />
                        <span>Thêm bài học</span>
                      </Button>
                    </div>

                    {/* Lesson List Container */}
                    <div className="border-t border-border/30 bg-muted/5 px-3.5 py-2.5">
                      <SectionLessonsList sectionId={section.id} courseId={courseId} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <CreateSectionDialog
        courseId={courseId}
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        defaultOrder={nextOrder}
      />

      <SectionLessonCreateForm
        open={Boolean(createLessonTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setCreateLessonTarget(null);
          }
        }}
        sectionId={createLessonTarget?.sectionId ?? ''}
        sectionTitle={createLessonTarget?.sectionTitle}
      />
    </>
  );
}

