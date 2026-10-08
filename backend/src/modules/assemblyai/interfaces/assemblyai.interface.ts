import type { Transcript } from 'assemblyai';

export interface TranscribedSentence {
  text: string;
  start: number;
  end: number;
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
  sentences: TranscribedSentence[];
  durationSeconds: number;
  languageCode: string;
}

export interface IAssemblyAiService {
  transcribe(
    audioUrl: string,
    options?: Partial<AssemblyAiTranscribeOptions>,
  ): Promise<AssemblyAiTranscriptionResult>;
  transcribeStream(
    audioStream: NodeJS.ReadableStream | ReadableStream,
    options?: Partial<AssemblyAiTranscribeOptions>,
  ): Promise<AssemblyAiTranscriptionResult>;
  getSubtitles(transcriptId: string, format?: 'srt' | 'vtt'): Promise<string>;
  getTranscript(transcriptId: string): Promise<Transcript>;
}
