import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { hashPin, makeSalt, safeEqual } from '@/lib/appLock';
import { persistStorage } from './storage';

/**
 * 앱 잠금 상태.
 *
 * `unlocked`는 저장하지 않는다 — 앱을 껐다 켜면 다시 잠겨야 잠금이 의미가 있다.
 * persist에는 `enabled`와 해시만 남긴다.
 *
 * **잊었을 때 잠기지 않는다.** PIN을 잊으면 해제할 수 있게 해 두었다. 일기 본문을
 * 암호화하지 않으므로 이 우회로가 실제 보안을 낮추지 않고(어차피 백업으로 꺼낼 수 있다),
 * 대신 "내 일기에 영영 못 들어가는" 최악을 없앤다.
 */

interface LockState {
  enabled: boolean;
  salt: string | null;
  hash: string | null;
  /** 이번 실행에서 열려 있는지 (저장되지 않는다) */
  unlocked: boolean;
  /** 연속으로 틀린 횟수 — 잠깐 쉬게 만든다 */
  failedAttempts: number;

  enable: (pin: string) => Promise<void>;
  disable: () => void;
  verify: (pin: string) => Promise<boolean>;
  lock: () => void;
  /** 해시 검사 없이 연다 (앱 시작 시 잠금이 꺼져 있는 경우) */
  markUnlocked: () => void;
}

export const useLock = create<LockState>()(
  persist(
    (set, get) => ({
      enabled: false,
      salt: null,
      hash: null,
      unlocked: false,
      failedAttempts: 0,

      enable: async (pin) => {
        const salt = makeSalt();
        const hash = await hashPin(pin, salt);
        set({ enabled: true, salt, hash, unlocked: true, failedAttempts: 0 });
      },

      disable: () => set({ enabled: false, salt: null, hash: null, unlocked: true, failedAttempts: 0 }),

      verify: async (pin) => {
        const { salt, hash } = get();
        if (!salt || !hash) return false;
        const candidate = await hashPin(pin, salt);
        const ok = safeEqual(candidate, hash);
        set((s) => ({ unlocked: ok, failedAttempts: ok ? 0 : s.failedAttempts + 1 }));
        return ok;
      },

      lock: () => set({ unlocked: false }),
      markUnlocked: () => set({ unlocked: true }),
    }),
    {
      name: 'mellow-lock',
      storage: persistStorage,
      // unlocked는 저장하지 않는다 — 저장하면 앱을 껐다 켜도 열린 채로 남는다
      partialize: (state) => ({ enabled: state.enabled, salt: state.salt, hash: state.hash }),
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as Partial<LockState>),
        unlocked: false,
        failedAttempts: 0,
      }),
    },
  ),
);
