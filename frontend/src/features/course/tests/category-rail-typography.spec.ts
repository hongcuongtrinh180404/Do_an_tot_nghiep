import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('CategoryRail Typography & Visual Hierarchy Specs', () => {
  const filePath = path.resolve(__dirname, '../components/public-discovery/category-rail.tsx');
  const sourceCode = fs.readFileSync(filePath, 'utf-8');

  it('enforces Category Card title typography in the 16px–18px range with font-weight 600–700', () => {
    // Check font sizes: text-base (16px), sm:text-[17px], lg:text-[18px]
    expect(sourceCode).toContain('text-base');
    expect(sourceCode).toContain('sm:text-[17px]');
    expect(sourceCode).toContain('lg:text-[18px]');

    // Check font weight: font-semibold (600) and md:font-bold (700)
    expect(sourceCode).toContain('font-semibold');
    expect(sourceCode).toContain('md:font-bold');

    // Color must be white
    expect(sourceCode).toContain('text-white');
  });

  it('enforces padding 14px–16px (p-3.5 sm:p-4) on category title container', () => {
    expect(sourceCode).toContain('p-3.5 sm:p-4');
  });

  it('enforces 2-line clamp with word breaking to prevent text overflow', () => {
    expect(sourceCode).toContain('line-clamp-2');
    expect(sourceCode).toContain('break-words');
  });

  it('enforces enhanced gradient contrast overlay (h-[60%] from-black/80 via-black/40 to-transparent)', () => {
    expect(sourceCode).toContain('h-[60%]');
    expect(sourceCode).toContain('from-black/80');
    expect(sourceCode).toContain('via-black/40');
  });

  it('enforces Section Heading typography (26px–30px, font-bold 700)', () => {
    expect(sourceCode).toContain('text-2xl sm:text-[26px] md:text-[28px] lg:text-[30px]');
    expect(sourceCode).toContain('font-bold');
    expect(sourceCode).toContain('Khám phá theo lĩnh vực chuyên môn');
  });

  it('enforces Section description typography (15px–16px)', () => {
    expect(sourceCode).toContain('text-[15px] sm:text-base');
  });

  it('keeps course count as plain text without pill badge', () => {
    // Must NOT have rounded-full badge pill styling on course count
    const sectionMatch = sourceCode.match(/\{totalCourses\} khóa học sẵn có/);
    expect(sectionMatch).not.toBeNull();
    expect(sourceCode).not.toContain('rounded-full whitespace-nowrap bg-neutral');
  });
});
