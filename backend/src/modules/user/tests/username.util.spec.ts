import { describe, expect, it, vi } from 'vitest';
import {
  buildUsernameBase,
  buildUsernameWithSuffix,
  generateUsername,
  isUsernameDuplicateKeyError,
  USERNAME_PATTERN,
} from '../utils/username.util.js';

describe('email-derived usernames', () => {
  it.each([
    ['a@gmail.com', 'a'],
    [' Nguyen.Van.A@gmail.com ', 'nguyen.van.a'],
    ['a+tag@gmail.com', 'a'],
    ['student1@thc.edu.vn', 'student1'],
    ['nguyễn-đức@example.com', 'nguyen-duc'],
    ['a!b@example.com', 'a-b'],
    ['._-a..b__@example.com', 'a-b'],
    ['', 'user'],
    ['!!!@example.com', 'user'],
    [`${'a'.repeat(40)}@example.com`, 'a'.repeat(30)],
    [`${'a'.repeat(29)}.b@example.com`, 'a'.repeat(29)],
  ])('normalizes %s to %s', (email, expected) => {
    const result = buildUsernameBase(email);
    expect(result).toBe(expected);
    expect(result).toMatch(USERNAME_PATTERN);
  });

  it('keeps collision suffixes within the limit', () => {
    expect(buildUsernameWithSuffix('a'.repeat(30), 123)).toBe(`${'a'.repeat(27)}123`);
    expect(buildUsernameWithSuffix(`${'a'.repeat(28)}.b`, 2)).toBe(`${'a'.repeat(28)}2`);
  });

  it('allocates sequential unique handles for same-prefix emails and plus aliases', async () => {
    const used = new Set<string>();
    const results = [];
    for (const email of ['a@gmail.com', 'a@school.edu', 'a+tag@gmail.com', 'a2@example.com']) {
      const username = await generateUsername(email, async (candidate) => used.has(candidate));
      results.push(username);
      used.add(username);
    }
    expect(results).toEqual(['a', 'a2', 'a3', 'a22']);
  });

  it('bounds allocation attempts', async () => {
    const taken = vi.fn().mockResolvedValue(true);
    await expect(generateUsername('a@gmail.com', taken)).rejects.toThrow('duy nhất');
    expect(taken).toHaveBeenCalledTimes(10000);
  });

  it('only identifies username index collisions', () => {
    expect(isUsernameDuplicateKeyError({ code: 11000, keyPattern: { username: 1 } })).toBe(true);
    expect(isUsernameDuplicateKeyError({ code: 11000, keyPattern: { email: 1 } })).toBe(false);
    expect(isUsernameDuplicateKeyError(new Error('unavailable'))).toBe(false);
    expect(isUsernameDuplicateKeyError(null)).toBe(false);
  });
});
