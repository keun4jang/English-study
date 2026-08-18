import { DailyUsage } from '@/domain/types';

/**
 * AI 사용량 제한 (비용 보호).
 * 값은 환경변수로 재정의 가능하며, 하드코딩 대신 이 모듈을 통해서만 읽는다.
 * 서버(Edge Function)에서도 동일한 제한을 다시 검증한다 — 클라이언트 제한은 UX용이다.
 */

function envInt(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

export function getUsageLimits() {
  return {
    /** 사용자당 하루 AI 대화 턴 */
    dailyAiTurns: envInt(process.env.EXPO_PUBLIC_DAILY_AI_TURN_LIMIT, 20),
    /** 사용자당 하루 AI 일기 완성 횟수 */
    dailyDiaryGenerations: envInt(process.env.EXPO_PUBLIC_DAILY_DIARY_GENERATION_LIMIT, 3),
    /** 한 번의 입력 최대 글자 수 */
    maxInputChars: envInt(process.env.EXPO_PUBLIC_MAX_AI_INPUT_CHARACTERS, 2000),
    /** 일기 전체 최대 글자 수 */
    maxDiaryChars: envInt(process.env.EXPO_PUBLIC_MAX_DIARY_CHARACTERS, 20000),
    /** 일기당 사진 최대 장수 */
    maxPhotosPerDiary: envInt(process.env.EXPO_PUBLIC_MAX_PHOTOS_PER_DIARY, 3),
    /** 사진 압축 후 최대 크기 (bytes) */
    maxPhotoBytes: envInt(process.env.EXPO_PUBLIC_MAX_PHOTO_BYTES, 1_000_000),
  };
}

export type UsageCheck =
  | { allowed: true }
  | { allowed: false; reason: 'ai-turn-limit' | 'diary-generation-limit' | 'input-too-long' };

export function checkAiTurnAllowed(usage: DailyUsage, inputText: string): UsageCheck {
  const limits = getUsageLimits();
  if (inputText.length > limits.maxInputChars) {
    return { allowed: false, reason: 'input-too-long' };
  }
  if (usage.aiTurns >= limits.dailyAiTurns) {
    return { allowed: false, reason: 'ai-turn-limit' };
  }
  return { allowed: true };
}

export function checkDiaryGenerationAllowed(usage: DailyUsage): UsageCheck {
  const limits = getUsageLimits();
  if (usage.diaryGenerations >= limits.dailyDiaryGenerations) {
    return { allowed: false, reason: 'diary-generation-limit' };
  }
  return { allowed: true };
}

export function emptyUsage(date: string): DailyUsage {
  return { date, aiTurns: 0, diaryGenerations: 0 };
}
