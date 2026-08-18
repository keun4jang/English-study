import { ChatMessage, DiaryEntry } from '@/domain/types';

/**
 * 일일 목표 (듀오링고의 daily goal에서 착안, 압박 없는 방식으로 재설계).
 * 목표 단위는 "오늘 이야기한 문장 수" — 측정 가능한 값만 센다:
 * - AI 대화에서 오늘 보낸 내 메시지 수
 * - 오늘 직접 쓴 일기의 문장 수
 * 목표 미달성에 대한 어떤 불이익/죄책감 표현도 없다.
 */

/** 문장 수 세기 (영어/일본어 문장 부호 기준, 최소 1) */
export function countSentences(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  const parts = trimmed
    .split(/[.!?。！？]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return Math.max(1, parts.length);
}

export interface DailyProgress {
  /** 오늘 AI에게 말한 문장 수 */
  spoken: number;
  /** 오늘 직접 쓴 일기의 문장 수 */
  written: number;
  total: number;
  goal: number;
  achieved: boolean;
}

/** createdAt(ISO)이 오늘(로컬)인지 */
function isCreatedToday(createdAt: string, todayKeyStr: string): boolean {
  const d = new Date(createdAt);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}` === todayKeyStr;
}

export function computeDailyProgress(input: {
  messages: ChatMessage[];
  entries: DiaryEntry[];
  today: string;
  goal: number;
}): DailyProgress {
  const spoken = input.messages
    .filter((m) => m.role === 'user' && isCreatedToday(m.createdAt, input.today))
    .reduce((sum, m) => sum + countSentences(m.text), 0);
  const written = input.entries
    .filter(
      (e) =>
        e.status === 'saved' &&
        e.localDate === input.today &&
        // AI 대화 일기는 이미 spoken으로 집계됨 (중복 방지)
        e.inputMethod !== 'ai-chat',
    )
    .reduce((sum, e) => sum + countSentences(e.finalText), 0);
  const total = spoken + written;
  return { spoken, written, total, goal: input.goal, achieved: total >= input.goal };
}
