import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { UserProfile } from '@/domain/types';
import { newFriendCode, newId } from '@/lib/id';
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
      deleteAccount: () => set({ user: null, method: null }),
    }),
    // 앱 이름이 Mellow Diary → D-log로 바뀌었지만 이 키는 그대로 둔다.
    // 바꾸는 순간 이미 저장된 사용자 데이터를 못 찾아 전부 사라진다. 화면에 나오지 않는 값이다.
    { name: 'mellow-auth', storage: persistStorage },
  ),
);
