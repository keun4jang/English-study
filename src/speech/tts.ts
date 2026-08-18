import * as Speech from 'expo-speech';

import { LEARNING_LANGUAGE_TAGS, LearningLanguage, SpeechRate } from '@/domain/types';
import { sanitizeForSpeech } from '@/lib/speechText';

/**
 * TTS — 기기 기본 음성 합성(expo-speech)만 사용한다 (비용 0원).
 * 중복 재생 방지: 새 재생 전 항상 기존 재생을 중지한다.
 */

const RATE_MAP: Record<SpeechRate, number> = {
  slow: 0.7,
  normal: 0.95,
  fast: 1.2,
};

export interface SpeakOptions {
  language: LearningLanguage;
  rate?: SpeechRate;
  /** 느리게 듣기 (rate보다 우선) */
  extraSlow?: boolean;
  pitch?: number;
  voiceId?: string;
  onDone?: () => void;
}

export async function speak(text: string, options: SpeakOptions): Promise<void> {
  await stopSpeaking();
  // 이모지/기호는 음성으로 읽지 않는다 ("😊"가 "smiling face"로 읽히는 것 방지)
  const speakable = sanitizeForSpeech(text);
  if (!speakable) return;
  const rate = options.extraSlow ? 0.55 : RATE_MAP[options.rate ?? 'normal'];
  // 긴 문장은 문장 단위로 나눠 재생 (일부 플랫폼의 길이 제한 대응)
  const chunks = splitIntoChunks(speakable);
  chunks.forEach((chunk, i) => {
    Speech.speak(chunk, {
      language: LEARNING_LANGUAGE_TAGS[options.language],
      rate,
      pitch: options.pitch ?? 1.0,
      voice: options.voiceId,
      onDone: i === chunks.length - 1 ? options.onDone : undefined,
    });
  });
}

export async function stopSpeaking(): Promise<void> {
  try {
    await Speech.stop();
  } catch {
    // 재생 중이 아니면 무시
  }
}

export async function isSpeaking(): Promise<boolean> {
  try {
    return await Speech.isSpeakingAsync();
  } catch {
    return false;
  }
}

/** 사용 가능한 기기 음성 중 해당 언어 음성만 필터링 */
export async function getVoicesForLanguage(language: LearningLanguage) {
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    const prefix = language === 'en' ? 'en' : 'ja';
    return voices.filter((v) => v.language?.toLowerCase().startsWith(prefix));
  } catch {
    return [];
  }
}

export function splitIntoChunks(text: string, maxLen = 300): string[] {
  const trimmed = text.trim();
  if (trimmed.length <= maxLen) return trimmed ? [trimmed] : [];
  const sentences = trimmed.split(/(?<=[.!?。！？])\s*/);
  const chunks: string[] = [];
  let current = '';
  for (const s of sentences) {
    if ((current + ' ' + s).trim().length > maxLen && current) {
      chunks.push(current.trim());
      current = s;
    } else {
      current = (current + ' ' + s).trim();
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}
