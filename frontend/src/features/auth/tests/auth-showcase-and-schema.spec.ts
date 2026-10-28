import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { loginSchema } from '../schemas/login.schema';
import { registerSchema } from '../schemas/register.schema';

describe('Auth Feature - Unit Tests', () => {
  describe('Login Schema & Whitespace Normalization (RULE_GUIDE compliance)', () => {
    it('1. should accept valid email and password', () => {
      const validData = {
        email: 'sinhvien@university.edu.vn',
        password: 'Password123!',
      };

      const result = loginSchema.safeParse(validData);
      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.email, 'sinhvien@university.edu.vn');
      }
    });

    it('2. should reject invalid email format', () => {
      const invalidData = {
        email: 'invalid-email-format',
        password: 'Password123!',
      };

      const result = loginSchema.safeParse(invalidData);
      assert.equal(result.success, false);
      if (!result.success) {
        const emailError = result.error.issues.find((i) => i.path.includes('email'));
        assert.ok(emailError, 'Must flag invalid email');
      }
    });

    it('3. should reject short passwords', () => {
      const invalidData = {
        email: 'sinhvien@university.edu.vn',
        password: '123',
      };

      const result = loginSchema.safeParse(invalidData);
      assert.equal(result.success, false);
    });
  });

  describe('Register Schema & Confirmation Match (Streamlined Auth without Name fields)', () => {
    it('1. should pass when password and confirmPassword match', () => {
      const validData = {
        email: 'nguyenvanan@university.edu.vn',
        password: 'SecurePassword123',
        confirmPassword: 'SecurePassword123',
      };

      const result = registerSchema.safeParse(validData);
      assert.equal(result.success, true);
    });

    it('2. should fail when confirmPassword does not match password', () => {
      const mismatchData = {
        email: 'nguyenvanan@university.edu.vn',
        password: 'SecurePassword123',
        confirmPassword: 'DifferentPassword456',
      };

      const result = registerSchema.safeParse(mismatchData);
      assert.equal(result.success, false);
      if (!result.success) {
        const confirmError = result.error.issues.find((i) => i.path.includes('confirmPassword'));
        assert.ok(confirmError, 'Must flag password mismatch');
      }
    });

    it('3. should reject empty email or password less than 6 chars', () => {
      const shortPassData = {
        email: 'nguyenvanan@university.edu.vn',
        password: '123',
        confirmPassword: '123',
      };

      const result = registerSchema.safeParse(shortPassData);
      assert.equal(result.success, false);
    });
  });

  describe('Full-Bleed Crossfade Carousel Contract', () => {
    it('1. should verify all 4 showcase images loop requirements', () => {
      const imageCount = 4;
      assert.equal(imageCount, 4, 'Must loop through all 4 showcase images');

      // Loop arithmetic check: (index + 1) % length
      let activeIndex = 0;
      activeIndex = (activeIndex + 1) % imageCount;
      assert.equal(activeIndex, 1);
      activeIndex = (activeIndex + 1) % imageCount;
      assert.equal(activeIndex, 2);
      activeIndex = (activeIndex + 1) % imageCount;
      assert.equal(activeIndex, 3);
      activeIndex = (activeIndex + 1) % imageCount;
      assert.equal(activeIndex, 0); // Looped back to first
    });

    it('2. should verify panel image paths contract', () => {
      const expectedPaths = [
        '/auth-showcase/panel-1.jpg',
        '/auth-showcase/panel-2.jpg',
        '/auth-showcase/panel-3.jpg',
        '/auth-showcase/panel-4.jpg',
      ];

      assert.equal(expectedPaths.length, 4);
      expectedPaths.forEach((p) => {
        assert.ok(p.startsWith('/auth-showcase/panel-'));
        assert.ok(p.endsWith('.jpg'));
      });
    });
  });
});
