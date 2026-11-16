import { describe, expect, it } from 'vitest';
import type { ILessonMaterial } from 'share-lib';
import {
  formatFileSize,
  getMaterialFileConfig,
  shouldShowMaterialIndicator,
} from '../utils/lesson-material.util';

describe('lesson-material.util', () => {
  describe('shouldShowMaterialIndicator', () => {
    const mockMaterial: ILessonMaterial = {
      id: 'mat-1',
      title: 'Tài liệu hướng dẫn',
      url: 'https://example.com/guide.pdf',
      fileName: 'guide.pdf',
    };

    it('returns true when lesson is a video and has at least one material', () => {
      expect(shouldShowMaterialIndicator(true, [mockMaterial])).toBe(true);
      expect(shouldShowMaterialIndicator(true, [mockMaterial, { ...mockMaterial, id: 'mat-2' }])).toBe(true);
    });

    it('returns false when lesson is a video but has empty materials array', () => {
      expect(shouldShowMaterialIndicator(true, [])).toBe(false);
    });

    it('returns false when lesson is a video but materials is null or undefined', () => {
      expect(shouldShowMaterialIndicator(true, null)).toBe(false);
      expect(shouldShowMaterialIndicator(true, undefined)).toBe(false);
    });

    it('returns false when lesson is NOT a video (e.g. document lesson) even if materials exist', () => {
      expect(shouldShowMaterialIndicator(false, [mockMaterial])).toBe(false);
    });
  });

  describe('formatFileSize', () => {
    it('returns empty string for zero, negative or missing values', () => {
      expect(formatFileSize(0)).toBe('');
      expect(formatFileSize(-100)).toBe('');
      expect(formatFileSize(null)).toBe('');
      expect(formatFileSize(undefined)).toBe('');
    });

    it('formats KB correctly', () => {
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(500 * 1024)).toBe('500 KB');
    });

    it('formats MB correctly with one decimal place', () => {
      expect(formatFileSize(1024 * 1024)).toBe('1.0 MB');
      expect(formatFileSize(2.5 * 1024 * 1024)).toBe('2.5 MB');
    });
  });

  describe('getMaterialFileConfig', () => {
    it('returns PDF config for .pdf files or pdf mimeType', () => {
      const config1 = getMaterialFileConfig('slides.pdf');
      expect(config1.tagText).toBe('PDF');
      expect(config1.icon).toBe('lucide:file-text');

      const config2 = getMaterialFileConfig('document', 'application/pdf');
      expect(config2.tagText).toBe('PDF');
    });

    it('returns archive config for zip, rar, 7z', () => {
      const config = getMaterialFileConfig('code.zip');
      expect(config.tagText).toBe('ZIP');
      expect(config.icon).toBe('lucide:archive');
    });

    it('returns DOCX config for doc and docx', () => {
      const config = getMaterialFileConfig('lecture.docx');
      expect(config.tagText).toBe('DOCX');
      expect(config.icon).toBe('lucide:file-text');
    });

    it('returns default fallback for unknown file extensions', () => {
      const config = getMaterialFileConfig('unknown_data.bin');
      expect(config.tagText).toBe('BIN');
      expect(config.icon).toBe('lucide:file');
    });
  });
});
