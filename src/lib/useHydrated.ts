import { useEffect, useState } from 'react';

import { useAuth } from '@/state/useAuth';
import { useChat } from '@/state/useChat';
import { useDiary } from '@/state/useDiary';
import { useExpressions } from '@/state/useExpressions';
import { useSettings } from '@/state/useSettings';
import { useUsage } from '@/state/useUsage';

const stores = [useSettings, useAuth, useDiary, useChat, useExpressions, useUsage] as const;

/** 모든 영속 스토어의 로컬 데이터 복원이 끝났는지 (흰 화면/깜빡임 방지) */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() =>
    stores.every((s) => s.persist.hasHydrated()),
  );

  useEffect(() => {
    if (hydrated) return;
    const check = () => {
      if (stores.every((st) => st.persist.hasHydrated())) setHydrated(true);
    };
    const unsubs = stores.map((s) => s.persist.onFinishHydration(check));
    // 구독 전에 이미 복원이 끝난 경우를 비동기로 재확인
    const timer = setTimeout(check, 0);
    return () => {
      clearTimeout(timer);
      unsubs.forEach((u) => u());
    };
  }, [hydrated]);

  return hydrated;
}
