import { LearningLanguage } from '@/domain/types';
import { AIProvider, AiTurnContext, FinalDiaryContext } from './provider';
import { AiTurnResponse, FinalDiaryResult, aiTurnResponseSchema } from './schema';

/**
 * MockAIProvider — 실제 AI 키 없이 전체 앱 흐름을 테스트하기 위한 규칙 기반 Mock.
 * 화면에는 "Mock AI" 배지로 명확히 표시된다.
 *
 * 사용자가 말한 내용의 키워드를 인식해 관련된 공감/질문을 돌려준다.
 * 규칙 기반이므로 한계가 있으며, 완전한 맥락 대화는 Anthropic Provider
 * (서버 경유, Phase 2) 연결 후 제공된다.
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
    // "so tired because very hot" — 주어 없이 형용사로 시작 + because 뒤 주어 누락
    test: (t) =>
      /^(so|very|really|too)\s+(tired|happy|sad|hot|cold|busy|excited|angry|hungry|sleepy|bored)\b/i.test(
        t.trim(),
      ),
    apply: (t) => {
      let corrected = t.trim().replace(
        /^(so|very|really|too)\s+/i,
        (m) => `I'm ${m.toLowerCase()}`,
      );
      corrected = corrected.replace(
        /\bbecause\s+(so|very|really|too)?\s*(hot|cold|tired|busy|late|humid|rainy)\b/i,
        (_m, adv, adj) => `because it's ${adv ? adv.toLowerCase() + ' ' : ''}${adj.toLowerCase()}`,
      );
      if (!/[.!?]$/.test(corrected)) corrected += '.';
      return {
        corrected,
        explanationKo:
          '영어 문장에는 주어가 필요해요. "I\'m so tired..."처럼 시작하고, because 뒤에도 "it\'s very hot"처럼 주어를 넣으면 자연스러워요.',
        changedParts: [
          { from: 'so tired', to: "I'm so tired", reasonKo: '주어 추가' },
          { from: 'because very hot', to: "because it's very hot", reasonKo: 'because 뒤 주어+동사' },
        ],
        keyExpressions: [
          {
            expression: "because it's very hot",
            meaningKo: '날씨가 너무 더워서',
            example: "I stayed home because it's very hot today.",
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

interface ReplyTemplate {
  reply: string;
  ko: string;
  question: string | null;
}

interface Topic {
  /** 사용자 발화에서 이 주제를 감지하는 패턴 */
  pattern: RegExp;
  en: ReplyTemplate[];
  ja: ReplyTemplate[];
}

/** 사용자가 말한 내용과 관련된 반응을 고르기 위한 주제 사전 */
const TOPICS: Topic[] = [
  {
    pattern: /\b(hot|heat|sweat|humid)\b|暑|あつい/i,
    en: [
      {
        reply: 'Oh no, the heat can be really draining. Did you drink enough water?',
        ko: '더위는 정말 지치게 하죠. 물은 충분히 마셨어요?',
        question: 'Did you drink enough water?',
      },
      {
        reply: 'It has been so hot lately! How do you usually cool down?',
        ko: '요즘 정말 덥죠! 보통 어떻게 더위를 식혀요?',
        question: 'How do you usually cool down?',
      },
    ],
    ja: [
      {
        reply: '暑い日は大変ですね。水分はとりましたか？',
        ko: '더운 날은 힘들죠. 수분은 섭취했어요?',
        question: '水分はとりましたか？',
      },
    ],
  },
  {
    pattern: /\b(tired|exhausted|sleepy)\b|疲れ|眠い/i,
    en: [
      {
        reply: 'You must be tired. I hope you can rest well tonight. What made today so tiring?',
        ko: '많이 피곤하겠어요. 오늘 밤은 푹 쉬어요. 뭐가 제일 힘들었어요?',
        question: 'What made today so tiring?',
      },
      {
        reply: 'Being tired is tough. Are you planning to sleep early tonight?',
        ko: '피곤하면 힘들죠. 오늘은 일찍 잘 거예요?',
        question: 'Are you planning to sleep early tonight?',
      },
    ],
    ja: [
      {
        reply: 'お疲れさまです。今日はゆっくり休んでくださいね。何が一番大変でしたか？',
        ko: '수고했어요. 오늘은 푹 쉬어요. 뭐가 제일 힘들었어요?',
        question: '何が一番大変でしたか？',
      },
    ],
  },
  {
    pattern: /\b(video|film|movie|shoot|shooting|youtube|vlog)\b|動画|映画/i,
    en: [
      {
        reply: 'Shooting a video sounds exciting! What was the video about?',
        ko: '영상 촬영이라니 멋진데요! 무슨 영상이었어요?',
        question: 'What was the video about?',
      },
      {
        reply: 'That sounds creative! Was it hard to film?',
        ko: '창의적인 하루였네요! 촬영은 어렵지 않았어요?',
        question: 'Was it hard to film?',
      },
    ],
    ja: [
      {
        reply: '動画を撮ったんですね！どんな動画ですか？',
        ko: '영상을 찍었군요! 어떤 영상이에요?',
        question: 'どんな動画ですか？',
      },
    ],
  },
  {
    pattern: /\b(eat|ate|food|lunch|dinner|breakfast|delicious|meal)\b|食べ|ごはん|昼食|夕食/i,
    en: [
      {
        reply: 'Food is one of the best parts of the day! What did you eat?',
        ko: '먹는 게 하루의 낙이죠! 뭘 먹었어요?',
        question: 'What did you eat?',
      },
      {
        reply: 'Yum! Was it delicious?',
        ko: '맛있겠다! 맛있었어요?',
        question: 'Was it delicious?',
      },
    ],
    ja: [
      {
        reply: 'おいしそうですね！何を食べましたか？',
        ko: '맛있겠네요! 뭘 먹었어요?',
        question: '何を食べましたか？',
      },
    ],
  },
  {
    pattern: /\b(friend|friends)\b|友達|友だち/i,
    en: [
      {
        reply: 'Time with friends is precious! What did you do together?',
        ko: '친구와 보내는 시간은 소중하죠! 같이 뭘 했어요?',
        question: 'What did you do together?',
      },
    ],
    ja: [
      {
        reply: '友達と過ごす時間はいいですね！一緒に何をしましたか？',
        ko: '친구와 보내는 시간 좋죠! 같이 뭘 했어요?',
        question: '一緒に何をしましたか？',
      },
    ],
  },
  {
    pattern: /\b(work|worked|job|office|meeting|school|class|study|studied)\b|仕事|会議|学校|勉強/i,
    en: [
      {
        reply: 'Sounds like a busy day. How did it go?',
        ko: '바쁜 하루였나 봐요. 어땠어요?',
        question: 'How did it go?',
      },
      {
        reply: 'Good job today! Was there anything memorable?',
        ko: '오늘도 수고했어요! 기억에 남는 일이 있었어요?',
        question: 'Was there anything memorable?',
      },
    ],
    ja: [
      {
        reply: '忙しい一日だったんですね。どうでしたか？',
        ko: '바쁜 하루였군요. 어땠어요?',
        question: 'どうでしたか？',
      },
    ],
  },
  {
    pattern: /\b(happy|great|fun|nice|good|amazing|excited)\b|楽しい|嬉しい|良かった/i,
    en: [
      {
        reply: "I'm glad to hear that! What was the best moment?",
        ko: '다행이에요! 가장 좋았던 순간은 뭐였어요?',
        question: 'What was the best moment?',
      },
    ],
    ja: [
      {
        reply: 'よかったですね！一番楽しかったことは何ですか？',
        ko: '잘됐네요! 가장 즐거웠던 건 뭐예요?',
        question: '一番楽しかったことは何ですか？',
      },
    ],
  },
  {
    pattern: /\b(sad|bad|upset|angry|stress|stressed|hard|difficult)\b|悲しい|大変|辛い/i,
    en: [
      {
        reply: "I'm sorry to hear that. Do you want to tell me more about it?",
        ko: '속상했겠어요. 조금 더 이야기해 줄래요?',
        question: 'Do you want to tell me more about it?',
      },
    ],
    ja: [
      {
        reply: 'それは大変でしたね。もう少し聞かせてもらえますか？',
        ko: '힘들었겠네요. 조금 더 들려줄래요?',
        question: 'もう少し聞かせてもらえますか？',
      },
    ],
  },
  {
    pattern: /\b(rain|rainy|snow|weather|cold)\b|雨|雪|寒/i,
    en: [
      {
        reply: 'The weather really changes the mood of a day. Did it affect your plans?',
        ko: '날씨가 하루 기분을 좌우하죠. 계획에 영향이 있었어요?',
        question: 'Did it affect your plans?',
      },
    ],
    ja: [
      {
        reply: '天気で気分が変わりますよね。予定に影響がありましたか？',
        ko: '날씨 따라 기분이 달라지죠. 일정에 영향 있었어요?',
        question: '予定に影響がありましたか？',
      },
    ],
  },
];

/** 주제 미감지 시: 사용자의 말에서 핵심 단어를 뽑아 인용하는 fallback */
const EN_STOPWORDS = new Set([
  'the', 'and', 'but', 'for', 'with', 'was', 'were', 'this', 'that', 'today', 'yesterday',
  'very', 'really', 'just', 'have', 'has', 'had', 'been', 'because', 'about', 'then', 'when',
]);

function extractKeyword(text: string): string | null {
  const words = text
    .toLowerCase()
    .replace(/[^a-z\s']/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !EN_STOPWORDS.has(w));
  if (words.length === 0) return null;
  // 영어 문장은 보통 목적어가 뒤에 오므로 마지막 후보 단어를 핵심어로 추정
  return words[words.length - 1];
}

const GENERIC_EN: ReplyTemplate[] = [
  {
    reply: 'I see! Can you tell me a little more about that?',
    ko: '그렇군요! 조금 더 자세히 이야기해 줄래요?',
    question: 'Can you tell me a little more about that?',
  },
  {
    reply: 'That sounds like a real moment from your day. How did you feel then?',
    ko: '오늘의 한 장면이 그려지네요. 그때 기분이 어땠어요?',
    question: 'How did you feel then?',
  },
];

const GENERIC_JA: ReplyTemplate[] = [
  {
    reply: 'そうなんですね。もう少し詳しく教えてください。',
    ko: '그렇군요. 조금 더 자세히 알려주세요.',
    question: 'もう少し詳しく教えてください。',
  },
  {
    reply: 'なるほど。そのとき、どんな気持ちでしたか？',
    ko: '그렇군요. 그때 어떤 기분이었어요?',
    question: 'そのとき、どんな気持ちでしたか？',
  },
];

/**
 * 사용자 발화 내용과 관련된 반응 선택.
 * 1) 주제 사전에서 키워드 감지 → 해당 주제의 답변
 * 2) 미감지 → 핵심 단어를 인용한 질문
 * 3) 핵심 단어도 없으면 일반 반응
 */
export function pickContextualReply(
  userText: string,
  language: LearningLanguage,
  turnIndex: number,
): ReplyTemplate {
  const matched = TOPICS.filter((t) => t.pattern.test(userText));
  if (matched.length > 0) {
    // 여러 주제가 감지되면 턴에 따라 다른 주제를 골라 반복을 줄인다
    const topic = matched[turnIndex % matched.length];
    const pool = language === 'en' ? topic.en : topic.ja;
    return pool[turnIndex % pool.length];
  }
  if (language === 'en') {
    const keyword = extractKeyword(userText);
    if (keyword) {
      return {
        reply: `You mentioned "${keyword}" — I'd love to hear more! What was it like?`,
        ko: `"${keyword}" 이야기가 궁금해요! 어땠어요?`,
        question: 'What was it like?',
      };
    }
  }
  const pool = language === 'en' ? GENERIC_EN : GENERIC_JA;
  return pool[turnIndex % pool.length];
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class MockAIProvider implements AIProvider {
  readonly name = 'mock';

  async evaluateAndReply(userText: string, ctx: AiTurnContext): Promise<AiTurnResponse> {
    await delay(450); // 실제 네트워크 지연 흉내

    const trimmed = userText.trim();
    const turnIndex = ctx.recentMessages.filter((m) => m.role === 'user').length;
    const replyPick = pickContextualReply(trimmed, ctx.language, turnIndex);

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
    const userMessages = ctx.messages.filter((m) => m.role === 'user' && m.text.trim());
    const originalSentences = userMessages.map((m) => m.text.trim());
    // 자연스러운 버전: AI 교정문이 있으면 교정문으로 반영
    const naturalSentences = userMessages.map((m) => (m.correctedText ?? m.text).trim());
    // 다음에 연습할 문장: 교정이 있었던 문장의 "교정된" 형태
    const practiceSentences = userMessages
      .filter((m) => m.correctedText && m.correctedText !== m.text)
      .map((m) => m.correctedText!.trim())
      .slice(0, 3);

    const isEn = ctx.language === 'en';
    return {
      titleCandidates: isEn
        ? ['My Day Today', 'A Small Moment', 'Today in My Words']
        : ['今日の日記', '小さな一日', '今日のできごと'],
      simpleVersion: originalSentences.join(' '),
      naturalVersion: naturalSentences.join(' '),
      translationKo:
        '(Mock 모드: 실제 AI 연결 후 한국어 번역이 제공됩니다. 내용은 내가 말한 문장 그대로예요.)',
      keyExpressions: [],
      commonMistakes: [],
      practiceSentences,
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
