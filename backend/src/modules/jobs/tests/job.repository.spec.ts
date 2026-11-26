import { model, Types } from 'mongoose';
import { describe, expect, it, vi } from 'vitest';
import { JobTypeEnum } from 'share-lib';
import { JobRepository } from '../repositories/job.repository.js';
import { Job, JobSchema } from '../schemas/job.schema.js';

const jobModel = model<Job>('JobRepositoryFixture', JobSchema);

describe('JobRepository.claimJobAtomic', () => {
  it('returns string IDs for MongoDB ObjectId references in a claimed job', async () => {
    const lessonId = new Types.ObjectId();
    const courseId = new Types.ObjectId();
    const retryOfJobId = new Types.ObjectId();
    const doc = jobModel.hydrate({
      _id: new Types.ObjectId(),
      type: JobTypeEnum.TRANSCRIPTION,
      lessonId,
      courseId,
      retryOfJobId,
    });
    const claim = vi.spyOn(jobModel, 'findOneAndUpdate').mockReturnValueOnce({
      exec: vi.fn().mockResolvedValue(doc),
    } as ReturnType<typeof jobModel.findOneAndUpdate>);

    try {
      const job = await new JobRepository(jobModel).claimJobAtomic(
        doc.id, 1, 'worker-1', 'lease-1', 120000,
      );

      expect(job).toMatchObject({
        id: doc.id,
        lessonId: lessonId.toHexString(),
        courseId: courseId.toHexString(),
        retryOfJobId: retryOfJobId.toHexString(),
      });
    } finally {
      claim.mockRestore();
    }
  });
});

describe('JobSchema', () => {
  it('does not default a missing idempotency key to null', () => {
    expect(new jobModel().toObject()).not.toHaveProperty('idempotencyKey');
  });
});
