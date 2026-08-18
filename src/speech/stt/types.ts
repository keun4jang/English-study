import { LearningLanguage } from '@/domain/types';

/**
 * SpeechRecognitionAdapter — 플랫폼별 음성 인식 추상화.
 * - Web: Web Speech API (지원 브라우저)
 * - Native(Expo Go): 미지원 → 텍스트 입력 fallback 안내
 * - Development Build: 추후 네이티브 STT 모듈 연결 지점
 *
 * 주의: confidence가 제공되지 않는 플랫폼에서 가짜 confidence를 만들지 않는다.
 */

export type SttErrorCode =
  | 'not-supported'
  | 'permission-denied'
  | 'network'
  | 'no-speech'
  | 'too-short'
  | 'aborted'
  | 'unknown';

export interface SttResult {
  text: string;
  isFinal: boolean;
  /** 플랫폼이 제공하는 경우에만 존재 (0~1). 제공되지 않으면 undefined. */
  confidence?: number;
}

export interface SttListeners {
  onResult: (result: SttResult) => void;
  onError: (code: SttErrorCode) => void;
  onEnd: () => void;
}

export interface SpeechRecognitionAdapter {
  /** 이 플랫폼에서 음성 인식이 가능한지 */
  isSupported(): boolean;
  start(language: LearningLanguage, listeners: SttListeners): void;
  stop(): void;
  abort(): void;
}
