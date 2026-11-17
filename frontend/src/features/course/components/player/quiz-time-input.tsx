'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/icon';

export interface QuizTimeInputProps {
  id: string;
  label: string;
  subtext?: string;
  icon?: string;
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  onBlur?: () => void;
  error?: string;
  disabled?: boolean;
  duration?: number;
  inputRef?: (element: HTMLInputElement | null) => void;
  ariaDescribedBy?: string;
}

function isAllowedControlKey(e: React.KeyboardEvent<HTMLInputElement>): boolean {
  const navKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End', 'Enter'];
  if (navKeys.includes(e.key)) return true;
  if ((e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase())) return true;
  return false;
}

export function QuizTimeInput({
  id,
  label,
  subtext,
  icon = 'lucide:clock-3',
  value,
  onChange,
  onBlur,
  error,
  disabled = false,
  duration,
  inputRef,
}: QuizTimeInputProps): React.JSX.Element {
  const minInputRef = useRef<HTMLInputElement | null>(null);
  const secInputRef = useRef<HTMLInputElement | null>(null);
  const prevMinutesLength = useRef(0);
  const isFocusedRef = useRef(false);

  const initialMinutes = value != null ? Math.floor(Math.max(0, value) / 60) : null;
  const initialSeconds = value != null ? Math.floor(Math.max(0, value) % 60) : null;

  const [minStr, setMinStr] = useState<string>(initialMinutes != null ? String(initialMinutes).padStart(2, '0') : '');
  const [secStr, setSecStr] = useState<string>(initialSeconds != null ? String(initialSeconds).padStart(2, '0') : '');
  const [secondsWarning, setSecondsWarning] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  // Sync state from value when not actively typing
  useEffect(() => {
    if (isFocusedRef.current) return;
    const m = value == null ? '' : String(Math.floor(Math.max(0, value) / 60)).padStart(2, '0');
    const s = value == null ? '' : String(Math.floor(Math.max(0, value) % 60)).padStart(2, '0');
    // A controlled MM/SS field needs local text drafts to preserve incomplete input while focused.
    setMinStr(m);
    setSecStr(s);
    setSecondsWarning(false);
  }, [value]);

  const triggerShake = () => {
    setIsShaking(false);
    requestAnimationFrame(() => {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 200);
    });
  };

  const notifyChange = (mText: string, sText: string) => {
    const cleanM = mText.replace(/\D/g, '');
    const cleanS = sText.replace(/\D/g, '');
    if (!cleanM && !cleanS) {
      onChange(null);
      return;
    }
    const m = parseInt(cleanM || '0', 10);
    const s = parseInt(cleanS || '0', 10);
    const total = m * 60 + s;
    onChange(total);
  };

  // ==================== PHÚT ====================
  const handleMinutesKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Mũi tên phải ở cuối ô Phút -> chuyển sang đầu ô Giây
    if (
      e.key === 'ArrowRight' &&
      e.currentTarget.selectionStart === e.currentTarget.value.length &&
      e.currentTarget.selectionEnd === e.currentTarget.value.length
    ) {
      e.preventDefault();
      secInputRef.current?.focus();
      secInputRef.current?.setSelectionRange(0, 0);
      return;
    }

    if (isAllowedControlKey(e)) {
      prevMinutesLength.current = e.currentTarget.value.length;
      return;
    }

    // Chặn hoàn toàn ký tự phi số
    if (!/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      triggerShake();
      return;
    }

    const selectedLen = (e.currentTarget.selectionEnd || 0) - (e.currentTarget.selectionStart || 0);
    prevMinutesLength.current = e.currentTarget.value.length - selectedLen;
  };

  const handleMinutesInput = (e: React.InputEvent<HTMLInputElement>) => {
    const cleaned = e.currentTarget.value.replace(/\D/g, '').slice(0, 3);
    setMinStr(cleaned);

    // Tự động chuyển con trỏ sang ô Giây sau khi gõ đủ 2 chữ số phút
    if (prevMinutesLength.current === 1 && cleaned.length === 2) {
      secInputRef.current?.focus();
      secInputRef.current?.select();
    }
    prevMinutesLength.current = cleaned.length;
    notifyChange(cleaned, secStr);
  };

  const handleMinutesPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text');
    const digits = pasted.replace(/\D/g, '');
    if (!digits) {
      triggerShake();
      return;
    }

    // Hỗ trợ dán chuỗi 4 số kiểu "0526" hoặc "05:26" tách thẳng sang 2 ô
    if (digits.length === 4) {
      const m = digits.slice(0, 2);
      let secs = parseInt(digits.slice(2, 4), 10);
      let sStr = digits.slice(2, 4);
      if (secs >= 60) {
        secs = 59;
        sStr = '59';
        setSecondsWarning(true);
      } else {
        setSecondsWarning(false);
      }
      setMinStr(m);
      setSecStr(sStr);
      notifyChange(m, sStr);
      secInputRef.current?.focus();
      return;
    }

    const m = digits.slice(0, 3);
    setMinStr(m);
    prevMinutesLength.current = m.length;
    notifyChange(m, secStr);
  };

  const handleMinutesBlur = () => {
    isFocusedRef.current = false;
    const digits = minStr.replace(/\D/g, '');
    let formatted = digits;
    if (digits) {
      formatted = digits.padStart(2, '0');
      setMinStr(formatted);
    }
    notifyChange(formatted, secStr);
    onBlur?.();
  };

  // ==================== GIÂY ====================
  const handleSecondsKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Backspace khi ô Giây đang trống -> tự động lùi con trỏ về cuối ô Phút
    if (e.key === 'Backspace' && (!secStr || secStr === '')) {
      e.preventDefault();
      minInputRef.current?.focus();
      const len = minInputRef.current?.value.length || 0;
      minInputRef.current?.setSelectionRange(len, len);
      return;
    }

    // Mũi tên trái ở đầu ô Giây -> di chuyển sang cuối ô Phút
    if (
      e.key === 'ArrowLeft' &&
      e.currentTarget.selectionStart === 0 &&
      e.currentTarget.selectionEnd === 0
    ) {
      e.preventDefault();
      minInputRef.current?.focus();
      const len = minInputRef.current?.value.length || 0;
      minInputRef.current?.setSelectionRange(len, len);
      return;
    }

    if (isAllowedControlKey(e)) return;

    // Chặn hoàn toàn ký tự phi số
    if (!/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      triggerShake();
    }
  };

  const handleSecondsInput = (e: React.InputEvent<HTMLInputElement>) => {
    const cleaned = e.currentTarget.value.replace(/\D/g, '').slice(0, 2);
    if (!cleaned) {
      setSecStr('');
      setSecondsWarning(false);
      notifyChange(minStr, '');
      return;
    }

    const numericVal = parseInt(cleaned, 10);
    if (numericVal >= 60) {
      setSecStr('59');
      setSecondsWarning(true);
      notifyChange(minStr, '59');
    } else {
      setSecStr(cleaned);
      setSecondsWarning(false);
      notifyChange(minStr, cleaned);
    }
  };

  const handleSecondsPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text');
    const digits = pasted.replace(/\D/g, '').slice(0, 2);
    if (!digits) {
      triggerShake();
      return;
    }

    let numericVal = parseInt(digits, 10);
    let cleaned = digits;
    if (numericVal >= 60) {
      numericVal = 59;
      cleaned = '59';
      setSecondsWarning(true);
    } else {
      setSecondsWarning(false);
    }
    setSecStr(cleaned);
    notifyChange(minStr, cleaned);
  };

  const handleSecondsBlur = () => {
    isFocusedRef.current = false;
    const digits = secStr.replace(/\D/g, '');
    let formatted = digits;
    if (digits) {
      let numericVal = parseInt(digits, 10);
      if (numericVal >= 60) {
        numericVal = 59;
        setSecondsWarning(true);
      }
      formatted = String(numericVal).padStart(2, '0');
      setSecStr(formatted);
    }
    notifyChange(minStr, formatted);
    onBlur?.();
  };

  const isExceedDuration = Boolean(duration && duration > 0 && value != null && value > duration);
  const displayError = error || (isExceedDuration ? 'Thời gian không được vượt quá thời lượng video.' : null);

  return (
    <div className="flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-xl border border-border/80 bg-card text-center space-y-1.5 shadow-2xs">
      <div className="flex items-center gap-1.5">
        <div className="inline-flex items-center justify-center size-5 rounded-md bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400">
          <Icon icon={icon} className="size-3" aria-hidden="true" />
        </div>
        <h4 className="text-xs font-semibold text-foreground">
          {label} (<span className="font-mono text-[11px] text-sky-600 dark:text-sky-400">mm:ss</span>)
        </h4>
      </div>

      {subtext && (
        <p className="text-[11px] text-muted-foreground leading-tight line-clamp-1">
          {subtext}
        </p>
      )}

      {/* Cụm 2 ô nhập Phút : Giây */}
      <div
        className={`flex items-start justify-center gap-2 pt-0.5 transition-transform ${
          isShaking ? 'translate-x-1 duration-75' : ''
        }`}
      >
        {/* Ô bên trái: Phút */}
        <div className="flex flex-col items-center">
          <input
            ref={(el) => {
              minInputRef.current = el;
              inputRef?.(el);
            }}
            type="text"
            id={`${id}-minutes`}
            inputMode="numeric"
            autoComplete="off"
            maxLength={3}
            placeholder="00"
            aria-label={`${label} - Phút`}
            onFocus={(e) => {
              isFocusedRef.current = true;
              e.currentTarget.select();
            }}
            onKeyDown={handleMinutesKeyDown}
            onInput={handleMinutesInput}
            onPaste={handleMinutesPaste}
            onBlur={handleMinutesBlur}
            disabled={disabled}
            value={minStr}
            className={`w-12 sm:w-14 h-9 sm:h-10 text-center font-mono text-base sm:text-lg font-bold text-foreground bg-muted/30 border rounded-lg outline-none transition focus:bg-background placeholder:text-muted-foreground/30 disabled:opacity-50 ${
              displayError
                ? 'border-destructive focus:border-destructive focus:ring-2 focus:ring-destructive/15'
                : 'border-input focus:border-sky-500 focus:ring-2 focus:ring-sky-500/15'
            }`}
          />
          <label htmlFor={`${id}-minutes`} className="mt-0.5 text-[10px] font-medium text-muted-foreground select-none">
            Phút
          </label>
        </div>

        {/* Dấu hai chấm cố định */}
        <div className="h-9 sm:h-10 flex items-center justify-center select-none">
          <span className="font-mono text-base sm:text-lg font-bold text-muted-foreground/60 pb-0.5">:</span>
        </div>

        {/* Ô bên phải: Giây */}
        <div className="flex flex-col items-center">
          <input
            ref={secInputRef}
            type="text"
            id={`${id}-seconds`}
            inputMode="numeric"
            autoComplete="off"
            maxLength={2}
            placeholder="00"
            aria-label={`${label} - Giây`}
            onFocus={(e) => {
              isFocusedRef.current = true;
              e.currentTarget.select();
            }}
            onKeyDown={handleSecondsKeyDown}
            onInput={handleSecondsInput}
            onPaste={handleSecondsPaste}
            onBlur={handleSecondsBlur}
            disabled={disabled}
            value={secStr}
            className={`w-12 sm:w-14 h-9 sm:h-10 text-center font-mono text-base sm:text-lg font-bold text-foreground bg-muted/30 border rounded-lg outline-none transition focus:bg-background placeholder:text-muted-foreground/30 disabled:opacity-50 ${
              secondsWarning || displayError
                ? 'border-rose-400 bg-rose-50/40 dark:bg-rose-950/20 text-rose-600 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/15'
                : 'border-input focus:border-sky-500 focus:ring-2 focus:ring-sky-500/15'
            }`}
          />
          <label htmlFor={`${id}-seconds`} className="mt-0.5 text-[10px] font-medium text-muted-foreground select-none">
            Giây
          </label>
        </div>
      </div>

      {/* Cảnh báo khi giây >= 60 */}
      {secondsWarning && (
        <p
          role="alert"
          className="text-center text-[11px] font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/60 rounded-md px-2 py-0.5"
        >
          Giây chỉ được nhập từ 00 đến 59
        </p>
      )}

      {/* Dòng cảnh báo lỗi form */}
      {displayError && !secondsWarning && (
        <p
          role="alert"
          className="text-center text-[11px] font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-2 py-0.5"
        >
          {displayError}
        </p>
      )}
    </div>
  );
}
