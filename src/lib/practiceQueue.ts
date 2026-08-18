import { useMemo } from 'react';

import { LearningLanguage } from '@/domain/types';
import { addDays, todayKey, toLocalDateKey } from '@/lib/dates';
import { useChat } from '@/state/useChat';

export interface PracticeItem {
  sentence: string;
  language: LearningLanguage;
  explanationKo: string;
}

/** 최근 7일 대화의 교정문에서 연습 문장을 모은다 (중복 제거, 최신순, 최대 5개) */
export function usePracticeQueue(): PracticeItem[] {
  const messages = useChat((s) => s.messages);
  const conversations = useChat((s) => s.conversations);
  return useMemo(() => {
    // 오늘 포함 최근 7일 (로컬 날짜 기준 — createdAt은 UTC ISO이므로 로컬로 변환해 비교)
    const cutoff = addDays(todayKey(), -6);
    const langOf = new Map(conversations.map((c) => [c.id, c.language]));
    const seen = new Set<string>();
    const items: PracticeItem[] = [];
    for (const m of [...messages].reverse()) {
      if (!m.correction || m.correction.severity === 'correct') continue;
      if (toLocalDateKey(new Date(m.createdAt)) < cutoff) continue;
      const sentence = m.correction.corrected;
      if (seen.has(sentence)) continue;
      seen.add(sentence);
      items.push({
        sentence,
        language: langOf.get(m.conversationId) ?? 'en',
        explanationKo: m.correction.explanationKo,
      });
      if (items.length >= 5) break;
    }
    return items;
  }, [messages, conversations]);
}

