import { isRemoteAiEnabled } from '@/config/appConfig';
import { MockAIProvider } from './mockProvider';
import { AIProvider } from './provider';
import { RemoteAIProvider } from './remoteProvider';

let cached: AIProvider | null = null;

/**
 * 환경에 따라 AI Provider를 선택한다.
 * - EXPO_PUBLIC_AI_ENABLED=true + Supabase 구성 → RemoteAIProvider(서버 경유 Anthropic)
 * - 그 외 → MockAIProvider (개발/Demo 모드)
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
    cached = new MockAIProvider();
  }
  return cached;
}

export function isMockAI(): boolean {
  return getAIProvider().name === 'mock';
}
