'use client';

import { useCallback, useEffect, useRef, type RefObject } from 'react';
import type { CourseApprovalField, ICourseApprovalChecklist, ICourseApprovalTarget } from 'share-lib';

// Follows the editor's reading order, including the level/category controls above description.
const fieldOrder: CourseApprovalField[] = [
  'title', 'level', 'category', 'description', 'thumbnail', 'trailer', 'curriculum',
];

export interface CourseCurriculumHandle {
  revealApprovalTarget: (target: ICourseApprovalTarget) => void;
}

export function useCourseApprovalNavigation(
  rootRef: RefObject<HTMLDivElement | null>,
  curriculumRef: RefObject<CourseCurriculumHandle | null>,
) {
  const cleanupRef = useRef<(() => void) | null>(null);
  const cancel = useCallback(() => {
    cleanupRef.current?.();
    cleanupRef.current = null;
  }, []);

  useEffect(() => cancel, [cancel]);

  const navigate = useCallback((checklist: ICourseApprovalChecklist) => {
    cancel();
    const issues = checklist.items.flatMap((item) => item.issues);
    const target = issues.toSorted((a, b) =>
      fieldOrder.indexOf(a.target.field) - fieldOrder.indexOf(b.target.field),
    )[0]?.target;
    const root = rootRef.current;
    if (!target || !root) return;

    if (target.field === 'curriculum') curriculumRef.current?.revealApprovalTarget(target);

    const selector = target.lessonId
      ? `[data-approval-lesson="${CSS.escape(target.lessonId)}"]`
      : target.sectionId
        ? `[data-approval-section="${CSS.escape(target.sectionId)}"]`
        : `[data-approval-field="${target.field}"]`;
    let frame = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let element: HTMLElement | null = null;
    const started = performance.now();
    let previousTop: number | undefined;
    let stableFrames = 0;
    let scrollingSince = 0;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const finish = () => {
      if (!element) return;
      const focusTarget = element.querySelector<HTMLElement>('[data-approval-focus]') ?? element;
      focusTarget.focus({ preventScroll: true });
      element.setAttribute('data-approval-highlight', '');
      timer = setTimeout(cancel, 2000);
    };

    const waitForScroll = () => {
      if (!element?.isConnected) return cancel();
      const top = element.getBoundingClientRect().top;
      stableFrames = previousTop !== undefined && Math.abs(top - previousTop) < 0.5
        ? stableFrames + 1 : 0;
      previousTop = top;
      if ((stableFrames >= 4 && performance.now() - scrollingSince > 150) ||
        performance.now() - scrollingSince > 2500) {
        finish();
      } else {
        frame = requestAnimationFrame(waitForScroll);
      }
    };

    const waitForTarget = () => {
      element = root.querySelector<HTMLElement>(selector);
      // A collapsed chapter or a mindmap-to-tree transition may not be mounted yet.
      if (!element || element.getClientRects().length === 0) {
        if (performance.now() - started < 3000) {
          frame = requestAnimationFrame(waitForTarget);
          return;
        }
        element = root.querySelector<HTMLElement>(`[data-approval-field="${target.field}"]`);
      }
      if (!element) return cancel();
      element.scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth', block: 'center' });
      scrollingSince = performance.now();
      if (reducedMotion) finish();
      else frame = requestAnimationFrame(waitForScroll);
    };

    cleanupRef.current = () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      element?.removeAttribute('data-approval-highlight');
    };
    frame = requestAnimationFrame(waitForTarget);
  }, [cancel, rootRef, curriculumRef]);

  return { navigate, cancel };
}
