import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AUTH_CONSTANTS } from 'share-lib';
import { forgotPasswordSchema } from '../schemas/forgot-password.schema';
import { resetPasswordSchema } from '../schemas/reset-password.schema';

describe('Password Reset Feature - Unit Tests', () => {
  describe('Forgot Password Schema', () => {
    it('1. should accept a valid email and trim surrounding whitespace', () => {
      const result = forgotPasswordSchema.safeParse({
        email: '  sinhvien@university.edu.vn  ',
      });

      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.email, 'sinhvien@university.edu.vn');
      }
    });

    it('2. should reject an empty email', () => {
      const result = forgotPasswordSchema.safeParse({ email: '   ' });

      assert.equal(result.success, false);
      if (!result.success) {
        assert.ok(
          result.error.issues.some((issue) => issue.path.includes('email')),
          'Must flag the empty email field',
        );
      }
    });

    it('3. should reject an invalid email format', () => {
      const result = forgotPasswordSchema.safeParse({
        email: 'not-an-email',
      });

      assert.equal(result.success, false);
      if (!result.success) {
        assert.ok(
          result.error.issues.some((issue) => issue.path.includes('email')),
          'Must flag the invalid email field',
        );
      }
    });
  });

  describe('Reset Password Schema', () => {
    it('4. should accept matching passwords and trim whitespace', () => {
      const result = resetPasswordSchema.safeParse({
        password: '  newPassword123  ',
        confirmPassword: '  newPassword123  ',
      });

      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.password, 'newPassword123');
        assert.equal(result.data.confirmPassword, 'newPassword123');
      }
    });

    it('5. should reject a password shorter than 6 characters', () => {
      const result = resetPasswordSchema.safeParse({
        password: '12345',
        confirmPassword: '12345',
      });

      assert.equal(result.success, false);
      if (!result.success) {
        assert.ok(
          result.error.issues.some((issue) => issue.path.includes('password')),
          'Must flag the short password',
        );
      }
    });

    it('6. should reject a confirmation that does not match', () => {
      const result = resetPasswordSchema.safeParse({
        password: 'newPassword123',
        confirmPassword: 'differentPassword123',
      });

      assert.equal(result.success, false);
      if (!result.success) {
        assert.ok(
          result.error.issues.some((issue) =>
            issue.path.includes('confirmPassword'),
          ),
          'Must flag the mismatched confirmation',
        );
      }
    });
  });

  describe('Anti-enumeration message contract', () => {
    it('7. should keep the exact generic message required by the specification', () => {
      assert.equal(
        AUTH_CONSTANTS.PASSWORD_RESET_GENERIC_MESSAGE,
        'Nếu email đã được đăng ký, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu.',
      );
    });
  });
});
