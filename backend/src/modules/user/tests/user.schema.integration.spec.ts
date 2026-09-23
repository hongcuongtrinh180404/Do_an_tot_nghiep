import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose, { Model } from 'mongoose';
import { RoleEnum, UserStatusEnum } from 'share-lib';
import { UserEntity, UserSchema, UserDocument } from '../schemas/user.schema.js';

describe('UserSchema & MongoDB Partial Unique Indexes (Integration Test)', () => {
  let connection: mongoose.Connection;
  let UserModel: Model<UserEntity>;
  const TEST_DB_URI = 'mongodb://localhost:27017/thc_datn_schema_test';

  beforeAll(async () => {
    connection = await mongoose.createConnection(TEST_DB_URI).asPromise();
    UserModel = connection.model<UserEntity>(UserEntity.name, UserSchema, 'test_users');
    // Ensure all indexes (including partial unique indexes) are built in MongoDB
    await UserModel.syncIndexes();
  });

  afterAll(async () => {
    if (connection) {
      await connection.dropDatabase();
      await connection.close();
    }
  });

  beforeEach(async () => {
    await UserModel.deleteMany({});
  });

  describe('Field Defaults & Schema Validation', () => {
    it('should assign default role "student" and status "active"', async () => {
      const user = await UserModel.create({
        email: 'student@example.com',
        passwordHash: 'secret_hash_123',
        fullName: 'Nguyễn Văn Học',
      });

      expect(user.role).toBe(RoleEnum.STUDENT);
      expect(user.role).toBe('student');
      expect(user.status).toBe(UserStatusEnum.ACTIVE);
      expect(user.status).toBe('active');
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
      expect(user.deletedAt).toBeNull();
    });

    it('should reject document when required fields are missing', async () => {
      // Missing email
      await expect(
        UserModel.create({
          passwordHash: 'hash',
          fullName: 'Test User',
        }),
      ).rejects.toThrow();

      // Missing passwordHash
      await expect(
        UserModel.create({
          email: 'test@example.com',
          fullName: 'Test User',
        }),
      ).rejects.toThrow();

      // Missing fullName
      await expect(
        UserModel.create({
          email: 'test@example.com',
          passwordHash: 'hash',
        }),
      ).rejects.toThrow();
    });

    it('should automatically lowercase email', async () => {
      const user = await UserModel.create({
        email: 'UPPERCASE_EMAIL@EXAMPLE.COM',
        passwordHash: 'hash123',
        fullName: 'John Doe',
      });

      expect(user.email).toBe('uppercase_email@example.com');
    });

    it('should NOT return passwordHash by default (select: false)', async () => {
      await UserModel.create({
        email: 'hidden_pass@example.com',
        passwordHash: 'my_super_secret_hash',
        fullName: 'Secret User',
      });

      const foundWithoutSelect = await UserModel.findOne({ email: 'hidden_pass@example.com' });
      expect(foundWithoutSelect).toBeDefined();
      expect(foundWithoutSelect?.passwordHash).toBeUndefined();

      const foundWithSelect = await UserModel.findOne({ email: 'hidden_pass@example.com' }).select('+passwordHash');
      expect(foundWithSelect).toBeDefined();
      expect(foundWithSelect?.passwordHash).toBe('my_super_secret_hash');
    });
  });

  describe('Partial Unique Index: email', () => {
    it('should reject duplicate email among active users (code 11000)', async () => {
      await UserModel.create({
        email: 'duplicate@example.com',
        passwordHash: 'hash1',
        fullName: 'User 1',
      });

      await expect(
        UserModel.create({
          email: 'duplicate@example.com',
          passwordHash: 'hash2',
          fullName: 'User 2',
        }),
      ).rejects.toThrow(/E11000 duplicate key error/);
    });

    it('should allow re-registering an email if the previous account was soft-deleted', async () => {
      const user1 = await UserModel.create({
        email: 'reuse@example.com',
        passwordHash: 'hash1',
        fullName: 'Original User',
      });

      // Soft delete user1
      user1.deletedAt = new Date();
      await user1.save();

      // Now registering with the exact same email must succeed due to partialFilterExpression
      const user2 = await UserModel.create({
        email: 'reuse@example.com',
        passwordHash: 'hash2',
        fullName: 'New User With Same Email',
      });

      expect(user2).toBeDefined();
      expect(user2.id).not.toBe(user1.id);
      expect(user2.email).toBe('reuse@example.com');
      expect(user2.deletedAt).toBeNull();
    });
  });

  describe('Partial Unique Index: username', () => {
    it('should allow multiple active users with username: null', async () => {
      const user1 = await UserModel.create({
        email: 'user1_null@example.com',
        passwordHash: 'hash1',
        fullName: 'User 1 Null',
        username: null,
      });

      const user2 = await UserModel.create({
        email: 'user2_null@example.com',
        passwordHash: 'hash2',
        fullName: 'User 2 Null',
        username: null,
      });

      expect(user1).toBeDefined();
      expect(user2).toBeDefined();
      expect(user1.username).toBeNull();
      expect(user2.username).toBeNull();
    });

    it('should allow multiple active users with undefined username', async () => {
      const user1 = await UserModel.create({
        email: 'user1_undef@example.com',
        passwordHash: 'hash1',
        fullName: 'User 1 Undefined',
      });

      const user2 = await UserModel.create({
        email: 'user2_undef@example.com',
        passwordHash: 'hash2',
        fullName: 'User 2 Undefined',
      });

      expect(user1).toBeDefined();
      expect(user2).toBeDefined();
    });

    it('should reject duplicate username among active users with string usernames', async () => {
      await UserModel.create({
        email: 'dev1@example.com',
        passwordHash: 'hash1',
        fullName: 'Dev One',
        username: 'coder2026',
      });

      await expect(
        UserModel.create({
          email: 'dev2@example.com',
          passwordHash: 'hash2',
          fullName: 'Dev Two',
          username: 'coder2026',
        }),
      ).rejects.toThrow(/E11000 duplicate key error/);
    });

    it('should allow taking a username if the previous owner was soft-deleted', async () => {
      const dev1 = await UserModel.create({
        email: 'dev1_quit@example.com',
        passwordHash: 'hash1',
        fullName: 'Dev One Quit',
        username: 'masterdev',
      });

      // Soft delete dev1
      dev1.deletedAt = new Date();
      await dev1.save();

      // New user registering with same username 'masterdev'
      const dev2 = await UserModel.create({
        email: 'dev2_new@example.com',
        passwordHash: 'hash2',
        fullName: 'Dev Two New',
        username: 'masterdev',
      });

      expect(dev2).toBeDefined();
      expect(dev2.username).toBe('masterdev');
      expect(dev2.id).not.toBe(dev1.id);
    });
  });
});
