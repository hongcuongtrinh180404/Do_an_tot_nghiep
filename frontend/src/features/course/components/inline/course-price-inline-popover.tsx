'use client';

import React, { useState } from 'react';
import type { ICourse } from 'share-lib';
import { Icon } from '@/components/ui/icon';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useUpdateCourseMutation } from '../../api/course.api';

interface CoursePriceInlinePopoverProps {
  course: ICourse;
}

function formatVND(value: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(value);
}

export function CoursePriceInlinePopover({
  course,
}: CoursePriceInlinePopoverProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const isCurrentlyFree = course.price === 0;

  const [isFree, setIsFree] = useState(isCurrentlyFree);
  const [originalPriceStr, setOriginalPriceStr] = useState<string>(
    course.originalPrice !== null && course.originalPrice !== undefined
      ? String(course.originalPrice)
      : course.price > 0
        ? String(course.price)
        : '',
  );
  const [salePriceStr, setSalePriceStr] = useState<string>(
    course.originalPrice && course.price < course.originalPrice ? String(course.price) : '',
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { mutate: updateCourse, isPending } = useUpdateCourseMutation(course.id);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      const free = course.price === 0;
      setIsFree(free);
      setOriginalPriceStr(
        course.originalPrice !== null && course.originalPrice !== undefined
          ? String(course.originalPrice)
          : course.price > 0
            ? String(course.price)
            : '',
      );
      setSalePriceStr(
        course.originalPrice && course.price < course.originalPrice ? String(course.price) : '',
      );
      setErrorMsg(null);
    }
  };

  const handleSave = () => {
    setErrorMsg(null);

    if (isFree) {
      updateCourse(
        { price: 0, originalPrice: null },
        {
          onSuccess: () => setIsOpen(false),
        },
      );
      return;
    }

    const origPriceNum = Number(originalPriceStr.replace(/\D/g, ''));
    if (!originalPriceStr || isNaN(origPriceNum) || origPriceNum <= 0) {
      setErrorMsg('Vui lòng nhập giá gốc hợp lệ (> 0 đ)');
      return;
    }

    let finalPrice = origPriceNum;
    const finalOriginalPrice: number | null = origPriceNum;

    if (salePriceStr.trim()) {
      const saleNum = Number(salePriceStr.replace(/\D/g, ''));
      if (isNaN(saleNum) || saleNum <= 0) {
        setErrorMsg('Giá khuyến mãi phải lớn hơn 0 đ');
        return;
      }
      if (saleNum > origPriceNum) {
        setErrorMsg('Giá khuyến mãi không được lớn hơn giá gốc');
        return;
      }
      finalPrice = saleNum;
    }

    updateCourse(
      {
        price: finalPrice,
        originalPrice: finalOriginalPrice,
      },
      {
        onSuccess: () => setIsOpen(false),
      },
    );
  };

  // Display computation for the card
  const hasDiscount =
    course.originalPrice !== null &&
    course.originalPrice !== undefined &&
    course.price > 0 &&
    course.originalPrice > course.price;

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <div
            role="button"
            tabIndex={0}
            className="p-3 rounded-lg bg-muted/25 border border-border/30 hover:border-border/80 hover:bg-muted/40 transition-all cursor-pointer group text-left outline-none"
          />
        }
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">Học phí</span>
          <span className="p-1 rounded-md bg-muted/50 text-muted-foreground group-hover:text-foreground group-hover:bg-muted transition-colors">
            <Icon
              icon="lucide:pencil"
              className="size-3"
            />
          </span>
        </div>

          <div>
            {course.price === 0 ? (
              <span className="text-sm sm:text-base font-semibold text-emerald-600 dark:text-emerald-400">
                Miễn phí
              </span>
            ) : hasDiscount ? (
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="text-sm sm:text-base font-semibold text-foreground">
                  {formatVND(course.price)}
                </span>
                <span className="text-xs text-muted-foreground line-through">
                  {formatVND(course.originalPrice!)}
                </span>
              </div>
            ) : (
              <span className="text-sm sm:text-base font-semibold text-foreground">
                {formatVND(course.price)}
              </span>
            )}
          </div>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-80 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-border/40">
          <h4 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
            <Icon icon="lucide:tag" className="size-4 text-foreground/80" />
            Cập nhật học phí
          </h4>
        </div>

        {/* Free vs Paid Toggle */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">Chế độ học phí</Label>
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-muted/60 rounded-lg border border-border/40 text-xs">
            <button
              type="button"
              onClick={() => {
                setIsFree(true);
                setErrorMsg(null);
              }}
              className={`py-1.5 px-2 rounded-md font-medium transition-all ${
                isFree
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Miễn phí
            </button>
            <button
              type="button"
              onClick={() => {
                setIsFree(false);
                setErrorMsg(null);
              }}
              className={`py-1.5 px-2 rounded-md font-medium transition-all ${
                !isFree
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Có phí
            </button>
          </div>
        </div>

        {/* Paid inputs */}
        {!isFree && (
          <div className="space-y-3 pt-1">
            <div className="space-y-1">
              <Label htmlFor="popover-orig-price" className="text-xs">
                Giá gốc (Niêm yết) <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="popover-orig-price"
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="Ví dụ: 500000"
                  value={originalPriceStr}
                  onChange={(e) => setOriginalPriceStr(e.target.value)}
                  disabled={isPending}
                  className="pr-8 h-9 text-xs"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium select-none pointer-events-none">
                  đ
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="popover-sale-price" className="text-xs">
                Giá khuyến mãi (Tùy chọn)
              </Label>
              <div className="relative">
                <Input
                  id="popover-sale-price"
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="Ví dụ: 299000"
                  value={salePriceStr}
                  onChange={(e) => setSalePriceStr(e.target.value)}
                  disabled={isPending}
                  className="pr-8 h-9 text-xs"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium select-none pointer-events-none">
                  đ
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Để trống nếu không có giá khuyến mãi
              </p>
            </div>
          </div>
        )}

        {/* Error message */}
        {errorMsg && (
          <p className="text-xs text-destructive font-medium bg-destructive/10 p-2 rounded-md">
            {errorMsg}
          </p>
        )}

        {/* Popover Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsOpen(false)}
            disabled={isPending}
          >
            Hủy
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={isPending}
          >
            {isPending && <Icon icon="lucide:loader-2" className="size-3.5 animate-spin mr-1.5" />}
            Lưu thay đổi
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
