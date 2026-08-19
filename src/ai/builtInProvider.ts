import { LearningLanguage } from '@/domain/types';
import { AIProvider, AiTurnContext, FinalDiaryContext } from './provider';
import { applyRules, rulesFor, toCorrectionResult } from './rules';
import { AiTurnResponse, FinalDiaryResult, aiTurnResponseSchema } from './schema';
import { extractKeyword, pickReply } from './topics';

/**
 * 내장 AI — 기기 안에서만 동작하는 교정·대화 엔진.
 *
 * 외부 AI 서비스를 호출하지 않는다. 그래서 비용이 0원이고, 인터넷이 없어도 동작하며,
 * 사용자가 쓴 문장이 기기 밖으로 나가지 않는다. 대신 사람처럼 모든 문장을 이해하지는
 * 못하고, 자주 나오는 오류 패턴과 주제를 규칙으로 다룬다.
 *
 * - 교정: src/ai/rules — 규칙 파이프라인 (한 문장에 여러 규칙이 함께 적용된다)
 * - 대화: src/ai/topics — 주제 사전 (같은 대화에서 같은 답을 반복하지 않는다)
 */

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 대화가 뚝 끊긴 느낌이 나지 않도록 아주 짧게 뜸을 들인다 */
const THINKING_MS = 350;

export class BuiltInAIProvider implements AIProvider {
  readonly name = 'builtin';

  async evaluateAndReply(userText: string, ctx: AiTurnContext): Promise<AiTurnResponse> {
    await delay(THINKING_MS);

    const trimmed = userText.trim();
    const userTurns = ctx.recentMessages.filter((m) => m.role === 'user');

    // 이미 한 답변은 다시 쓰지 않는다 — 같은 말을 반복하면 대화가 아니라 자동응답처럼 느껴진다
    const usedReplies = new Set(
      ctx.recentMessages.filter((m) => m.role === 'assistant').map((m) => m.text.trim()),
    );

    const replyPick = pickReply(trimmed, ctx.language, {
      usedReplies,
      turnIndex: userTurns.length,
    });

    const engineResult = applyRules(trimmed, ctx.language, rulesFor(ctx.language));
    const correction = toCorrectionResult(trimmed, engineResult);

    const response: AiTurnResponse = {
      detectedLanguage: ctx.language,
      transcript: trimmed,
      correction,
      assistant: {
        replyTargetLanguage: replyPick.reply,
        replyKo: replyPick.ko,
        followUpQuestion: replyPick.question,
        emotion: 'warm',
      },
      safety: { blocked: false, reason: null },
    };

    // 내장 AI도 외부 Provider와 똑같이 스키마 검증을 거친다 (교체해도 화면 코드가 안 바뀌도록)
    return aiTurnResponseSchema.parse(response);
  }

  async createFinalDiary(ctx: FinalDiaryContext): Promise<FinalDiaryResult> {
    await delay(600);

    // 사용자가 실제로 말한 문장만 쓴다 — 내용을 지어내지 않는다
    const userMessages = ctx.messages.filter((m) => m.role === 'user' && m.text.trim());
    const originalSentences = userMessages.map((m) => m.text.trim());
    const naturalSentences = userMessages.map((m) => (m.correctedText ?? m.text).trim());

    // 다음에 연습할 문장: 교정이 있었던 문장의 교정된 형태
    const practiceSentences = userMessages
      .filter((m) => m.correctedText && m.correctedText !== m.text)
      .map((m) => m.correctedText!.trim())
      .slice(0, 3);

    // 오늘 나온 교정에서 핵심 표현을 모은다 (중복 제거)
    const keyExpressions: FinalDiaryResult['keyExpressions'] = [];
    for (const message of userMessages) {
      const result = applyRules(message.text.trim(), ctx.language, rulesFor(ctx.language));
      for (const item of result.keyExpressions) {
        if (keyExpressions.some((k) => k.expression === item.expression)) continue;
        keyExpressions.push(item);
        if (keyExpressions.length >= 3) break;
      }
      if (keyExpressions.length >= 3) break;
    }

    return {
      titleCandidates: this.buildTitles(originalSentences.join(' '), ctx.language),
      simpleVersion: originalSentences.join(' '),
      naturalVersion: naturalSentences.join(' '),
      // 내장 AI는 번역을 하지 않는다. 그럴듯한 가짜 번역을 넣는 대신 비워 둔다.
      translationKo: '',
      keyExpressions,
      commonMistakes: [],
      practiceSentences,
      encouragementKo: '오늘도 외국어로 하루를 기록했어요. 그것만으로 충분히 멋져요.',
    };
  }

  async translateDiary(_text: string, _language: LearningLanguage): Promise<string> {
    await delay(200);
    // 기기 안에서 돌아가는 규칙 엔진으로는 번역을 할 수 없다. 틀린 번역을 보여주느니
    // 번역이 없다고 말하는 편이 낫다.
    return '';
  }

  async generateTitle(text: string, language: LearningLanguage): Promise<string[]> {
    await delay(200);
    return this.buildTitles(text, language);
  }

  /** 오늘 이야기에 나온 단어로 제목 후보를 만든다 (없으면 무난한 기본값) */
  private buildTitles(text: string, language: LearningLanguage): string[] {
    const base =
      language === 'en'
        ? ['My Day Today', 'A Small Moment', 'Today in My Words']
        : ['今日の日記', '小さな一日', '今日のできごと'];

    if (language !== 'en') return base;

    const keyword = extractKeyword(text);
    if (!keyword) return base;
    const capitalized = keyword.charAt(0).toUpperCase() + keyword.slice(1);
    return [`A Day with ${capitalized}`, ...base].slice(0, 3);
  }
}
