import { ConflictException, UnprocessableEntityException } from '@nestjs/common';
import type { ClientSession } from 'mongoose';
import { JobTypeEnum, LessonTranscriptionStatusEnum, type IJob } from 'share-lib';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BundleAnalysisService } from '../services/bundle-analysis.service.js';
import { QuizGenerationService } from '../services/quiz-generation.service.js';
import { SummaryGenerationService } from '../services/summary-generation.service.js';

describe('BundleAnalysisService', () => {
  const job = {
    type: JobTypeEnum.ANALYSIS_BUNDLE, lessonId: 'lesson-1', courseId: 'course-1',
    requestedById: 'instructor-1', inputRevision: 3,
  } as IJob;
  const lesson = {
    title: 'Định luật Ohm',
    transcriptionStatus: LessonTranscriptionStatusEnum.READY,
    analysisInputRevision: 3,
    analysisOutputRevisions: { summary: 0, mindmap: 0, quiz: 0 },
  };
  const sentence = 'Hiệu điện thế bằng tích của điện trở và cường độ dòng điện.';
  const transcript = {
    status: LessonTranscriptionStatusEnum.READY,
    durationSeconds: 60,
    rawTranscript: sentence,
    sentences: [{ text: sentence, start: 10000, end: 18000 }],
  };
  const aiOutput = {
    summary: {
      title: 'Định luật Ohm',
      overview: 'Bài học giải thích mối liên hệ giữa ba đại lượng điện.',
      keyPoints: [{ title: 'Công thức', content: 'U = R × I.', timestamp: 10 }],
    },
    mindmap: {
      root: {
        id: 'root', title: lesson.title, timestamp: 0,
        children: [{ id: 'formula', title: 'Công thức U = R × I', timestamp: 10 }],
      },
    },
    quizzes: [{
      order: 1, question: 'Điện áp tính bằng công thức nào?', questionType: 'single',
      explanationTimestamp: 10, explanation: 'Theo định luật Ohm, U = R × I.',
      options: ['A', 'B', 'C', 'D'].map((label, index) => ({
        id: `opt-${label}`, label, text: ['R × I', 'R / I', 'I / R', 'R + I'][index],
        isCorrect: index === 0,
      })),
    }],
  };
  const session = {} as ClientSession;
  const generateJson = vi.fn();
  const verifyAutomaticAnalysis = vi.fn();
  const findTranscript = vi.fn();
  const findSummary = vi.fn();
  const findMindmap = vi.fn();
  const findQuiz = vi.fn();
  const findQuizDraft = vi.fn();
  const saveSummary = vi.fn();
  const saveMindmap = vi.fn();
  const saveQuiz = vi.fn();
  let service: BundleAnalysisService;

  beforeEach(() => {
    vi.resetAllMocks();
    generateJson.mockResolvedValue({ data: aiOutput });
    verifyAutomaticAnalysis.mockResolvedValue(lesson);
    findTranscript.mockResolvedValue(transcript);
    findSummary.mockResolvedValue(null);
    findMindmap.mockResolvedValue(null);
    findQuiz.mockResolvedValue([]);
    findQuizDraft.mockResolvedValue(null);
    const deps = [
      { generateJson }, { verifyAutomaticAnalysis }, { findByLessonId: findTranscript },
      { findByLessonId: findSummary }, { findByLessonId: findMindmap },
      { findByLessonId: findQuiz }, { findByLessonId: findQuizDraft },
      {
        formatTranscriptWithTimestamps: SummaryGenerationService.prototype.formatTranscriptWithTimestamps,
        persistSummaryWithSession: saveSummary,
      },
      { persistMindmapWithSession: saveMindmap },
      {
        sanitizeAndNormalizeQuizzes: QuizGenerationService.prototype.sanitizeAndNormalizeQuizzes,
        persistQuizWithSession: saveQuiz,
      },
    ] as unknown as ConstructorParameters<typeof BundleAnalysisService>;
    service = new BundleAnalysisService(...deps);
  });

  it('sends the transcript only once and saves all three outputs from one response', async () => {
    const generated = await service.generate(job);
    const result = await service.persist(job, generated, session);
    const options = { userId: job.requestedById, session };

    expect(generateJson).toHaveBeenCalledTimes(1);
    const prompt = generateJson.mock.calls[0][0] as string;
    expect(prompt.split(sentence)).toHaveLength(2);
    expect(prompt).toContain('[00:10 - 10s]');
    expect(result).toEqual({ saved: ['summary', 'mindmap', 'quiz'], quizCount: 1 });
    expect(saveSummary).toHaveBeenCalledWith(job.lessonId, aiOutput.summary, options);
    expect(saveMindmap).toHaveBeenCalledWith(job.lessonId, aiOutput.mindmap, options);
    expect(saveQuiz).toHaveBeenCalledWith(job.lessonId, [
      expect.objectContaining({ timestamp: null, explanationTimestamp: 10 }),
    ], options);
  });

  it('does not call AI when every output is already saved or drafted', async () => {
    findSummary.mockResolvedValue({ draftSummary: {} });
    findMindmap.mockResolvedValue({ mindmap: {} });
    findQuizDraft.mockResolvedValue({ quizzes: [] });

    const result = await service.persist(job, await service.generate(job), session);

    expect(generateJson).not.toHaveBeenCalled();
    expect(result.saved).toEqual([]);
  });

  it('preserves content saved during generation and accepts an empty quiz array', async () => {
    generateJson.mockResolvedValue({ data: { ...aiOutput, quizzes: [] } });
    const bundle = await service.generate(job);
    findSummary.mockResolvedValue({ summary: {} });
    verifyAutomaticAnalysis.mockResolvedValue({
      ...lesson, analysisOutputRevisions: { ...lesson.analysisOutputRevisions, mindmap: 1 },
    });

    expect(await service.persist(job, bundle, session)).toEqual({ saved: [], quizCount: 0 });
    expect(saveSummary).not.toHaveBeenCalled();
    expect(saveMindmap).not.toHaveBeenCalled();
    expect(saveQuiz).not.toHaveBeenCalled();
  });

  it('rejects superseded input before requesting AI and before publishing', async () => {
    const bundle = await service.generate(job);
    verifyAutomaticAnalysis.mockResolvedValue({ ...lesson, analysisInputRevision: 4 });

    await expect(service.generate(job)).rejects.toBeInstanceOf(ConflictException);
    await expect(service.persist(job, bundle, session)).rejects.toBeInstanceOf(ConflictException);
    expect(generateJson).toHaveBeenCalledTimes(1);
    expect(saveSummary).not.toHaveBeenCalled();
  });

  it('rejects missing quiz data rather than silently treating it as an empty result', async () => {
    generateJson.mockResolvedValue({ data: { ...aiOutput, quizzes: undefined } });
    await expect(service.generate(job)).rejects.toBeInstanceOf(UnprocessableEntityException);
  });
});
