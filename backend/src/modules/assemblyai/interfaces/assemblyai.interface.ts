import type { Transcript } from 'assemblyai';

export interface TranscribedWord {
  word: string;
  start: number;
  end: number;
  confidence: number;
}

export interface AssemblyAiTranscribeOptions {
  audioUrl: string;
  languageCode?: string;
  punctuate?: boolean;
  formatText?: boolean;
  speakerLabels?: boolean;
}

export interface AssemblyAiTranscriptionResult {
  transcriptId: string;
  rawTranscript: string;
  words: TranscribedWord[];
  durationSeconds: number;
  languageCode: string;
  confidence?: number;
}

export interface IAssemblyAiService {
  transcribe(
    audioUrl: string,
    options?: Partial<AssemblyAiTranscribeOptions>,
  ): Promise<AssemblyAiTranscriptionResult>;
  getSubtitles(transcriptId: string, format?: 'srt' | 'vtt'): Promise<string>;
  getTranscript(transcriptId: string): Promise<Transcript>;
}
