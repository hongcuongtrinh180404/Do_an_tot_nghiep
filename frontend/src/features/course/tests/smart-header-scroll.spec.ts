// @vitest-environment jsdom

import { act, createElement, StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useSmartHeaderScroll,
  type UseSmartHeaderScrollOptions,
  type UseSmartHeaderScrollReturn,
} from '../../../hooks/use-smart-header-scroll';

// Render the production hook with React. Only browser measurements and frame
// scheduling are controlled here; no copy of the scroll algorithm is tested.
function HookProbe({ options }: { options: UseSmartHeaderScrollOptions }) {
  const { isVisible, isAtTop } = useSmartHeaderScroll(options);
  return createElement('output', {
    'data-visible': String(isVisible),
    'data-at-top': String(isAtTop),
  });
}

const originalScrollY = Object.getOwnPropertyDescriptor(window, 'scrollY')!;
const originalInnerHeight = Object.getOwnPropertyDescriptor(window, 'innerHeight')!;

let root: Root | null;
let container: HTMLDivElement;
let scrollY: number;
let scrollHeight: number;
let innerHeight: number;
let nextFrameId: number;
let frames: Map<number, FrameRequestCallback>;

function mountHook(options: UseSmartHeaderScrollOptions = {}, strictMode = false): void {
  const probe = createElement(HookProbe, { options });
  act(() => {
    root!.render(strictMode ? createElement(StrictMode, null, probe) : probe);
  });
}

function state(): UseSmartHeaderScrollReturn {
  const output = container.querySelector('output')!;
  return {
    isVisible: output.dataset.visible === 'true',
    isAtTop: output.dataset.atTop === 'true',
  };
}

function emitScroll(y: number): void {
  scrollY = y;
  act(() => window.dispatchEvent(new Event('scroll')));
}

function flushFrame(): void {
  const pending = [...frames.values()];
  frames.clear();
  act(() => pending.forEach((callback) => callback(0)));
}

function scrollTo(y: number): void {
  emitScroll(y);
  flushFrame();
}

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  scrollY = 0;
  scrollHeight = 2000;
  innerHeight = 800;
  nextFrameId = 1;
  frames = new Map();

  Object.defineProperties(window, {
    scrollY: { configurable: true, get: () => scrollY },
    innerHeight: { configurable: true, get: () => innerHeight },
  });
  vi.spyOn(document.documentElement, 'scrollHeight', 'get').mockImplementation(() => scrollHeight);
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    const id = nextFrameId++;
    frames.set(id, callback);
    return id;
  });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
    frames.delete(id);
  });

  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root?.unmount());
  container.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Object.defineProperty(window, 'scrollY', originalScrollY);
  Object.defineProperty(window, 'innerHeight', originalInnerHeight);
});

describe('1. Always visible at scrollY <= 64px', () => {
  it('is visible before the first scroll event', () => {
    mountHook();
    expect(state()).toEqual({ isVisible: true, isAtTop: true });
  });

  it.each([0, 1, 32, 63, 64])('stays visible at exactly %ipx', (y) => {
    mountHook();
    scrollTo(y);
    expect(state()).toEqual({ isVisible: true, isAtTop: true });
  });

  it('restores a hidden header at the top even below the 8px threshold', () => {
    mountHook();
    scrollTo(64);
    scrollTo(72);
    scrollTo(70);
    expect(state().isVisible).toBe(false);

    scrollTo(64);
    expect(state()).toEqual({ isVisible: true, isAtTop: true });
  });
});

describe('2. Hide only past the top offset and downward threshold', () => {
  it('stays visible at 7px and hides at exactly 8px beyond the pivot', () => {
    mountHook();
    scrollTo(64);
    scrollTo(71);
    expect(state()).toEqual({ isVisible: true, isAtTop: false });

    scrollTo(72);
    expect(state()).toEqual({ isVisible: false, isAtTop: false });
  });

  it('hides on a large downward scroll', () => {
    mountHook();
    scrollTo(500);
    expect(state()).toEqual({ isVisible: false, isAtTop: false });
  });

  it('applies the downward threshold again after revealing the header', () => {
    mountHook();
    scrollTo(500);
    scrollTo(492);
    scrollTo(499);
    expect(state().isVisible).toBe(true);

    scrollTo(500);
    expect(state().isVisible).toBe(false);
  });

  it('respects custom threshold and topOffset values', () => {
    mountHook({ threshold: 12, topOffset: 100 });
    scrollTo(100);
    expect(state()).toEqual({ isVisible: true, isAtTop: true });
    scrollTo(111);
    expect(state()).toEqual({ isVisible: true, isAtTop: false });
    scrollTo(112);
    expect(state().isVisible).toBe(false);
  });
});

describe('3. Show on an upward scroll of exactly 8px', () => {
  it('ignores 7px of jitter and reveals in the frame that reaches 8px', () => {
    mountHook();
    scrollTo(500);
    scrollTo(493);
    expect(state().isVisible).toBe(false);

    emitScroll(492);
    expect(state().isVisible).toBe(false);
    flushFrame();
    expect(state().isVisible).toBe(true);
    expect(frames.size).toBe(0);
  });

  it('restarts upward distance after a direction reversal', () => {
    mountHook();
    scrollTo(500);
    scrollTo(496);
    scrollTo(500);
    scrollTo(493);
    expect(state().isVisible).toBe(false);
    scrollTo(492);
    expect(state().isVisible).toBe(true);
  });

  it('does not toggle on repeated events at an unchanged scroll position', () => {
    mountHook();
    scrollTo(500);
    scrollTo(500);
    expect(state().isVisible).toBe(false);
    scrollTo(492);
    scrollTo(492);
    expect(state().isVisible).toBe(true);
  });
});

describe('4. Accumulate slow scrolling across animation frames', () => {
  it('accumulates eight separate 1px upward frames', () => {
    mountHook();
    scrollTo(500);
    for (let y = 499; y > 492; y--) {
      scrollTo(y);
      expect(state().isVisible, `upward distance ${500 - y}px`).toBe(false);
    }
    scrollTo(492);
    expect(state().isVisible).toBe(true);
  });

  it('accumulates eight separate 1px downward frames', () => {
    mountHook();
    scrollTo(64);
    for (let y = 65; y < 72; y++) {
      scrollTo(y);
      expect(state().isVisible, `downward distance ${y - 64}px`).toBe(true);
    }
    scrollTo(72);
    expect(state().isVisible).toBe(false);
  });

  it('preserves fractional pixels across 32 separate frames', () => {
    mountHook();
    scrollTo(500);
    for (let frame = 1; frame < 32; frame++) {
      scrollTo(500 - frame * 0.25);
      expect(state().isVisible, `fractional frame ${frame}`).toBe(false);
    }
    scrollTo(492);
    expect(state().isVisible).toBe(true);
  });

  it('does not lose accumulated movement on zero-delta frames', () => {
    mountHook();
    scrollTo(500);
    for (const y of [499, 499, 497, 497, 494, 494, 493]) {
      scrollTo(y);
      expect(state().isVisible).toBe(false);
    }
    scrollTo(492);
    expect(state().isVisible).toBe(true);
  });

  it('does not add distances from opposing directions together', () => {
    mountHook();
    for (const y of [500, 497, 499, 494, 492]) {
      scrollTo(y);
      expect(state().isVisible).toBe(false);
    }
    scrollTo(491);
    expect(state().isVisible).toBe(true);
  });

  it('coalesces scroll events into one frame using the latest scroll position', () => {
    mountHook();
    scrollTo(64);
    vi.mocked(window.requestAnimationFrame).mockClear();
    emitScroll(65);
    emitScroll(68);
    emitScroll(71);
    expect(window.requestAnimationFrame).toHaveBeenCalledTimes(1);
    expect(frames.size).toBe(1);
    expect(state().isVisible).toBe(true);
    flushFrame();
    expect(state().isVisible).toBe(true);
    scrollTo(72);
    expect(state().isVisible).toBe(false);
  });

  it('preserves total distance when several events share each frame', () => {
    mountHook();
    scrollTo(500);
    for (const y of [499, 498, 496]) emitScroll(y);
    flushFrame();
    expect(state().isVisible).toBe(false);
    for (const y of [495, 494, 492]) emitScroll(y);
    flushFrame();
    expect(state().isVisible).toBe(true);
  });
});

describe('5. Guard against negative and bottom overscroll', () => {
  it('keeps the header visible throughout negative overscroll and rebound', () => {
    mountHook();
    scrollTo(500);
    for (const y of [-1, -40, -120, -40, -1, 0, 32, 64]) {
      scrollTo(y);
      expect(state(), `rubber-band scrollY=${y}`).toEqual({ isVisible: true, isAtTop: true });
    }
    scrollTo(71);
    expect(state().isVisible).toBe(true);
    scrollTo(72);
    expect(state().isVisible).toBe(false);
  });

  it('ignores bottom bounce and only reveals after 8px of real upward movement', () => {
    mountHook();
    for (const y of [1200, 1250, 1280, 1230, 1200, 1193]) {
      scrollTo(y);
      expect(state()).toEqual({ isVisible: false, isAtTop: false });
    }
    scrollTo(1192);
    expect(state().isVisible).toBe(true);
  });

  it('does not hide a visible header due to bottom overscroll', () => {
    mountHook();
    scrollTo(1200);
    scrollTo(1192);
    expect(state().isVisible).toBe(true);
    for (const y of [1250, 1280, 1230, 1192]) {
      scrollTo(y);
      expect(state().isVisible).toBe(true);
    }
  });

  it.each([600, 800])('keeps the header visible on a non-scrollable %ipx page', (height) => {
    scrollHeight = height;
    mountHook();
    for (const y of [100, 160, 80, 0, -40, 0]) {
      scrollTo(y);
      expect(state(), `non-scrollable rubber-band scrollY=${y}`).toEqual({
        isVisible: true,
        isAtTop: true,
      });
    }
  });

  it('restores a hidden header if the page becomes non-scrollable', () => {
    mountHook();
    scrollTo(500);
    expect(state().isVisible).toBe(false);
    scrollHeight = 800;
    scrollTo(100);
    expect(state()).toEqual({ isVisible: true, isAtTop: true });
  });
});

describe('6. Force visibility during interactions', () => {
  it.each(['menu open', 'drawer open', 'input focused'])('reveals without scrolling when %s', () => {
    mountHook();
    scrollTo(400);
    expect(state().isVisible).toBe(false);
    mountHook({ disabled: true });
    expect(state().isVisible).toBe(true);
  });

  it('stays visible while the interaction is active', () => {
    mountHook({ disabled: true });
    for (const y of [400, 800, 1200, 1192, 64, 500]) {
      scrollTo(y);
      expect(state().isVisible).toBe(true);
    }
  });

  it('starts measuring from the current position when interaction ends', () => {
    mountHook();
    scrollTo(400);
    mountHook({ disabled: true });
    scrollTo(900);
    mountHook({ disabled: false });
    for (let y = 901; y < 908; y++) {
      scrollTo(y);
      expect(state().isVisible, `post-interaction distance ${y - 900}px`).toBe(true);
    }
    scrollTo(908);
    expect(state().isVisible).toBe(false);
  });

  it('cancels a queued hide frame when interaction begins', () => {
    mountHook();
    emitScroll(400);
    expect(frames.size).toBe(1);
    mountHook({ disabled: true });
    expect(window.cancelAnimationFrame).toHaveBeenCalledTimes(1);
    expect(frames.size).toBe(0);
    flushFrame();
    expect(state().isVisible).toBe(true);
  });
});

describe('Lifecycle and listener safety', () => {
  it('uses a passive scroll listener', () => {
    const addEventListener = vi.spyOn(window, 'addEventListener');
    mountHook();
    expect(addEventListener).toHaveBeenCalledWith('scroll', expect.any(Function), { passive: true });
  });

  it('removes the listener and cancels a pending frame on unmount', () => {
    const addEventListener = vi.spyOn(window, 'addEventListener');
    const removeEventListener = vi.spyOn(window, 'removeEventListener');
    mountHook();
    const listener = addEventListener.mock.calls.find(([type]) => type === 'scroll')![1];
    emitScroll(400);
    expect(frames.size).toBe(1);
    act(() => root!.unmount());
    root = null;
    expect(removeEventListener).toHaveBeenCalledWith('scroll', listener);
    expect(window.cancelAnimationFrame).toHaveBeenCalledTimes(1);
    expect(frames.size).toBe(0);
    emitScroll(500);
    expect(frames.size).toBe(0);
  });

  it('keeps one active scroll listener under React StrictMode', () => {
    const addEventListener = vi.spyOn(window, 'addEventListener');
    const removeEventListener = vi.spyOn(window, 'removeEventListener');
    mountHook({}, true);
    const added = addEventListener.mock.calls.filter(([type]) => type === 'scroll').length;
    const removed = removeEventListener.mock.calls.filter(([type]) => type === 'scroll').length;
    expect(added - removed).toBe(1);
    emitScroll(400);
    expect(frames.size).toBe(1);
    flushFrame();
    expect(state().isVisible).toBe(false);
  });

  it('recognizes a restored mid-page position without waiting for a scroll event', () => {
    scrollY = 800;
    mountHook();
    expect(state()).toEqual({ isVisible: true, isAtTop: false });
  });

  it('measures the first 8px from the restored position rather than from zero', () => {
    scrollY = 800;
    mountHook();
    for (let y = 801; y < 808; y++) {
      scrollTo(y);
      expect(state().isVisible, `restored position +${y - 800}px`).toBe(true);
    }
    scrollTo(808);
    expect(state()).toEqual({ isVisible: false, isAtTop: false });
  });
});
