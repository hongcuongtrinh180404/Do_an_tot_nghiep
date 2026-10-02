'use client';

import React from 'react';
import { Card } from '@/components/ui/card';

interface CourseOverviewMetricsProps {
  totalChapters: number;
  totalLessons: number;
  totalDurationText: string;
}

export function CourseOverviewMetrics({
  totalChapters,
  totalLessons,
  totalDurationText,
}: CourseOverviewMetricsProps): React.JSX.Element {
  return (
    <div className="grid grid-cols-3 gap-3">
      {/* 1. Tổng số chương */}
      <Card className="border-border/60 bg-card/70 p-4 rounded-2xl shadow-xs text-center backdrop-blur-xs">
        <span className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider block">
          Tổng số chương
        </span>
        <p className="text-xl sm:text-2xl font-black text-foreground mt-1 tracking-tight">
          {totalChapters}
        </p>
      </Card>

      {/* 2. Tổng bài giảng */}
      <Card className="border-border/60 bg-card/70 p-4 rounded-2xl shadow-xs text-center backdrop-blur-xs">
        <span className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider block">
          Tổng bài giảng
        </span>
        <p className="text-xl sm:text-2xl font-black text-foreground mt-1 tracking-tight">
          {totalLessons}
        </p>
      </Card>

      {/* 3. Thời lượng học */}
      <Card className="border-border/60 bg-card/70 p-4 rounded-2xl shadow-xs text-center backdrop-blur-xs">
        <span className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider block">
          Thời lượng học
        </span>
        <p className="text-xl sm:text-2xl font-black text-sky-600 dark:text-sky-400 mt-1 tracking-tight">
          {totalDurationText}
        </p>
      </Card>
    </div>
  );
}
