'use client';

import { useQuery, type QueryClient } from '@tanstack/react-query';
import { LearningStatusEnum, type IApiResponse, type ILessonCompletion, type ILessonCompletionSummary, type ISubmitLessonQuizAnswer, type ICompleteLessonVideo, type IStudentLessonQuiz } from 'share-lib';
import { apiClient } from '@/lib/api-client';

export const lessonCompletionKeys = {
  course: (userId: string, courseId: string) => ['lesson-completion', userId, courseId] as const,
  lesson: (userId: string, courseId: string, lessonId: string) => [...lessonCompletionKeys.course(userId, courseId), lessonId] as const,
  preview: (lessonId: string) => ['lesson-quiz-preview', lessonId] as const,
};

const path = (courseId: string, lessonId: string) => `/learning-progress/courses/${courseId}/lessons/${lessonId}`;

export const lessonCompletionApi = {
  async getLesson(courseId: string, lessonId: string, signal?: AbortSignal): Promise<ILessonCompletion> {
    return (await apiClient.get<IApiResponse<ILessonCompletion>>(path(courseId, lessonId), { signal })).data.data;
  },
  async getLessons(courseId: string, signal?: AbortSignal): Promise<ILessonCompletionSummary[]> {
    return (await apiClient.get<IApiResponse<ILessonCompletionSummary[]>>(`/learning-progress/courses/${courseId}/lessons`, { signal })).data.data;
  },
  async submit(courseId: string, lessonId: string, payload: ISubmitLessonQuizAnswer): Promise<ILessonCompletion> {
    return (await apiClient.post<IApiResponse<ILessonCompletion>>(`${path(courseId, lessonId)}/quiz-answers`, payload)).data.data;
  },
  async videoEnded(courseId: string, lessonId: string, payload: ICompleteLessonVideo): Promise<ILessonCompletion> {
    return (await apiClient.post<IApiResponse<ILessonCompletion>>(`${path(courseId, lessonId)}/video-ended`, payload)).data.data;
  },
};

/** A late read can never erase a server-confirmed answer for the same requirements. */
export function mergeLessonCompletion(previous: ILessonCompletion | undefined, incoming: ILessonCompletion): ILessonCompletion {
  if (!previous || previous.quizzesVersion !== incoming.quizzesVersion || previous.mediaVersion !== incoming.mediaVersion) return incoming;
  const previousQuizzes = new Map(previous.quizzes.map((quiz) => [quiz.id, quiz]));
  let restored = previous.videoEnded && !incoming.videoEnded;
  const quizzes = incoming.quizzes.map((quiz) => {
    const old = previousQuizzes.get(quiz.id);
    if (quiz.answer || !old?.answer || old.revision !== quiz.revision) return quiz;
    restored = true;
    return { ...quiz, answer: old.answer, explanation: old.explanation };
  });
  if (!restored) return incoming;
  const completedQuestions = quizzes.filter((quiz) => quiz.answer).length;
  const videoEnded = previous.videoEnded || incoming.videoEnded;
  const complete = quizzes.length > 0 ? completedQuestions === quizzes.length : videoEnded;
  return { ...incoming, quizzes, completedQuestions, videoEnded,
    status: complete ? LearningStatusEnum.COMPLETED : completedQuestions > 0 || videoEnded ? LearningStatusEnum.IN_PROGRESS : incoming.status };
}

export function cacheLessonCompletion(client: QueryClient, userId: string, incoming: ILessonCompletion): ILessonCompletion {
  const key = lessonCompletionKeys.lesson(userId, incoming.courseId, incoming.lessonId);
  const state = mergeLessonCompletion(client.getQueryData<ILessonCompletion>(key), incoming);
  client.setQueryData(key, state);
  client.setQueryData<ILessonCompletionSummary[]>(lessonCompletionKeys.course(userId, state.courseId),
    (old) => old?.map((item) => item.lessonId === state.lessonId ? {
      lessonId: state.lessonId, status: state.status,
      completedQuestions: state.completedQuestions, totalQuestions: state.totalQuestions,
    } : item));
  void client.invalidateQueries({ queryKey: lessonCompletionKeys.course(userId, state.courseId), exact: true });
  return state;
}

export function useLessonCompletionQuery(userId: string | undefined, courseId: string, lessonId: string, enabled: boolean) {
  return useQuery({
    queryKey: lessonCompletionKeys.lesson(userId ?? '', courseId, lessonId),
    queryFn: ({ signal }) => lessonCompletionApi.getLesson(courseId, lessonId, signal),
    enabled: enabled && Boolean(userId), retry: 1, staleTime: 0,
    structuralSharing: (previous, incoming) => mergeLessonCompletion(previous as ILessonCompletion | undefined, incoming as ILessonCompletion),
    refetchInterval: 15_000, refetchOnWindowFocus: 'always', refetchOnReconnect: 'always',
  });
}

export function useLessonCompletionListQuery(userId: string | undefined, courseId: string, enabled: boolean) {
  return useQuery({
    queryKey: lessonCompletionKeys.course(userId ?? '', courseId),
    queryFn: ({ signal }) => lessonCompletionApi.getLessons(courseId, signal),
    enabled: enabled && Boolean(userId), retry: 1, staleTime: 0,
    refetchInterval: 15_000, refetchOnWindowFocus: 'always', refetchOnReconnect: 'always',
  });
}

export function useStudentQuizPreviewQuery(lessonId: string, enabled: boolean) {
  return useQuery({
    queryKey: lessonCompletionKeys.preview(lessonId),
    queryFn: async ({ signal }) => (await apiClient.get<IApiResponse<IStudentLessonQuiz[]>>(`/lessons/${lessonId}/quizzes`, { signal })).data.data,
    enabled, retry: 1, staleTime: 0,
  });
}
