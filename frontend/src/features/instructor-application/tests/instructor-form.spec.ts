import { describe, expect, it } from 'vitest';
import {
  ALLOWED_CV_EXTENSIONS,
  ALLOWED_CV_MIME_TYPES,
  INSTRUCTOR_EXPERTISE_OPTIONS,
  INSTRUCTOR_TERMS_MOCK,
  MAX_CV_FILE_SIZE_BYTES,
} from '../instructor-application';

describe('Instructor Application Form Specifications', () => {
  describe('Document CV File Upload Constraints', () => {
    it('only allows document file extensions (PDF, DOC, DOCX)', () => {
      expect(ALLOWED_CV_EXTENSIONS).toEqual(['.pdf', '.doc', '.docx']);
      expect(ALLOWED_CV_EXTENSIONS.includes('.pdf')).toBe(true);
      expect(ALLOWED_CV_EXTENSIONS.includes('.doc')).toBe(true);
      expect(ALLOWED_CV_EXTENSIONS.includes('.docx')).toBe(true);
      // Ensure image or audio or zip extensions are rejected
      expect(ALLOWED_CV_EXTENSIONS.includes('.png')).toBe(false);
      expect(ALLOWED_CV_EXTENSIONS.includes('.jpg')).toBe(false);
      expect(ALLOWED_CV_EXTENSIONS.includes('.zip')).toBe(false);
    });

    it('enforces allowed document MIME types', () => {
      expect(ALLOWED_CV_MIME_TYPES).toContain('application/pdf');
      expect(ALLOWED_CV_MIME_TYPES).toContain('application/msword');
      expect(ALLOWED_CV_MIME_TYPES).toContain(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      );
      // Image MIME types must be rejected
      expect(ALLOWED_CV_MIME_TYPES.includes('image/png')).toBe(false);
      expect(ALLOWED_CV_MIME_TYPES.includes('image/jpeg')).toBe(false);
    });

    it('sets maximum CV file size limit to exactly 10MB', () => {
      expect(MAX_CV_FILE_SIZE_BYTES).toBe(10 * 1024 * 1024);
    });
  });

  describe('Expertise Options (Multi-select Tags/Chips)', () => {
    it('aligns with platform course categories', () => {
      expect(INSTRUCTOR_EXPERTISE_OPTIONS.length).toBe(7);
      expect(INSTRUCTOR_EXPERTISE_OPTIONS).toContain('Công nghệ Thông tin & Lập trình');
      expect(INSTRUCTOR_EXPERTISE_OPTIONS).toContain('AI & Khoa học Dữ liệu');
      expect(INSTRUCTOR_EXPERTISE_OPTIONS).toContain('Thiết kế UI/UX & Đồ họa');
      expect(INSTRUCTOR_EXPERTISE_OPTIONS).toContain('Dựng Video & Đa phương tiện');
      expect(INSTRUCTOR_EXPERTISE_OPTIONS).toContain('Kinh doanh & Marketing số');
      expect(INSTRUCTOR_EXPERTISE_OPTIONS).toContain('Tài chính & Đầu tư');
      expect(INSTRUCTOR_EXPERTISE_OPTIONS).toContain('Ngoại ngữ & Kỹ năng mềm');
    });
  });

  describe('Instructor Terms and Conditions', () => {
    it('contains exactly 3 concise, mock terms tailored for Mindly instructors', () => {
      expect(INSTRUCTOR_TERMS_MOCK).toHaveLength(3);
      INSTRUCTOR_TERMS_MOCK.forEach((term) => {
        expect(typeof term).toBe('string');
        expect(term.length).toBeGreaterThan(30);
      });
      // Verifies copyright / ownership clause
      expect(INSTRUCTOR_TERMS_MOCK[0]).toMatch(/bản quyền|quyền hợp pháp/i);
      // Verifies quality / syllabus standards clause
      expect(INSTRUCTOR_TERMS_MOCK[1]).toMatch(/chất lượng sư phạm|xét duyệt/i);
      // Verifies transparency / security clause
      expect(INSTRUCTOR_TERMS_MOCK[2]).toMatch(/bảo mật|doanh thu|thỏa thuận/i);
    });
  });
});
