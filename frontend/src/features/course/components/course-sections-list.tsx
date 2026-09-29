'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { useCourseSectionsQuery } from '../api/course.api';

interface CourseSectionsListProps {
  courseId: string;
}

export function CourseSectionsList({ courseId }: CourseSectionsListProps): React.JSX.Element {
  const { data: sections, isLoading, isError, refetch } = useCourseSectionsQuery(courseId);

  return (
    <Card className="border-border/50 bg-card/60 shadow-xs">
      <CardHeader className="pb-3 border-b border-border/30">
        <div className="flex items-center justify-between">
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
          <div className="py-8 text-center space-y-2">
            <div className="size-10 rounded-full bg-muted/50 border border-border/40 mx-auto flex items-center justify-center text-muted-foreground">
              <Icon icon="lucide:book-open" className="size-5" />
            </div>
            <p className="text-sm font-medium text-foreground">Khóa học chưa có chương học nào.</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Nội dung các chương học sẽ xuất hiện tại đây khi được thêm vào khóa học.
            </p>
          </div>
        )}

        {/* 4. Success State: Render Sections in exact order */}
        {!isLoading && !isError && sections && sections.length > 0 && (
          <div className="space-y-2.5">
            {sections.map((section) => {
              const displayOrder = String(section.order + 1).padStart(2, '0');
              const hasDescription = Boolean(section.description?.trim());

              return (
                <div
                  key={section.id}
                  className="flex items-start gap-3.5 p-3.5 rounded-lg border border-border/40 bg-card hover:bg-muted/20 transition-colors"
                >
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
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
