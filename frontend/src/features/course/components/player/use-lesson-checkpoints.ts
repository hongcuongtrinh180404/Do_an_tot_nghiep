'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { ILessonQuizAnswer, IStudentLessonQuiz } from 'share-lib';
import { cacheLessonCompletion, lessonCompletionApi, lessonCompletionKeys, useLessonCompletionQuery, useStudentQuizPreviewQuery } from '../../api/lesson-completion.api';
import { useLessonQuizzesQuery } from '../../api/lesson-quiz.api';
import { LessonCheckpointController, type ActiveLessonCheckpoint } from '../../utils/lesson-checkpoint-controller';
import { createInstructorQuizPreviews, gradeInstructorQuizPreview, instructorQuizPreviewRevision } from '../../utils/instructor-quiz-preview';
import type { UseVideoPlayerReturn } from './use-video-player';

const EMPTY_QUIZZES: IStudentLessonQuiz[] = [];

interface Options {
  userId?: string;
  courseId: string;
  lessonId: string;
  player: UseVideoPlayerReturn;
  enabled: boolean;
  enrolled: boolean;
  eligibilityReady: boolean;
  instructorPreview?: boolean;
}

export function useLessonCheckpoints({ userId, courseId, lessonId, player, enabled, enrolled, eligibilityReady, instructorPreview = false }: Options) {
  const client = useQueryClient();
  const enforced = Boolean(!instructorPreview && enrolled && userId);
  const query = useLessonCompletionQuery(userId, courseId, lessonId, enabled && enforced);
  const preview = useStudentQuizPreviewQuery(lessonId, enabled && eligibilityReady && !enforced && !instructorPreview);
  const management = useLessonQuizzesQuery(lessonId, enabled && instructorPreview);
  const [previewAnswers, setPreviewAnswers] = useState(() => new Map<string, ILessonQuizAnswer>());
  const instructorQuizzes = useMemo(
    () => instructorPreview ? createInstructorQuizPreviews(management.data ?? [], previewAnswers, player.duration) : EMPTY_QUIZZES,
    [instructorPreview, management.data, previewAnswers, player.duration],
  );
  const quizzes = instructorPreview ? instructorQuizzes
    : enforced ? query.data?.quizzes ?? EMPTY_QUIZZES : preview.data ?? EMPTY_QUIZZES;
  const quizQuery = instructorPreview ? management : enforced ? query : preview;
  // Management queries may already be fresh in the editor cache; no learner enrollment is needed.
  const ready = eligibilityReady && (instructorPreview
    ? management.isSuccess && !management.isError
    : quizQuery.isSuccess && !quizQuery.isError && quizQuery.isFetchedAfterMount);
  const [active, setActive] = useState<ActiveLessonCheckpoint | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const inFlight = useRef(false);
  const alive = useRef(true);
  const controllerRef = useRef<LessonCheckpointController | null>(null);
  const videoEndHandlerRef = useRef<(positionSeconds: number) => void>(() => undefined);
  const { videoRef, setSeekHandler } = player;

  const saveVideoEnded = useCallback(async function saveVideoEnd(positionSeconds: number) {
    const state = query.data;
    if (!enabled || !enforced || !userId || !state || state.videoEnded) return;
    try {
      await client.cancelQueries({ queryKey: lessonCompletionKeys.lesson(userId, courseId, lessonId) });
      const saved = await lessonCompletionApi.videoEnded(courseId, lessonId, {
        mediaVersion: state.mediaVersion, positionSeconds,
      });
      await client.cancelQueries({ queryKey: lessonCompletionKeys.lesson(userId, courseId, lessonId) });
      cacheLessonCompletion(client, userId, saved);
    } catch {
      if (alive.current) toast.error('Chưa ghi nhận được kết thúc video.', {
        action: { label: 'Thử lại', onClick: () => { void saveVideoEnd(positionSeconds); } },
      });
    }
  }, [enabled, enforced, userId, courseId, lessonId, query.data, client]);

  useEffect(() => { videoEndHandlerRef.current = (position) => { void saveVideoEnded(position); }; }, [saveVideoEnded]);

  useEffect(() => {
    alive.current = true;
    if (!enabled) return;
    const video = videoRef.current;
    if (!video) return;
    const controller = new LessonCheckpointController({
      position: () => video.currentTime,
      duration: () => video.duration,
      paused: () => video.paused,
      seek: (seconds) => { video.currentTime = seconds; },
      pause: () => video.pause(),
      play: () => { void video.play().catch(() => undefined); },
      show: (checkpoint) => { if (alive.current) setActive(checkpoint); },
    });
    controllerRef.current = controller;
    setSeekHandler((seconds) => controller.requestSeek(seconds));
    const timeupdate = () => { if (!video.seeking) controller.timeUpdate(video.currentTime); };
    const play = () => controller.play();
    const seeking = () => controller.seeking(video.currentTime);
    const seeked = () => controller.seeked();
    const ended = () => {
      const endedPosition = video.currentTime;
      controller.ended();
      videoEndHandlerRef.current(endedPosition);
    };
    video.addEventListener('timeupdate', timeupdate);
    video.addEventListener('play', play);
    video.addEventListener('seeking', seeking);
    video.addEventListener('seeked', seeked);
    video.addEventListener('ended', ended);
    return () => {
      alive.current = false;
      controllerRef.current = null;
      setSeekHandler(null);
      video.removeEventListener('timeupdate', timeupdate);
      video.removeEventListener('play', play);
      video.removeEventListener('seeking', seeking);
      video.removeEventListener('seeked', seeked);
      video.removeEventListener('ended', ended);
    };
  }, [enabled, videoRef, setSeekHandler]);

  useEffect(() => {
    if (enabled) controllerRef.current?.setData(quizzes, ready, enforced);
  }, [enabled, quizzes, ready, enforced]);

  const checkAnswer = useCallback(async (quiz: IStudentLessonQuiz, selectedOptionIds: string[]): Promise<IStudentLessonQuiz> => {
    if (!enabled || !ready || !enforced || !userId || selectedOptionIds.length === 0) {
      throw new Error('Chưa thể gửi câu trả lời. Vui lòng tải lại bài học.');
    }
    try {
      const key = lessonCompletionKeys.lesson(userId, courseId, lessonId);
      await client.cancelQueries({ queryKey: key });
      const saved = await lessonCompletionApi.submit(courseId, lessonId, {
        quizId: quiz.id, quizRevision: quiz.revision, selectedOptionIds,
      });
      await client.cancelQueries({ queryKey: key });
      const confirmed = cacheLessonCompletion(client, userId, saved);
      if (alive.current) controllerRef.current?.setData(confirmed.quizzes, true, true);
      const answered = confirmed.quizzes.find((item) => item.id === quiz.id && item.revision === quiz.revision);
      if (!answered?.answer) throw new Error('Câu hỏi đã được cập nhật. Vui lòng trả lời phiên bản mới.');
      return answered;
    } catch (failure) {
      const response = (failure as { response?: { status?: number } }).response;
      if (response?.status === 409 || response?.status === 404) void query.refetch();
      throw failure;
    }
  }, [enabled, ready, enforced, userId, courseId, lessonId, client, query]);

  const submit = useCallback(async (quiz: IStudentLessonQuiz, selectedOptionIds: string[]) => {
    if (!enabled || inFlight.current || selectedOptionIds.length === 0) return;
    if (instructorPreview) {
      if (!ready) return;
      const official = management.data?.find((item) => item.id === quiz.id);
      if (!official || instructorQuizPreviewRevision(official) !== quiz.revision) {
        setError('Câu hỏi đã được cập nhật. Vui lòng trả lời phiên bản mới.');
        return;
      }
      try {
        const answer = gradeInstructorQuizPreview(official, selectedOptionIds);
        setPreviewAnswers((previous) => new Map(previous).set(quiz.id, answer));
        setError('');
      } catch (failure) {
        setError((failure as Error).message);
      }
      return;
    }
    if (!enforced || !userId) return;
    inFlight.current = true;
    setSubmitting(true);
    setError('');
    try {
      await checkAnswer(quiz, selectedOptionIds);
    } catch (failure) {
      if (!alive.current) return;
      const response = (failure as { response?: { status?: number; data?: { message?: string } } }).response;
      setError(response?.data?.message ?? 'Không thể gửi câu trả lời. Vui lòng thử lại.');
    } finally {
      inFlight.current = false;
      if (alive.current) setSubmitting(false);
    }
  }, [enabled, instructorPreview, ready, management.data, enforced, userId, checkAnswer]);

  return {
    active, quizzes, submitting, error, ready, enforced,
    isInstructorPreview: instructorPreview,
    canSubmit: enabled && (instructorPreview || enforced),
    completion: enforced ? query.data : undefined,
    isError: enabled && eligibilityReady && quizQuery.isError,
    retry: () => quizQuery.refetch(),
    submit,
    checkAnswer,
    playExplanation: (timestamp: number) => { setError(''); controllerRef.current?.playFrom(timestamp); },
    close: () => { setError(''); controllerRef.current?.close(); },
    openCheckpoint: (timestamp: number) => { setError(''); controllerRef.current?.openCheckpoint(timestamp); },
  };
}

export type LessonCheckpoints = ReturnType<typeof useLessonCheckpoints>;
