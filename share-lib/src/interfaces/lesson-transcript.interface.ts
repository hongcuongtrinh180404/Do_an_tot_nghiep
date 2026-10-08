import { LessonTranscriptionStatusEnum } from '../enums/lesson-transcription-status.enum.js';

export interface ITranscribedSentence {
  text: string;
  start: number;
  end: number;
}

export interface ILessonTranscript {
  id: string;
  lessonId: string;
  rawTranscript: string;
  sentences: ITranscribedSentence[];
  durationSeconds: number;
  languageCode: string;
  externalTranscriptId?: string | null;
  status: LessonTranscriptionStatusEnum;
  failureReason?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}
