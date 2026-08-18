import { LearningLanguage } from '@/domain/types';
import { AIProvider, AiTurnContext, FinalDiaryContext } from './provider';
import {
  AiTurnResponse,
  FinalDiaryResult,
  aiTurnResponseSchema,
  fallbackTurnResponse,
  finalDiarySchema,
} from './schema';

/**
 * RemoteAIProvider — Supabase Edge Function(ai-chat)을 경유해 Anthropic Claude를 호출한다.
 *
 * 보안:
 * - Anthropic API Key는 서버(Edge Function Secret)에만 존재한다.
 * - 클라이언트는 Supabase 세션 토큰으로 인증된 요청만 보낸다.
 * - 서버에서 Rate Limit / 사용량 제한을 다시 검증한다.
 *
 * 비용 보호:
 * - requestId(idempotency key)로 네트워크 재시도 중복 과금을 방지한다.
 * - 파싱 실패 시 자동 재시도는 1회만, 이후 fallback 응답을 사용한다.
 */

interface RemoteConfig {
  supabaseUrl: string;
  getAccessToken: () => Promise<string | null>;
}

export class RemoteAIProvider implements AIProvider {
  readonly name = 'anthropic-remote';

  constructor(private config: RemoteConfig) {}

  private async invoke<T>(action: string, payload: unknown, retryOnce = true): Promise<T> {
    const token = await this.config.getAccessToken();
    const res = await fetch(`${this.config.supabaseUrl}/functions/v1/ai-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ action, payload }),
    });
    if (!res.ok) {
      if (retryOnce && res.status >= 500) {
        return this.invoke<T>(action, payload, false);
      }
      // 오류 세부 정보(키/스택 등)를 사용자에게 노출하지 않는다.
      throw new Error(`ai-request-failed:${res.status}`);
    }
    return (await res.json()) as T;
  }

  async evaluateAndReply(userText: string, ctx: AiTurnContext): Promise<AiTurnResponse> {
    try {
      const raw = await this.invoke<unknown>('evaluateAndReply', { userText, ctx });
      return aiTurnResponseSchema.parse(raw);
    } catch {
      // 사용자 입력을 잃지 않는다 — 일반 대화 fallback
      return fallbackTurnResponse(userText, ctx.language);
    }
  }

  async createFinalDiary(ctx: FinalDiaryContext): Promise<FinalDiaryResult> {
    const raw = await this.invoke<unknown>('createFinalDiary', { ctx });
    return finalDiarySchema.parse(raw);
  }

  async translateDiary(text: string, language: LearningLanguage): Promise<string> {
    const raw = await this.invoke<{ translation: string }>('translateDiary', { text, language });
    return raw.translation;
  }

  async generateTitle(text: string, language: LearningLanguage): Promise<string[]> {
    const raw = await this.invoke<{ titles: string[] }>('generateTitle', { text, language });
    return raw.titles;
  }
}
