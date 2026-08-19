import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { DailyUsage } from '@/domain/types';
import { todayKey } from '@/lib/dates';
import { emptyUsage } from '@/lib/usageLimits';
import { persistStorage } from './storage';

/**
 * AI 사용량 추적 (비용 보호).
 * 클라이언트 기록은 UX 안내용이며, 실제 과금 방어는 서버(Edge Function)에서 재검증한다.
 */
interface UsageState {
  usage: DailyUsage;
  /** 오늘 날짜 기준 사용량 반환 (날짜가 바뀌면 리셋) */
  getToday: () => DailyUsage;
  recordAiTurn: () => void;
  recordDiaryGeneration: () => void;
  wipeAll: () => void;
}

export const useUsage = create<UsageState>()(
  persist(
    (set, get) => ({
      usage: emptyUsage(todayKey()),
      getToday: () => {
        const today = todayKey();
        const current = get().usage;
        if (current.date !== today) {
          const fresh = emptyUsage(today);
          set({ usage: fresh });
          return fresh;
        }
        return current;
      },
      recordAiTurn: () => {
        const current = get().getToday();
        set({ usage: { ...current, aiTurns: current.aiTurns + 1 } });
      },
      recordDiaryGeneration: () => {
        const current = get().getToday();
        set({ usage: { ...current, diaryGenerations: current.diaryGenerations + 1 } });
      },
      wipeAll: () => set({ usage: emptyUsage(todayKey()) }),
    }),
    // 앱 이름이 Mellow Diary → D-log로 바뀌었지만 이 키는 그대로 둔다.
    // 바꾸는 순간 이미 저장된 사용자 데이터를 못 찾아 전부 사라진다. 화면에 나오지 않는 값이다.
    { name: 'mellow-usage', storage: persistStorage },
  ),
);
