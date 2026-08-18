import { LEARNING_LANGUAGE_TAGS, LearningLanguage } from '@/domain/types';
import { SpeechRecognitionAdapter, SttErrorCode, SttListeners } from './types';

/**
 * Web Speech API 기반 STT (Chrome/Edge/Safari 일부 버전 지원).
 * 브라우저 내장 기능이므로 비용이 들지 않는다.
 */

type WebSpeechRecognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((event: WebSpeechResultEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

interface WebSpeechResultEvent {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string; confidence?: number };
    length: number;
  }>;
}

function getRecognitionCtor(): (new () => WebSpeechRecognition) | null {
  if (typeof globalThis === 'undefined') return null;
  const g = globalThis as Record<string, unknown>;
  return (g.SpeechRecognition ?? g.webkitSpeechRecognition ?? null) as
    | (new () => WebSpeechRecognition)
    | null;
}

function mapError(error: string): SttErrorCode {
  switch (error) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'permission-denied';
    case 'network':
      return 'network';
    case 'no-speech':
      return 'no-speech';
    case 'aborted':
      return 'aborted';
    default:
      return 'unknown';
  }
}

export class WebSpeechAdapter implements SpeechRecognitionAdapter {
  private recognition: WebSpeechRecognition | null = null;

  isSupported(): boolean {
    return getRecognitionCtor() !== null;
  }

  start(language: LearningLanguage, listeners: SttListeners): void {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      listeners.onError('not-supported');
      listeners.onEnd();
      return;
    }
    this.abort();
    const rec = new Ctor();
    this.recognition = rec;
    rec.lang = LEARNING_LANGUAGE_TAGS[language];
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;

    rec.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const alt = result[0];
        listeners.onResult({
          text: alt.transcript,
          isFinal: result.isFinal,
          // confidence는 브라우저가 실제로 제공할 때만 전달
          confidence: typeof alt.confidence === 'number' ? alt.confidence : undefined,
        });
      }
    };
    rec.onerror = (event) => listeners.onError(mapError(event.error));
    rec.onend = () => {
      this.recognition = null;
      listeners.onEnd();
    };
    try {
      rec.start();
    } catch {
      listeners.onError('unknown');
      listeners.onEnd();
    }
  }

  stop(): void {
    this.recognition?.stop();
  }

  abort(): void {
    this.recognition?.abort();
    this.recognition = null;
  }
}
