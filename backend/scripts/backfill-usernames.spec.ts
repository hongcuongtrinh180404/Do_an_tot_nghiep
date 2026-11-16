import { describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
import { backfillUsernames, planUsernames } from './backfill-usernames.js';

const user = (index: number, email: string, username: string | null) => ({
  _id: new mongoose.Types.ObjectId(index.toString(16).padStart(24, '0')),
  email, username, createdAt: new Date(index * 1000),
});

describe('username backfill', () => {
  it('regenerates all handles deterministically and resolves collisions', async () => {
    const users = [
      user(3, 'a+tag@gmail.com', 'old'),
      user(2, 'a@school.edu', null),
      user(1, 'a@gmail.com', 'admin'),
    ];
    const result = await planUsernames(users);
    expect(result.map((entry) => entry.nextUsername)).toEqual(['a', 'a2', 'a3']);
    expect(users[0].username).toBe('old');
  });

  it('re-running produces the same mapping, including swapped and temporary old handles', async () => {
    const initial = [user(1, 'a@gmail.com', 'b'), user(2, 'b@gmail.com', 'a')];
    const first = await planUsernames(initial);
    const second = await planUsernames(first.map((entry) => ({ ...entry, username: entry.nextUsername })));
    expect(second.map((entry) => entry.nextUsername)).toEqual(['a', 'b']);
    const resumed = await planUsernames(initial.map((entry) => ({ ...entry, username: '~interrupted' })));
    expect(resumed.map((entry) => entry.nextUsername)).toEqual(['a', 'b']);
  });

  it('does not write on dry run', async () => {
    const collection = {
      find: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([user(1, 'sseu1804@gmail.com', 'admin')]),
      }),
      updateOne: vi.fn(),
    };
    const result = await backfillUsernames(collection as never);
    expect(result).toMatchObject({ dryRun: true, totalUsers: 1, changedUsers: 1, updatedUsers: 0, backupPath: null });
    expect(collection.updateOne).not.toHaveBeenCalled();
    expect(collection.find).toHaveBeenCalledWith({ deletedAt: null }, expect.anything());
  });

  it('does not write when every handle is already correct', async () => {
    const collection = {
      find: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([user(1, 'sseu1804@gmail.com', 'sseu1804')]),
      }),
      updateOne: vi.fn(),
    };
    expect(await backfillUsernames(collection as never, { apply: true })).toMatchObject({ changedUsers: 0 });
    expect(collection.updateOne).not.toHaveBeenCalled();
  });

  it('validates all emails before making changes', async () => {
    await expect(planUsernames([user(1, 'valid@gmail.com', 'old'), user(2, '', null)])).rejects.toThrow('has no email');
  });
});
