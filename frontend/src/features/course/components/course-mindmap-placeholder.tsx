'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';

interface CourseMindmapPlaceholderProps {
  onBackToTree: () => void;
  className?: string;
}

export function CourseMindmapPlaceholder({
  onBackToTree,
  className,
}: CourseMindmapPlaceholderProps): React.JSX.Element {
  return (
    <Card
      className={`border-border/70 bg-card/80 backdrop-blur-xs rounded-2xl p-8 sm:p-12 text-center shadow-xs ${className ?? ''}`}
    >
      <div className="max-w-md mx-auto space-y-5">
        {/* Animated Visual Badge */}
        <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/60 dark:border-indigo-800/50 text-indigo-600 dark:text-indigo-400 shadow-xs mx-auto">
          <Icon icon="lucide:network" className="size-8 animate-pulse" />
        </div>

        {/* Title & Description */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-semibold">
            <Icon icon="lucide:sparkles" className="size-3.5" />
            <span>Sắp ra mắt</span>
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-foreground">
            Sơ Đồ Tư Duy Khóa Học (Mindmap View)
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Trực quan hóa cấu trúc giáo trình dạng sơ đồ nhánh tương tác sinh động,
            hỗ trợ tự động phân tích kiến thức từ video bài giảng qua pipeline AI.
          </p>
        </div>

        {/* Preview Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 text-left">
          <div className="p-3 rounded-xl bg-muted/40 border border-border/50 space-y-1">
            <Icon icon="lucide:git-fork" className="size-4 text-indigo-500" />
            <p className="text-xs font-semibold text-foreground">Phân nhánh trực quan</p>
            <p className="text-[11px] text-muted-foreground leading-snug">
              Xem cây chương mục và bài học toàn cảnh.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-muted/40 border border-border/50 space-y-1">
            <Icon icon="lucide:zoom-in" className="size-4 text-sky-500" />
            <p className="text-xs font-semibold text-foreground">Thu phóng mượt mà</p>
            <p className="text-[11px] text-muted-foreground leading-snug">
              Kéo thả, phóng to thu nhỏ sơ đồ dễ dàng.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-muted/40 border border-border/50 space-y-1">
            <Icon icon="lucide:bot" className="size-4 text-emerald-500" />
            <p className="text-xs font-semibold text-foreground">Tích hợp AI</p>
            <p className="text-[11px] text-muted-foreground leading-snug">
              Trích xuất tự động ý chính từ video bài giảng.
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onBackToTree}
            className="rounded-full px-5 text-xs font-semibold hover:border-indigo-300"
          >
            <Icon icon="lucide:folder-tree" className="size-3.5 mr-1.5 text-indigo-600" />
            Quay lại Dạng Cây
          </Button>
        </div>
      </div>
    </Card>
  );
}
