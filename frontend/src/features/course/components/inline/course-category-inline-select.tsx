'use client';

import React, { useMemo, useState } from 'react';
import type { ICourse } from 'share-lib';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useUpdateCourseMutation } from '../../api/course.api';
import { usePublicCategoriesQuery } from '../../api/course-category.api';

interface CourseCategoryInlineSelectProps {
  course: ICourse;
}

interface CategoryOption {
  value: string | null;
  label: string;
  imageUrl?: string | null;
}

export function CourseCategoryInlineSelect({
  course,
}: CourseCategoryInlineSelectProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const { mutate: updateCourse, isPending } = useUpdateCourseMutation(course.id);
  const { data: categories } = usePublicCategoriesQuery();

  const options = useMemo<CategoryOption[]>(() => {
    const activeOptions: CategoryOption[] = (categories ?? []).map((category) => ({
      value: category.id,
      label: category.name,
      imageUrl: category.imageUrl,
    }));

    if (
      course.category &&
      !activeOptions.some((option) => option.value === course.categoryId)
    ) {
      activeOptions.unshift({
        value: course.category.id,
        label: course.category.name,
        imageUrl: course.category.imageUrl,
      });
    }

    return [{ value: null, label: 'Chưa phân loại' }, ...activeOptions];
  }, [categories, course.category, course.categoryId]);

  const selectedOption =
    options.find((option) => option.value === (course.categoryId ?? null)) ?? options[0];

  const handleSelect = (nextCategoryId: string | null) => {
    if (isPending) return;
    setIsOpen(false);
    if (nextCategoryId !== (course.categoryId ?? null)) {
      updateCourse({ categoryId: nextCategoryId });
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label="Chọn danh mục khóa học"
            className={cn(
              'w-full p-3 rounded-lg bg-muted/25 border border-border/30 hover:border-border/80 hover:bg-muted/40 transition-all cursor-pointer group outline-none select-none text-left',
              isOpen && 'border-ring ring-2 ring-ring/40 bg-muted/40',
              isPending && 'opacity-70 pointer-events-none',
            )}
          />
        }
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">Danh mục</span>
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

        <div className="flex items-center gap-2 mt-0.5 min-w-0">
          {selectedOption?.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={selectedOption.imageUrl}
              alt=""
              className="size-4 shrink-0 rounded object-contain"
            />
          ) : (
            <Icon
              icon={selectedOption?.value ? 'lucide:folder' : 'lucide:circle-dashed'}
              className="size-3.5 shrink-0 text-muted-foreground"
            />
          )}
          <span className="text-sm sm:text-base font-semibold text-foreground truncate">
            {selectedOption?.label ?? 'Chưa phân loại'}
          </span>
        </div>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-[230px] p-1.5 space-y-0.5 z-50 shadow-xl border-border/80 max-h-64 overflow-y-auto"
      >
        {options.map((option) => {
          const isSelected = option.value === (course.categoryId ?? null);

          return (
            <div
              key={option.value ?? 'none'}
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
                {option.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={option.imageUrl}
                    alt=""
                    className="size-4 shrink-0 rounded object-contain"
                  />
                ) : (
                  <Icon
                    icon={option.value ? 'lucide:folder' : 'lucide:circle-dashed'}
                    className={cn(
                      'size-3.5 shrink-0',
                      isSelected ? 'text-primary' : 'text-muted-foreground',
                    )}
                  />
                )}
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
