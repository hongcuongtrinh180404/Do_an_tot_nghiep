import { afterAll, describe, expect, it } from 'vitest';
import { createConnection, Types } from 'mongoose';
import { ReviewEntity, ReviewSchema } from '../schemas/review.schema.js';

describe('Review instructor reply schema', () => {
  // Schema validation needs no database and must work for old reviews without a reply.
  const connection = createConnection();
  const model = connection.model(ReviewEntity.name, ReviewSchema);
  const fields = {
    userId: new Types.ObjectId(),
    courseId: new Types.ObjectId(),
    rating: 5,
  };
  const reply = {
    content: '  Cảm ơn bạn đã góp ý.  ',
    instructorId: new Types.ObjectId(),
    instructorName: 'Giảng viên',
  };

  afterAll(async () => { await connection.close(); });

  it('defaults to no reply for existing reviews', async () => {
    const review = new model(fields);
    await expect(review.validate()).resolves.toBeUndefined();
    expect(review.instructorReply).toBeNull();
  });

  it('stores a trimmed nested reply with its own timestamps and no nested ID', async () => {
    const review = new model({ ...fields, instructorReply: reply });
    await expect(review.validate()).resolves.toBeUndefined();
    expect(review.toObject().instructorReply).toEqual({
      content: 'Cảm ơn bạn đã góp ý.',
      instructorId: reply.instructorId,
      instructorName: reply.instructorName,
      repliedAt: expect.any(Date),
      updatedAt: null,
    });
  });

  it.each(['', '   ', 'x'.repeat(2001)])('rejects empty or oversized reply content (%#)', async (content) => {
    const review = new model({ ...fields, instructorReply: { ...reply, content } });
    await expect(review.validate()).rejects.toMatchObject({
      errors: { 'instructorReply.content': expect.any(Object) },
    });
  });

  it('requires the replying instructor ID', async () => {
    const review = new model({ ...fields, instructorReply: { content: 'Cảm ơn bạn' } });
    await expect(review.validate()).rejects.toMatchObject({
      errors: { 'instructorReply.instructorId': expect.any(Object) },
    });
  });
});
