import { describe, expect, it } from 'vitest';
import { authPathWithReturn, getAuthReturnPath } from '../utils/auth-return-path';

describe('instructor sign-in return destination', () => {
  it('returns to the instructor entry, including its registration section', () => {
    expect(getAuthReturnPath('/become-instructor')).toBe('/become-instructor');
    expect(getAuthReturnPath('/become-instructor#registration')).toBe('/become-instructor#registration');
  });

  it.each([
    'https://example.com', '//example.com', '/\\example.com', 'javascript:alert(1)',
    '/admin/dashboard', '/become-instructor/../admin', '/become-instructor?preview=pending',
    '/become-instructor#registration\n', null, undefined,
  ])('rejects unrelated or malformed destinations: %s', (value) => {
    expect(getAuthReturnPath(value)).toBeNull();
  });

  it('preserves the hash across switching between login and registration', () => {
    for (const path of ['/login', '/register'] as const) {
      const href = authPathWithReturn(path, '/become-instructor#registration');
      const url = new URL(href, 'https://mindly.test');
      expect(url.pathname).toBe(path);
      expect(url.hash).toBe('');
      expect(url.searchParams.get('next')).toBe('/become-instructor#registration');
    }
    expect(authPathWithReturn('/login', '//example.com')).toBe('/login');
  });
});
