'use client';

import React, { useRef, useEffect } from 'react';
import { Icon } from '@/components/ui/icon';
import { Label } from '@/components/ui/label';
import {
  getKeyPointColor,
  getKeyPointPlaceholder,
  generateKeyPointId,
  type ILessonKeyPoint,
} from '../utils/lesson-key-points.util';

export interface LessonKeyPointsInputProps {
  id?: string;
  value?: ILessonKeyPoint[];
  onChange: (points: ILessonKeyPoint[]) => void;
  disabled?: boolean;
  error?: string;
  maxItems?: number;
}

export function LessonKeyPointsInput({
  id = 'lesson-key-points',
  value,
  onChange,
  disabled = false,
  error,
  maxItems = 20,
}: LessonKeyPointsInputProps): React.JSX.Element {
  // Đảm bảo luôn có ít nhất 1 dòng có ID duy nhất để giảng viên bắt đầu nhập
  const points: ILessonKeyPoint[] =
    value && value.length > 0 ? value : [{ id: generateKeyPointId(), text: '' }];
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const pendingFocusIndexRef = useRef<number | null>(null);

  // Auto-focus vào input mới sau khi mảng points được cập nhật
  useEffect(() => {
    if (pendingFocusIndexRef.current !== null) {
      const targetIndex = pendingFocusIndexRef.current;
      pendingFocusIndexRef.current = null;
      const targetInput = inputRefs.current[targetIndex];
      if (targetInput) {
        targetInput.focus();
      }
    }
  }, [points.length]);

  const handlePointChange = (index: number, text: string) => {
    const nextPoints = [...points];
    nextPoints[index] = { ...nextPoints[index], text };
    onChange(nextPoints);
  };

  const handleAddPoint = (insertAtIndex?: number) => {
    if (disabled || points.length >= maxItems) return;

    const nextPoints = [...points];
    const targetIndex =
      insertAtIndex !== undefined ? insertAtIndex + 1 : nextPoints.length;

    nextPoints.splice(targetIndex, 0, { id: generateKeyPointId(), text: '' });
    pendingFocusIndexRef.current = targetIndex;
    onChange(nextPoints);
  };

  const handleRemovePoint = (index: number) => {
    if (disabled) return;

    if (points.length <= 1) {
      // Nếu chỉ còn 1 dòng, xóa trắng nội dung nhưng bảo toàn ID
      const nextPoints = [{ id: points[0].id || generateKeyPointId(), text: '' }];
      onChange(nextPoints);
      inputRefs.current[0]?.focus();
      return;
    }

    const nextPoints = points.filter((_, i) => i !== index);
    const nextFocusIndex = Math.max(0, index - 1);
    pendingFocusIndexRef.current = nextFocusIndex;
    onChange(nextPoints);
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    // 1. Phím Enter: Tạo dòng mới bên dưới kèm ID mới và chuyển con trỏ vào ô mới
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      handleAddPoint(index);
      return;
    }

    // 2. Phím Backspace khi ô đang rỗng và còn nhiều hơn 1 dòng: Xóa nhanh và quay lại dòng trước
    if (e.key === 'Backspace' && points[index].text === '' && points.length > 1) {
      e.preventDefault();
      e.stopPropagation();
      handleRemovePoint(index);
      return;
    }

    // 3. Phím Mũi tên lên / xuống để di chuyển con trỏ giữa các ý
    if (e.key === 'ArrowUp' && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowDown' && index < points.length - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  return (
    <div className="space-y-2">
      {/* Tiêu đề trường và Nút bấm thêm nhanh */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <Label
            htmlFor={`${id}-input-0`}
            className="text-xs font-semibold text-foreground flex items-center gap-1.5"
          >
            <span>Nội dung cốt lõi của bài</span>
            <span className="text-destructive">*</span>
          </Label>
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
            Nhập các ý chính của bài giảng, mỗi ý sẽ là một nhánh con trên sơ đồ tư duy.
          </p>
        </div>

        <button
          type="button"
          disabled={disabled || points.length >= maxItems}
          onClick={() => handleAddPoint()}
          className="shrink-0 inline-flex items-center gap-1 rounded-xl border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-600 transition-all hover:bg-indigo-100 hover:border-indigo-300 active:scale-95 disabled:pointer-events-none disabled:opacity-50 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-400 dark:hover:bg-indigo-900/50 shadow-2xs"
          title="Thêm ý chính mới (hoặc nhấn Enter khi đang soạn thảo)"
        >
          <Icon icon="lucide:plus" className="size-3.5" />
          <span>Thêm ý</span>
        </button>
      </div>

      {/* Danh sách nhập liệu các Ý cốt lõi (Color Cycling + Persistent ID Key) */}
      <div className="space-y-2 pt-1" id={id}>
        {points.map((point, index) => {
          const color = getKeyPointColor(index);
          const placeholder = getKeyPointPlaceholder(index);
          const inputId = `${id}-input-${point.id}`;

          return (
            <div
              key={point.id}
              style={{
                backgroundColor: color.bg,
                borderColor: color.border,
              }}
              className="group relative flex items-center gap-2 rounded-xl border px-3 py-1.5 transition-all duration-150 shadow-2xs focus-within:ring-2 focus-within:ring-slate-900/20 dark:focus-within:ring-white/20"
            >
              {/* Dấu chấm tròn (bullet dot) đại diện cho nhánh Mindmap */}
              <span
                style={{ backgroundColor: color.dot }}
                className="size-2 rounded-full shrink-0 shadow-2xs ml-0.5"
                aria-hidden="true"
              />

              {/* Ô Input nhập nội dung ý */}
              <input
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                id={inputId}
                type="text"
                value={point.text}
                disabled={disabled}
                placeholder={placeholder}
                onChange={(e) => handlePointChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                maxLength={200}
                className="w-full bg-transparent text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-600/60 border-0 p-0 outline-none ring-0 focus:ring-0 focus:outline-none disabled:cursor-not-allowed"
                aria-label={`Ý cốt lõi thứ ${index + 1}`}
              />

              {/* Nút xóa ý (×) */}
              <button
                type="button"
                disabled={disabled}
                onClick={() => handleRemovePoint(index)}
                className="size-6 shrink-0 inline-flex items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-rose-500/20 hover:text-rose-700 active:scale-90 disabled:pointer-events-none disabled:opacity-40"
                title="Xóa ý này"
                aria-label={`Xóa ý thứ ${index + 1}`}
              >
                <Icon icon="lucide:x" className="size-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Hiển thị lỗi validation */}
      {error && (
        <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
          <Icon icon="lucide:alert-circle" className="size-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

