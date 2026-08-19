import { isRemoteAiEnabled } from '@/config/appConfig';
import { BuiltInAIProvider } from './builtInProvider';
import { AIProvider } from './provider';
import { RemoteAIProvider } from './remoteProvider';

let cached: AIProvider | null = null;

/**
 * 사용할 AI Provider를 고른다.
 *
 * 기본값은 항상 내장 AI다 — 비용 0원, 오프라인 동작, 문장이 기기 밖으로 나가지 않는다.
 * 외부 AI는 사용자가 직접 키를 발급하고 EXPO_PUBLIC_AI_ENABLED=true와 Supabase 구성을
 * 모두 갖췄을 때만 켜진다 (그 순간부터 사용량만큼 본인에게 과금된다).
 */
export function getAIProvider(): AIProvider {
  if (cached) return cached;
  if (isRemoteAiEnabled()) {
    cached = new RemoteAIProvider({
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL!,
      // Phase 2에서 Supabase Auth 세션 토큰으로 교체한다.
      getAccessToken: async () => null,
    });
  } else {
    cached = new BuiltInAIProvider();
  }
  return cached;
}

/** 내장 AI(무료·오프라인)로 동작 중인지 */
export function isBuiltInAI(): boolean {
  return getAIProvider().name === 'builtin';
}
