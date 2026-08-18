import { z } from 'zod';

/**
 * AI 응답 구조화 스키마.
 * AI 응답을 문자열로 임의 파싱하지 않고 반드시 이 스키마로 검증한다.
 * (서버 Edge Function에서도 동일 스키마로 재검증)
 */

export const changedPartSchema = z.object({
  from: z.string(),
  to: z.string(),
  reasonKo: z.string(),
});

export const keyExpressionSchema = z.object({
  expression: z.string(),
  meaningKo: z.string(),
  example: z.string(),
});

export const correctionSchema = z.object({
  severity: z.enum(['correct', 'minor', 'major']),
  original: z.string(),
  corrected: z.string(),
  explanationKo: z.string(),
  changedParts: z.array(changedPartSchema).default([]),
  keyExpressions: z.array(keyExpressionSchema).default([]),
  readingJa: z.string().nullable().optional(),
});

export const aiTurnResponseSchema = z.object({
  detectedLanguage: z.enum(['en', 'ja', 'ko', 'other']),
  transcript: z.string(),
  correction: correctionSchema,
  assistant: z.object({
    replyTargetLanguage: z.string(),
    replyKo: z.string(),
    followUpQuestion: z.string().nullable(),
    emotion: z.string().default('warm'),
  }),
  safety: z.object({
    blocked: z.boolean(),
    reason: z.string().nullable(),
  }),
});

export type AiTurnResponse = z.infer<typeof aiTurnResponseSchema>;

export const finalDiarySchema = z.object({
  titleCandidates: z.array(z.string()).min(1).max(3),
  /** 쉬운 버전 */
  simpleVersion: z.string(),
  /** 더 자연스럽고 풍부한 버전 */
  naturalVersion: z.string(),
  translationKo: z.string(),
  keyExpressions: z.array(keyExpressionSchema).default([]),
  commonMistakes: z.array(z.string()).default([]),
  practiceSentences: z.array(z.string()).max(3).default([]),
  encouragementKo: z.string(),
});

export type FinalDiaryResult = z.infer<typeof finalDiarySchema>;

/** 파싱 실패 시 안전한 fallback 응답 생성 (사용자 입력을 잃지 않는다) */
export function fallbackTurnResponse(userText: string, language: 'en' | 'ja'): AiTurnResponse {
  return {
    detectedLanguage: language,
    transcript: userText,
    correction: {
      severity: 'correct',
      original: userText,
      corrected: userText,
      explanationKo: '',
      changedParts: [],
      keyExpressions: [],
      readingJa: null,
    },
    assistant: {
      replyTargetLanguage:
        language === 'en' ? 'I see! Tell me more about it.' : 'そうなんですね。もっと聞かせてください。',
      replyKo: '그렇군요! 조금 더 이야기해 주세요.',
      followUpQuestion: null,
      emotion: 'warm',
    },
    safety: { blocked: false, reason: null },
  };
}
