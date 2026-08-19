import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { UserProfile } from '@/domain/types';
import { FRIEND_CODE_PREFIX, newFriendCode, newId } from '@/lib/id';
import { persistStorage } from './storage';

/**
 * 인증 상태.
 * Phase 1: Demo 계정(로컬 전용) — 실제 서버 인증 없음.
 * Phase 2: Supabase Auth(Google/Apple/이메일)로 교체되며,
 *          동일한 인터페이스(user/signIn/signOut)를 유지한다.
 */

export type AuthMethod = 'demo' | 'supabase';

interface AuthState {
  user: UserProfile | null;
  method: AuthMethod | null;
  signInDemo: (nickname: string) => void;
  updateNickname: (nickname: string) => void;
  signOut: () => void;
  /** 계정 삭제 — 로컬 데이터 삭제 콜백은 호출부에서 함께 실행 */
  deleteAccount: () => void;
  /** 옛 이름에서 만들어진 친구 코드(MLW-)를 새 접두사로 교체 */
  migrateFriendCode: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      method: null,
      signInDemo: (nickname) =>
        set({
          user: {
            id: newId(),
            nickname: nickname.trim() || '데모 사용자',
            friendCode: newFriendCode(),
            createdAt: new Date().toISOString(),
          },
          method: 'demo',
        }),
      updateNickname: (nickname) =>
        set((s) => (s.user ? { user: { ...s.user, nickname: nickname.trim() } } : s)),
      signOut: () => set({ user: null, method: null }),
      migrateFriendCode: () =>
        set((s) => {
          if (!s.user || s.user.friendCode.startsWith(`${FRIEND_CODE_PREFIX}-`)) return s;
          // 친구 기능이 아직 서버 없이 동작하지 않아 코드를 주고받은 사람이 없다.
          // 지금 바꾸는 게 나중보다 안전하다.
          return { user: { ...s.user, friendCode: newFriendCode() } };
        }),
      deleteAccount: () => set({ user: null, method: null }),
    }),
    {
      // 앱 이름이 Mellow Diary → D-log로 바뀌었지만 이 키는 그대로 둔다.
      // 바꾸는 순간 이미 저장된 사용자 데이터를 못 찾아 전부 사라진다. 화면에 나오지 않는 값이다.
      name: 'mellow-auth',
      storage: persistStorage,
      // 저장된 값을 읽어 온 직후 한 번만 실행된다 — 화면에서 effect를 돌릴 필요가 없다
      onRehydrateStorage: () => (state) => state?.migrateFriendCode(),
    },
  ),
);
