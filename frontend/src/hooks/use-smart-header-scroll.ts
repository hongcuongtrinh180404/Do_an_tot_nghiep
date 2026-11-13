'use client';

import { useState, useEffect, useRef } from 'react';

export interface UseSmartHeaderScrollOptions {
  /**
   * Minimum scroll distance in pixels to trigger a state toggle (prevents jitter).
   * @default 8
   */
  threshold?: number;
  /**
   * Top offset in pixels where header is always visible regardless of scroll direction.
   * @default 64
   */
  topOffset?: number;
  /**
   * If true, forces the header to stay visible (e.g. while mobile menu is open,
   * popover is active, or an input inside header is focused).
   * @default false
   */
  disabled?: boolean;
}

export interface UseSmartHeaderScrollReturn {
  isVisible: boolean;
  isAtTop: boolean;
}

/**
 * Smart Sticky Header hook implementing the Headroom pattern.
 * - Always shows at top of the page (scrollY <= topOffset).
 * - Hides smoothly when scrolling down.
 * - Shows immediately when scrolling up even slightly (accumulated delta >= threshold).
 * - Uses requestAnimationFrame to throttle calculations to screen refresh rate.
 * - Employs direction reversal pivot tracking to reliably detect slow pixel-by-pixel scrolling.
 * - Guards against rubber-banding / elastic bounce on iOS Safari and macOS.
 */
export function useSmartHeaderScroll({
  threshold = 8,
  topOffset = 64,
  disabled = false,
}: UseSmartHeaderScrollOptions = {}): UseSmartHeaderScrollReturn {
  const [isVisible, setIsVisible] = useState(true);
  const [isAtTop, setIsAtTop] = useState(true);

  const isVisibleRef = useRef(true);
  const isAtTopRef = useRef(true);
  const lastScrollYRef = useRef(0);
  const pivotScrollYRef = useRef(0);
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    // Scroll restoration and interaction changes must start a fresh measurement
    // at the actual position, not at zero or the last pre-interaction frame.
    const initialMaxScrollY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const initialScrollY = Math.min(initialMaxScrollY, Math.max(0, window.scrollY));
    const initialAtTop = initialScrollY <= topOffset;
    lastScrollYRef.current = initialScrollY;
    pivotScrollYRef.current = initialScrollY;

    if (isAtTopRef.current !== initialAtTop) {
      isAtTopRef.current = initialAtTop;
      setIsAtTop(initialAtTop);
    }

    // Interactions and the top of the page always take precedence over hiding.
    if (disabled || initialAtTop) {
      if (!isVisibleRef.current) {
        isVisibleRef.current = true;
        setIsVisible(true);
      }
    }
    if (disabled) return;

    const onScroll = (): void => {
      if (rafIdRef.current !== null) return;

      rafIdRef.current = window.requestAnimationFrame(() => {
        rafIdRef.current = null;

        const rawScrollY = window.scrollY;
        const maxScrollY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
        // A short page has no real scroll movement, even during positive bounce.
        const currentScrollY = maxScrollY === 0 ? 0 : Math.max(0, rawScrollY);

        // Ignore bottom overscroll bounce
        if (currentScrollY > maxScrollY) {
          return;
        }

        const atTop = currentScrollY <= topOffset;
        if (isAtTopRef.current !== atTop) {
          isAtTopRef.current = atTop;
          setIsAtTop(atTop);
        }

        // 1. At top of page -> always show header
        if (atTop) {
          pivotScrollYRef.current = currentScrollY;
          lastScrollYRef.current = currentScrollY;
          if (!isVisibleRef.current) {
            isVisibleRef.current = true;
            setIsVisible(true);
          }
          return;
        }

        const lastScrollY = lastScrollYRef.current;
        const diff = currentScrollY - lastScrollY;

        const scrollingDown = diff > 0;
        const scrollingUp = diff < 0;

        // Reset pivot reference when scroll direction reverses
        if (scrollingDown && lastScrollY <= pivotScrollYRef.current) {
          pivotScrollYRef.current = lastScrollY;
        } else if (scrollingUp && lastScrollY >= pivotScrollYRef.current) {
          pivotScrollYRef.current = lastScrollY;
        }

        const distanceFromPivot = currentScrollY - pivotScrollYRef.current;

        // 2. Scroll Down past threshold -> hide header
        if (scrollingDown && distanceFromPivot >= threshold) {
          if (isVisibleRef.current) {
            isVisibleRef.current = false;
            setIsVisible(false);
          }
          pivotScrollYRef.current = currentScrollY;
        }
        // 3. Scroll Up past threshold -> show header immediately
        else if (scrollingUp && -distanceFromPivot >= threshold) {
          if (!isVisibleRef.current) {
            isVisibleRef.current = true;
            setIsVisible(true);
          }
          pivotScrollYRef.current = currentScrollY;
        }

        lastScrollYRef.current = currentScrollY;
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafIdRef.current !== null) {
        window.cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [disabled, threshold, topOffset]);

  return { isVisible, isAtTop };
}
