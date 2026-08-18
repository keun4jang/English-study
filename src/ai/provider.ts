import { CorrectionIntensity, LearningLanguage, UserLevel } from '@/domain/types';
import { AiTurnResponse, FinalDiaryResult } from './schema';

export interface AiTurnContext {
  language: LearningLanguage;
  level: UserLevel;
  intensity: CorrectionIntensity;
  /** 최근 대화 (오래된 전체 기록 대신 최근 메시지 + 요약만 전달) */
  recentMessages: { role: 'user' | 'assistant'; text: string }[];
  /** 이전 대화 요약 (없으면 null) */
  conversationSummary: string | null;
  /** 중복 과금 방지용 요청 ID */
  requestId: string;
}

export interface FinalDiaryContext {
  language: LearningLanguage;
  level: UserLevel;
  messages: { role: 'user' | 'assistant'; text: string }[];
  requestId: string;
}

/**
 * AI Provider Adapter 인터페이스.
 * Mock ↔ Anthropic(서버 경유) ↔ 기타 모델을 교체 가능하게 추상화한다.
 */
export interface AIProvider {
  readonly name: string;
  /** 사용자 발화를 평가(교정)하고 다음 답변을 생성 */
  evaluateAndReply(userText: string, ctx: AiTurnContext): Promise<AiTurnResponse>;
  /** 대화 기반 최종 일기 생성 */
  createFinalDiary(ctx: FinalDiaryContext): Promise<FinalDiaryResult>;
  /** 일기 텍스트 한국어 번역 */
  translateDiary(text: string, language: LearningLanguage): Promise<string>;
  /** 제목 후보 생성 */
  generateTitle(text: string, language: LearningLanguage): Promise<string[]>;
}
