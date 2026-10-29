import { describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { SessionSchema } from '../schemas/session.schema.js';

describe('SessionSchema', () => {
  it('defines userId as an ObjectId path (not Mixed)', () => {
    // Regression guard for Mongoose 9: `Types.ObjectId` is the BSON class,
    // while `Schema.Types.ObjectId` is the actual schema type. Using the
    // former made userId a Mixed path and persisted it as a string.
    expect(SessionSchema.path('userId').instance).toBe('ObjectId');
  });

  it('casts a string userId to ObjectId when creating a session document', () => {
    const modelName = 'SessionSchemaCastTest';
    const TestModel =
      mongoose.models[modelName] ?? mongoose.model(modelName, SessionSchema);
    const userId = new mongoose.Types.ObjectId().toString();

    const doc = new TestModel({
      userId,
      refreshTokenHash: 'test_hash',
      expiresAt: new Date(Date.now() + 60_000),
    });

    expect(doc.userId).toBeInstanceOf(mongoose.Types.ObjectId);
    expect(doc.userId.toString()).toBe(userId);
  });
});
