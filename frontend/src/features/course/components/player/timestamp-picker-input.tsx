'use client';

import React, { useRef, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';

export interface TimestampPickerInputProps {
  valueSeconds: number;
  onChange: (seconds: number) => void;
  maxDuration?: number;
  disabled?: boolean;
  hasError?: boolean;
  className?: string;
  autoFocus?: boolean;
  currentTime?: number;
  onQuickFillCurrentTime?: () => void;
}

function formatPadded(num: number): string {
  return num.toString().padStart(2, '0');
}

export function TimestampPickerInput({
  valueSeconds,
  onChange,
  maxDuration,
  disabled = false,
  hasError = false,
  className,
  autoFocus = false,
  currentTime,
  onQuickFillCurrentTime,
}: TimestampPickerInputProps): React.JSX.Element {
  const minInputRef = useRef<HTMLInputElement>(null);
  const secInputRef = useRef<HTMLInputElement>(null);

  const initialMinutes = Math.floor(Math.max(0, valueSeconds) / 60);
  const initialSeconds = Math.floor(Math.max(0, valueSeconds) % 60);

  const [minStr, setMinStr] = useState<string>(formatPadded(initialMinutes));
  const [secStr, setSecStr] = useState<string>(formatPadded(initialSeconds));

  // Theo dõi ô đang được focus để tránh useEffect đồng bộ ngược ghi đè khi người dùng đang gõ
  const [focusedInput, setFocusedInput] = useState<'min' | 'sec' | null>(null);

  // Đồng bộ state cục bộ khi valueSeconds thay đổi từ bên ngoài (chỉ khi người dùng KHÔNG đang focus gõ)
  useEffect(() => {
    if (focusedInput !== null) return;
    const m = Math.floor(Math.max(0, valueSeconds) / 60);
    const s = Math.floor(Math.max(0, valueSeconds) % 60);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMinStr(formatPadded(m));
    setSecStr(formatPadded(s));
  }, [valueSeconds, focusedInput]);

  // Phím điều hướng & phím số cho phép
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    type: 'min' | 'sec',
  ) => {
    // Cho phép phím tắt hệ thống (Ctrl+A, Ctrl+C, Ctrl+V, ...)
    if (e.ctrlKey || e.metaKey) return;

    // Phím điều hướng & xóa hợp lệ
    const allowedKeys = [
      'Backspace',
      'Delete',
      'Tab',
      'Enter',
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'ArrowDown',
      'Home',
      'End',
    ];
    if (allowedKeys.includes(e.key)) {
      // Phím Backspace khi ô giây rỗng -> tự động lùi về ô phút
      if (type === 'sec' && e.key === 'Backspace' && (!secStr || secStr.length === 0)) {
        minInputRef.current?.focus();
      }
      return;
    }

    // Nếu gõ dấu ":" hoặc "/" ở ô phút -> nhảy sang ô giây
    if (type === 'min' && (e.key === ':' || e.key === '/')) {
      e.preventDefault();
      secInputRef.current?.focus();
      return;
    }

    // Chặn hoàn toàn ký tự phi số (chữ cái, ký tự đặc biệt)
    if (!/^[0-9]$/.test(e.key)) {
      e.preventDefault();
    }
  };

  // Xử lý thay đổi ô phút
  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 3); // Tối đa 3 chữ số (0 - 999)
    setMinStr(raw);

    const m = parseInt(raw || '0', 10);
    const s = parseInt(secStr || '0', 10);
    onChange(m * 60 + s);

    // Tự động nhảy sang ô giây khi đã nhập đủ 2 chữ số phút
    if (raw.length === 2) {
      secInputRef.current?.focus();
    }
  };

  // Xử lý thay đổi ô giây (cho phép gõ số thô tự nhiên không bị ép 03)
  const handleSecChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\D/g, '').slice(0, 2);
    let s = parseInt(raw || '0', 10);

    // Khống chế giây cứng 0 - 59: nếu người dùng gõ > 59 (ví dụ 75), tự chỉnh về 59
    if (s > 59) {
      s = 59;
      raw = '59';
    }

    setSecStr(raw);
    const m = parseInt(minStr || '0', 10);
    onChange(m * 60 + s);
  };

  // Đệm số 0 khi blur khỏi ô phút
  const handleMinBlur = () => {
    setFocusedInput(null);
    const m = parseInt(minStr || '0', 10);
    setMinStr(formatPadded(m));
  };

  // Đệm số 0 khi blur khỏi ô giây (chỉ format thành 2 chữ số khi người dùng rời ô)
  const handleSecBlur = () => {
    setFocusedInput(null);
    const s = Math.min(59, Math.max(0, parseInt(secStr || '0', 10)));
    setSecStr(formatPadded(s));
  };

  // Nút nhanh lấy currentTime
  const handleFillCurrentTime = () => {
    if (onQuickFillCurrentTime) {
      onQuickFillCurrentTime();
      return;
    }
    if (currentTime !== undefined) {
      const curSec = Math.floor(Math.max(0, currentTime));
      const m = Math.floor(curSec / 60);
      const s = curSec % 60;
      setMinStr(formatPadded(m));
      setSecStr(formatPadded(s));
      onChange(curSec);
    }
  };

  const isExceedDuration = maxDuration && maxDuration > 0 && valueSeconds > maxDuration;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        className={cn(
          'inline-flex items-center rounded-lg border bg-card px-2 py-1 transition-all shadow-2xs',
          hasError || isExceedDuration
            ? 'border-rose-500 ring-2 ring-rose-500/20'
            : 'border-input focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/20',
          disabled && 'opacity-60 pointer-events-none bg-muted/40',
        )}
      >
        {/* Ô phút */}
        <input
          ref={minInputRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={minStr}
          onChange={handleMinChange}
          onKeyDown={(e) => handleKeyDown(e, 'min')}
          onFocus={() => setFocusedInput('min')}
          onBlur={handleMinBlur}
          disabled={disabled}
          autoFocus={autoFocus}
          placeholder="00"
          className="w-7 text-center font-mono text-xs sm:text-sm font-semibold text-foreground bg-transparent outline-none p-0"
          maxLength={3}
          aria-label="Phút"
        />

        {/* Dấu hai chấm cố định */}
        <span className="font-mono text-xs sm:text-sm font-bold text-muted-foreground select-none px-0.5">
          :
        </span>

        {/* Ô giây */}
        <input
          ref={secInputRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={secStr}
          onChange={handleSecChange}
          onKeyDown={(e) => handleKeyDown(e, 'sec')}
          onFocus={() => setFocusedInput('sec')}
          onBlur={handleSecBlur}
          disabled={disabled}
          placeholder="00"
          className="w-7 text-center font-mono text-xs sm:text-sm font-semibold text-foreground bg-transparent outline-none p-0"
          maxLength={2}
          aria-label="Giây"
        />
      </div>

      {/* Nút lấy mốc phát hiện tại của video */}
      {currentTime !== undefined && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleFillCurrentTime}
          disabled={disabled}
          title={`Lấy giây hiện tại của video (${formatPadded(Math.floor(currentTime / 60))}:${formatPadded(Math.floor(currentTime % 60))})`}
          className="h-8 px-2 text-[11px] font-medium shrink-0 cursor-pointer border-border hover:border-sky-500/40 hover:bg-sky-500/10 text-muted-foreground hover:text-sky-600 dark:hover:text-sky-400 transition-colors shadow-2xs"
        >
          <Icon icon="lucide:clock" className="size-3 mr-1 text-sky-500" />
          <span>Hiện tại</span>
        </Button>
      )}
    </div>
  );
}
