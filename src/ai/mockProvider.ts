import { LearningLanguage } from '@/domain/types';
import { AIProvider, AiTurnContext, FinalDiaryContext } from './provider';
import { AiTurnResponse, FinalDiaryResult, aiTurnResponseSchema } from './schema';

/**
 * MockAIProvider — 실제 AI 키 없이 전체 앱 흐름을 테스트하기 위한 규칙 기반 Mock.
 * 화면에는 "Mock AI" 배지로 명확히 표시된다.
 *
 * 제한된 규칙으로 흔한 오류(과거 시제, 관사 등)만 흉내내며,
 * 실제 품질의 교정은 Anthropic Provider(서버 경유) 연결 후 제공된다.
 */

interface MockRule {
  test: (text: string) => boolean;
  apply: (text: string) => {
    corrected: string;
    explanationKo: string;
    changedParts: { from: string; to: string; reasonKo: string }[];
    keyExpressions: { expression: string; meaningKo: string; example: string }[];
    severity: 'minor' | 'major';
  };
}

const EN_RULES: MockRule[] = [
  {
    // "I go ... yesterday" → 과거 시제
    test: (t) => /\bi go\b/i.test(t) && /\byesterday\b/i.test(t),
    apply: (t) => {
      let corrected = t.replace(/\bi go\b/i, 'I went');
      corrected = corrected.replace(/\bwent (cafe|café)\b/i, 'went to a café');
      corrected = corrected.replace(/\bwent (school|park|store|gym)\b/i, 'went to the $1');
      return {
        corrected,
        explanationKo:
          '어제 일이라 go를 went로 바꾸고, 장소 앞에 to와 a(또는 the)를 넣으면 자연스러워요.',
        changedParts: [{ from: 'go', to: 'went', reasonKo: '과거 시제' }],
        keyExpressions: [
          {
            expression: 'go to a café',
            meaningKo: '카페에 가다',
            example: 'I often go to a café after work.',
          },
        ],
        severity: 'major',
      };
    },
  },
  {
    // "I am go" / "I am eat" 류
    test: (t) => /\bi am (go|eat|play|study|watch)\b/i.test(t),
    apply: (t) => {
      const corrected = t.replace(/\bi am (go|eat|play|study|watch)\b/i, (_m, v) => `I ${v}`);
      return {
        corrected,
        explanationKo: 'am 뒤에 동사 원형을 바로 쓰지 않아요. "I + 동사" 형태가 자연스러워요.',
        changedParts: [{ from: 'am + 동사', to: '동사', reasonKo: '동사 형태' }],
        keyExpressions: [],
        severity: 'major',
      };
    },
  },
  {
    // "very fun" → minor 개선 예시
    test: (t) => /\bvery fun\b/i.test(t),
    apply: (t) => ({
      corrected: t.replace(/\bvery fun\b/i, 'really fun'),
      explanationKo: '"very fun"보다 "really fun"이 조금 더 자연스럽게 들려요.',
      changedParts: [{ from: 'very fun', to: 'really fun', reasonKo: '자연스러운 표현' }],
      keyExpressions: [
        {
          expression: 'really fun',
          meaningKo: '정말 재미있는',
          example: 'The movie was really fun.',
        },
      ],
      severity: 'minor',
    }),
  },
];

const EN_REPLIES: { reply: string; ko: string; question: string }[] = [
  {
    reply: 'That sounds nice! What did you talk about?',
    ko: '좋았겠네요! 무슨 이야기를 나눴어요?',
    question: 'What did you talk about?',
  },
  {
    reply: 'Oh, I see! How did you feel about that?',
    ko: '아, 그렇군요! 그때 기분이 어땠어요?',
    question: 'How did you feel about that?',
  },
  {
    reply: "That's interesting. What happened next?",
    ko: '흥미로운데요. 그 다음엔 어떻게 됐어요?',
    question: 'What happened next?',
  },
  {
    reply: 'Sounds like a full day! What was the best part?',
    ko: '알찬 하루였네요! 가장 좋았던 순간은 뭐였어요?',
    question: 'What was the best part?',
  },
];

const JA_REPLIES: { reply: string; ko: string; question: string }[] = [
  {
    reply: 'いいですね！だれと行きましたか？',
    ko: '좋네요! 누구와 갔어요?',
    question: 'だれと行きましたか？',
  },
  {
    reply: 'そうなんですね。どうでしたか？',
    ko: '그렇군요. 어땠어요?',
    question: 'どうでしたか？',
  },
  {
    reply: 'なるほど！そのあと何をしましたか？',
    ko: '그렇군요! 그 다음에 무엇을 했어요?',
    question: 'そのあと何をしましたか？',
  },
];

function pickReply(language: LearningLanguage, turnIndex: number) {
  const pool = language === 'en' ? EN_REPLIES : JA_REPLIES;
  return pool[turnIndex % pool.length];
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class MockAIProvider implements AIProvider {
  readonly name = 'mock';

  async evaluateAndReply(userText: string, ctx: AiTurnContext): Promise<AiTurnResponse> {
    await delay(450); // 실제 네트워크 지연 흉내

    const trimmed = userText.trim();
    const turnIndex = ctx.recentMessages.filter((m) => m.role === 'user').length;
    const replyPick = pickReply(ctx.language, turnIndex);

    let correction: AiTurnResponse['correction'] = {
      severity: 'correct',
      original: trimmed,
      corrected: trimmed,
      explanationKo: '',
      changedParts: [],
      keyExpressions: [],
      readingJa: null,
    };

    if (ctx.language === 'en') {
      const rule = EN_RULES.find((r) => r.test(trimmed));
      if (rule) {
        const applied = rule.apply(trimmed);
        correction = { ...applied, original: trimmed, readingJa: null };
      }
    }

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
    // Mock도 실제 Provider와 동일하게 스키마 검증을 거친다.
    return aiTurnResponseSchema.parse(response);
  }

  async createFinalDiary(ctx: FinalDiaryContext): Promise<FinalDiaryResult> {
    await delay(700);
    // 사용자가 실제로 말한 문장만 사용한다 (내용을 지어내지 않는다).
    const userSentences = ctx.messages
      .filter((m) => m.role === 'user')
      .map((m) => m.text.trim())
      .filter(Boolean);

    const body = userSentences.join(' ');
    const isEn = ctx.language === 'en';
    return {
      titleCandidates: isEn
        ? ['My Day Today', 'A Small Moment', 'Today in My Words']
        : ['今日の日記', '小さな一日', '今日のできごと'],
      simpleVersion: body,
      naturalVersion: body,
      translationKo:
        '(Mock 모드: 실제 AI 연결 후 한국어 번역이 제공됩니다. 내용은 내가 말한 문장 그대로예요.)',
      keyExpressions: [],
      commonMistakes: [],
      practiceSentences: userSentences.slice(0, 2),
      encouragementKo: '오늘도 외국어로 하루를 기록했어요. 그것만으로 충분히 멋져요! 🌷',
    };
  }

  async translateDiary(_text: string, _language: LearningLanguage): Promise<string> {
    await delay(300);
    return '(Mock 모드: 실제 AI 연결 후 번역이 제공됩니다.)';
  }

  async generateTitle(_text: string, language: LearningLanguage): Promise<string[]> {
    await delay(300);
    return language === 'en' ? ['My Day Today', 'A Small Moment'] : ['今日の日記', '小さな一日'];
  }
}
