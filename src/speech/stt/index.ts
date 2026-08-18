import { Platform } from 'react-native';

import { SpeechRecognitionAdapter } from './types';
import { UnsupportedSttAdapter } from './unsupportedAdapter';
import { WebSpeechAdapter } from './webAdapter';

let adapter: SpeechRecognitionAdapter | null = null;

export function getSttAdapter(): SpeechRecognitionAdapter {
  if (adapter) return adapter;
  if (Platform.OS === 'web') {
    adapter = new WebSpeechAdapter();
  } else {
    // Expo Go 네이티브: 음성 인식 미지원 → 텍스트 fallback.
    // Development Build에서 네이티브 STT 어댑터를 여기서 교체 등록한다.
    adapter = new UnsupportedSttAdapter();
  }
  return adapter;
}

export * from './types';
