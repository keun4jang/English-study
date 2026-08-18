import { LearningLanguage } from '@/domain/types';
import { SpeechRecognitionAdapter, SttListeners } from './types';

/**
 * 음성 인식 미지원 플랫폼용 어댑터 (Expo Go 네이티브 등).
 * UI는 이 어댑터를 만나면 텍스트 입력으로 자연스럽게 fallback한다.
 * Development Build에서 네이티브 STT 모듈을 붙일 때 이 파일 대신 새 어댑터를 등록한다.
 */
export class UnsupportedSttAdapter implements SpeechRecognitionAdapter {
  isSupported(): boolean {
    return false;
  }

  start(_language: LearningLanguage, listeners: SttListeners): void {
    listeners.onError('not-supported');
    listeners.onEnd();
  }

  stop(): void {}
  abort(): void {}
}
