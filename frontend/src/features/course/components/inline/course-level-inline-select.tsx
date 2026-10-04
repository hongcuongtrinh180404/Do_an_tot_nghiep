'use client';

import React, { useState } from 'react';
import { CourseLevelEnum, type ICourse } from 'share-lib';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useUpdateCourseMutation } from '../../api/course.api';
import {
  COURSE_LEVEL_OPTIONS,
  LevelIndicator,
} from '../course-level-select';

interface CourseLevelInlineSelectProps {
  course: ICourse;
}

export function CourseLevelInlineSelect({
  course,
}: CourseLevelInlineSelectProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const { mutate: updateCourse, isPending } = useUpdateCourseMutation(course.id);

  const currentOption =
    COURSE_LEVEL_OPTIONS.find((opt) => opt.value === course.level) ||
    COURSE_LEVEL_OPTIONS[0];

  const handleSelect = (newLevel: CourseLevelEnum) => {
    if (isPending) return;
    setIsOpen(false);
    if (newLevel !== course.level) {
      updateCourse({ level: newLevel });
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger
        render={
          <div
            role="button"
            tabIndex={0}
            aria-label="Chọn trình độ khóa học"
            className={cn(
              'p-3 rounded-lg bg-muted/25 border border-border/30 hover:border-border/80 hover:bg-muted/40 transition-all cursor-pointer group outline-none select-none text-left',
              isOpen && 'border-ring ring-2 ring-ring/40 bg-muted/40',
              isPending && 'opacity-70 pointer-events-none',
            )}
          />
        }
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">Trình độ</span>
          {isPending ? (
            <Icon icon="lucide:loader-2" className="size-3 animate-spin text-muted-foreground" />
          ) : (
            <span className="p-1 rounded-md bg-muted/50 text-muted-foreground group-hover:text-foreground group-hover:bg-muted transition-colors">
              <Icon
                icon="lucide:chevron-down"
                className={cn(
                  'size-3 transition-transform duration-200',
                  isOpen && 'rotate-180 text-foreground',
                )}
              />
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-muted-foreground group-hover:text-foreground transition-colors shrink-0">
            <LevelIndicator level={currentOption.value} />
          </span>
          <span className="text-sm sm:text-base font-semibold text-foreground truncate">
            {currentOption.label}
          </span>
        </div>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-[210px] p-1.5 space-y-0.5 z-50 shadow-xl border-border/80"
      >
        {COURSE_LEVEL_OPTIONS.map((option) => {
          const isSelected = option.value === course.level;

          return (
            <div
              key={option.value}
              role="option"
              aria-selected={isSelected}
              onClick={() => handleSelect(option.value)}
              className={cn(
                'flex items-center justify-between gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors cursor-pointer select-none',
                isSelected
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-foreground hover:bg-muted/70',
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={cn(
                    'shrink-0 transition-colors',
                    isSelected ? 'text-primary' : 'text-muted-foreground',
                  )}
                >
                  <LevelIndicator level={option.value} />
                </span>
                <span className="truncate">{option.label}</span>
              </div>

              {isSelected && (
                <Icon icon="lucide:check" className="size-3.5 text-primary shrink-0" />
              )}
            </div>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
