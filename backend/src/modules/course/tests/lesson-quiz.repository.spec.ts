import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Model, Types, type ClientSession } from 'mongoose';
import { QuizQuestionTypeEnum } from 'share-lib';
import { LessonQuizRepository } from '../repositories/lesson-quiz.repository.js';
import type { LessonQuizEntity } from '../schemas/lesson-quiz.schema.js';

function queryChain<T>(result: T) {
  const exec = vi.fn().mockResolvedValue(result);
  const session = vi.fn().mockReturnValue({ exec });
  return { session, exec };
}

describe('LessonQuizRepository hard deletion', () => {
  const lessonId = '607f1f77bcf86cd799439011';
  const quizId = '607f1f77bcf86cd799439012';
  let repository: LessonQuizRepository;
  let mockModel: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    mockModel = {
      deleteOne: vi.fn(),
      deleteMany: vi.fn(),
      insertMany: vi.fn(),
    };
    repository = new LessonQuizRepository(
      mockModel as unknown as Model<LessonQuizEntity>,
    );
  });

  it('removes a single active quiz document from the collection', async () => {
    const chain = queryChain({ deletedCount: 1 });
    mockModel.deleteOne.mockReturnValue(chain);

    const deleted = await repository.hardDelete(quizId);

    expect(deleted).toBe(true);
    expect(mockModel.deleteOne).toHaveBeenCalledWith({
      _id: quizId,
      deletedAt: null,
    });
    expect(chain.session).toHaveBeenCalledWith(null);
  });

  it('reports false when the quiz no longer exists', async () => {
    const chain = queryChain({ deletedCount: 0 });
    mockModel.deleteOne.mockReturnValue(chain);

    await expect(repository.hardDelete(quizId)).resolves.toBe(false);
  });

  it('hard-deletes every active quiz in the timestamp cluster', async () => {
    const chain = queryChain({ deletedCount: 3 });
    mockModel.deleteMany.mockReturnValue(chain);

    const deleted = await repository.deleteQuizzesAtTimestampRange(lessonId, 45);

    expect(deleted).toBe(3);
    expect(mockModel.deleteMany).toHaveBeenCalledWith({
      lessonId: new Types.ObjectId(lessonId),
      timestamp: { $gte: 43, $lte: 47 },
      deletedAt: null,
    });
    expect(chain.session).toHaveBeenCalledWith(null);
  });

  it('hard-deletes the previous question list before inserting replacement quizzes', async () => {
    const deleteChain = queryChain({ deletedCount: 2 });
    mockModel.deleteMany.mockReturnValue(deleteChain);
    const inserted = [
      {
        _id: new Types.ObjectId(quizId),
        lessonId: new Types.ObjectId(lessonId),
        timestamp: null,
        order: 1,
        question: 'Câu hỏi mới',
        questionType: QuizQuestionTypeEnum.SINGLE,
        options: [],
        explanation: null,
      },
    ];
    mockModel.insertMany.mockResolvedValue(inserted);
    const session = {} as ClientSession;

    const result = await repository.replaceAllQuizzesForLesson(
      lessonId,
      [
        {
          timestamp: null,
          order: 1,
          question: 'Câu hỏi mới',
          questionType: QuizQuestionTypeEnum.SINGLE,
          options: [],
          explanation: null,
        },
      ],
      session,
    );

    expect(mockModel.deleteMany).toHaveBeenCalledWith({
      lessonId: new Types.ObjectId(lessonId),
      deletedAt: null,
    });
    expect(mockModel.insertMany).toHaveBeenCalledOnce();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(quizId);
  });
});
