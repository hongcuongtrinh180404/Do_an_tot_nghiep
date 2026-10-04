import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import DOMPurify from 'isomorphic-dompurify';
import { CourseLevelEnum } from 'share-lib';
import { createCourseSchema } from '../schemas/create-course.schema';

describe('Course Rich Text Editor & Sanitization', () => {
  describe('createCourseSchema Description Validation', () => {
    const baseValidCourse = {
      title: 'Khóa học Next.js 16 và NestJS',
      slug: 'khoa-hoc-nextjs-16-va-nestjs',
      price: 199000,
      level: CourseLevelEnum.INTERMEDIATE,
    };

    it('1. should accept valid semantic HTML content in description', () => {
      const htmlContent = '<h2>Giới thiệu</h2><p>Khóa học này gồm <b>3 phần</b> chính.</p>';
      const result = createCourseSchema.safeParse({
        ...baseValidCourse,
        description: htmlContent,
      });

      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.description, htmlContent);
      }
    });

    it('2. should convert empty HTML tags like <p></p> or <p><br></p> to empty string', () => {
      const emptyHtmlCases = [
        '<p></p>',
        '<p><br></p>',
        '<p>   </p>',
        '<p>&nbsp;</p>',
        '<div><p></p></div>',
      ];

      for (const emptyCase of emptyHtmlCases) {
        const result = createCourseSchema.safeParse({
          ...baseValidCourse,
          description: emptyCase,
        });

        assert.equal(result.success, true);
        if (result.success) {
          assert.equal(result.data.description, '');
        }
      }
    });

    it('3. should pass when description is omitted or empty string', () => {
      const resultWithoutDesc = createCourseSchema.safeParse({
        ...baseValidCourse,
      });
      assert.equal(resultWithoutDesc.success, true);

      const resultWithEmptyString = createCourseSchema.safeParse({
        ...baseValidCourse,
        description: '',
      });
      assert.equal(resultWithEmptyString.success, true);
    });
  });

  describe('DOMPurify XSS Sanitization (Stored XSS Protection)', () => {
    it('1. should strip malicious <script> tags from HTML content', () => {
      const maliciousHtml = '<p>Nội dung khóa học</p><script>alert("hacked")</script>';
      const sanitized = DOMPurify.sanitize(maliciousHtml);

      assert.ok(!sanitized.includes('<script>'), 'Script tag must be stripped');
      assert.ok(!sanitized.includes('alert('), 'Script body should not execute');
      assert.ok(sanitized.includes('<p>Nội dung khóa học</p>'));
    });

    it('2. should strip inline javascript event handlers like onerror and onload', () => {
      const maliciousHtml = '<img src="invalid-url" onerror="alert(1)" /><p onmouseover="alert(2)">Text</p>';
      const sanitized = DOMPurify.sanitize(maliciousHtml);

      assert.ok(!sanitized.includes('onerror='), 'onerror handler must be stripped');
      assert.ok(!sanitized.includes('onmouseover='), 'onmouseover handler must be stripped');
    });

    it('3. should neutralize javascript: URI in links', () => {
      const maliciousLink = '<a href="javascript:alert(1)">Bấm vào đây để nhận quà</a>';
      const sanitized = DOMPurify.sanitize(maliciousLink);

      assert.ok(!sanitized.includes('javascript:alert(1)'), 'javascript: URI must be stripped');
    });

    it('4. should preserve legitimate rich text elements and styling', () => {
      const safeRichText = '<h2>Chương 1</h2><h3>Phần 1.1</h3><p>Đoạn văn <b>in đậm</b>, <i>in nghiêng</i></p><ul><li>Ý 1</li><li>Ý 2</li></ul><ol><li>Bước 1</li></ol><code>console.log("hello")</code>';
      const sanitized = DOMPurify.sanitize(safeRichText);

      assert.equal(sanitized, safeRichText);
    });
  });
});
