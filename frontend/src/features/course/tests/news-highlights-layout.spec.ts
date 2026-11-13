import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('NewsHighlightsCarousel Layout & Full-Width Specs', () => {
  const filePath = path.resolve(__dirname, '../components/public-discovery/news-highlights-carousel.tsx');
  const sourceCode = fs.readFileSync(filePath, 'utf-8');

  it('enforces full-width container layout (w-full px-4 sm:px-6 lg:px-8 without max-w restriction)', () => {
    expect(sourceCode).toContain('className="w-full px-4 sm:px-6 lg:px-8"');
    expect(sourceCode).not.toContain('max-w-[1440px]');
  });

  it('enforces responsive mathematical card widths from mobile to 2xl without empty gaps (6 cards on desktop)', () => {
    // 2 cards on mobile (<640px)
    expect(sourceCode).toContain('w-[calc((100%-12px)/2)]');
    // 3 cards on sm (640px+)
    expect(sourceCode).toContain('sm:w-[calc((100%-32px)/3)]');
    // 4 cards on md (768px+)
    expect(sourceCode).toContain('md:w-[calc((100%-48px)/4)]');
    // 6 cards on lg (1024px+), xl (1280px+) & 2xl (1536px+)
    expect(sourceCode).toContain('lg:w-[calc((100%-80px)/6)]');
    expect(sourceCode).toContain('xl:w-[calc((100%-80px)/6)]');
    expect(sourceCode).toContain('2xl:w-[calc((100%-80px)/6)]');
  });

  it('preserves aspect-ratio 3:4 and dark aesthetic styles', () => {
    expect(sourceCode).toContain('aspect-[3/4]');
    expect(sourceCode).toContain('bg-[#141414]');
    expect(sourceCode).toContain('bg-zinc-900');
  });

  it('preserves user preference of navigation arrow coordinates', () => {
    expect(sourceCode).toContain('sm:left-[216px] md:left-[234px]');
    expect(sourceCode).toContain('sm:right-[216px] md:right-[234px]');
  });
});
