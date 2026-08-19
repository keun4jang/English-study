import { CorrectionRule } from './types';

/**
 * 영어 자연스러움 — 문법은 맞지만 어색하게 들리는 표현을 부드럽게 다듬는다.
 *
 * 안전 원칙
 * - 여기 규칙은 대부분 severity: 'minor'다. 뜻은 이미 전달되고 있으므로 설명을 특히 부드럽게 쓴다.
 * - 정상 문장은 절대 건드리지 않는다. "very tired"(정상)처럼 흔히 맞는 조합은 목록에서 뺐다.
 * - 단어 목록은 화이트리스트로만 관리하고, 다른 뜻으로도 쓰이는 단어(relaxing, moving, worrying …)는 제외한다.
 * - 문장 끝 마침표와 첫 글자 대문자는 엔진이 처리하므로 여기서 다루지 않는다.
 */

const alt = (words: readonly string[]): string => words.join('|');

/** very는 동사를 꾸미지 못한다 — 한국어 "아주 좋아해"를 직역할 때 자주 나온다. */
const FEELING_VERBS: readonly string[] = [
  'like', 'likes', 'liked', 'love', 'loves', 'loved', 'hate', 'hates', 'hated',
  'want', 'wants', 'wanted', 'need', 'needs', 'needed', 'enjoy', 'enjoys', 'enjoyed',
  'miss', 'misses', 'missed', 'thank', 'thanks', 'thanked', 'appreciate', 'appreciates',
  'appreciated', 'hope', 'hopes', 'hoped', 'prefer', 'prefers', 'preferred',
  'agree', 'agrees', 'agreed', 'respect', 'respects', 'respected', 'admire', 'admires',
  'admired', 'recommend', 'recommends', 'recommended', 'understand', 'understands',
];

/** 이미 뜻이 강해서 very와 잘 어울리지 않는 형용사 (very tired, very hot 같은 정상 조합은 제외했다) */
const STRONG_ADJECTIVES: readonly string[] = [
  'delicious', 'amazing', 'awesome', 'perfect', 'huge', 'enormous', 'tiny',
  'freezing', 'boiling', 'exhausted', 'starving', 'terrible', 'awful', 'horrible',
  'fantastic', 'wonderful', 'excellent', 'gorgeous', 'furious', 'hilarious',
  'brilliant', 'stunning', 'ridiculous', 'impossible', 'ancient', 'delighted', 'fun',
];

/** too much 뒤에 잘못 붙는 긍정 형용사 — 실제 뜻은 "정말 ~한"에 가깝다. */
const POSITIVE_ADJECTIVES: readonly string[] = [
  'good', 'nice', 'happy', 'delicious', 'fun', 'pretty', 'cute', 'kind',
  'beautiful', 'funny', 'interesting', 'glad', 'lucky', 'proud', 'comfortable',
  'healthy', 'useful', 'helpful', 'sweet', 'cool',
];

/** 내 기분을 말할 때 -ing 대신 -ed를 쓰는 짝 (relaxing, moving, worrying처럼 진행형으로도 맞는 단어는 뺐다) */
const ING_TO_ED: Record<string, string> = {
  boring: 'bored',
  interesting: 'interested',
  exciting: 'excited',
  tiring: 'tired',
  confusing: 'confused',
  disappointing: 'disappointed',
  embarrassing: 'embarrassed',
  frustrating: 'frustrated',
  satisfying: 'satisfied',
  depressing: 'depressed',
  surprising: 'surprised',
  annoying: 'annoyed',
};

/** 기분 형용사 뒤에 올 수 있는 말 — 목적어가 오는 진행형("I'm annoying my brother")을 걸러 준다. */
const FEELING_TAIL = String.raw`(?=\s*(?:[,.!?;:]|$)|\s+(?:because|since|but|and|so|then|today|yesterday|tonight|now|lately|these|all|about|at|in|on|during|after|before|when|while|right|too|though|already)\b)`;

/** 마시는 것 — "eat coffee"는 한국어 "커피를 먹다"의 직역이다. */
const DRINKS: readonly string[] = [
  'coffee', 'tea', 'juice', 'water', 'milk', 'beer', 'wine', 'soju', 'makgeolli',
  'cola', 'coke', 'soda', 'smoothie', 'latte', 'americano', 'lemonade',
];

const DRINK_VERB: Record<string, string> = {
  ate: 'had',
  eat: 'have',
  eats: 'has',
  eating: 'having',
};

const TAKE_VERB: Record<string, string> = {
  ate: 'took',
  eat: 'take',
  eats: 'takes',
  eating: 'taking',
};

const GO_VERB: Record<string, string> = {
  did: 'went',
  do: 'go',
  does: 'goes',
  doing: 'going',
};

/** 몸 상태를 말할 때 자주 나오는 직역 표현의 형용사 */
const CONDITION_NEGATIVE: readonly string[] = ['bad', 'not good', 'terrible', 'awful'];

/** 즐거운 일에는 funny보다 fun이 어울리는 명사들 */
const FUN_NOUNS: readonly string[] = [
  'trip', 'travel', 'vacation', 'holiday', 'weekend', 'camping', 'picnic',
  'hiking', 'festival', 'party', 'date',
];

/** 맛 표현이 겹칠 때 하나만 남긴다 */
const TASTE_WORDS: readonly string[] = ['delicious', 'tasty', 'yummy', 'good', 'nice', 'great'];
const TASTE_CORE = new Set(['delicious', 'tasty', 'yummy']);

/** 한국에서 만들어진 영어 표현 → 영어권 표현 */
const KONGLISH: Record<string, string> = {
  handphone: 'cell phone',
  eyeshopping: 'window shopping',
  selfcamera: 'selfie',
  sns: 'social media',
};

export const EN_NATURAL_RULES: CorrectionRule[] = [
  /* ---------- very 다듬기 ---------- */
  {
    id: 'en-nat-very-very',
    language: 'en',
    severity: 'minor',
    // "It was very very good." → "It was really good."
    // 아래 very 규칙들보다 먼저 처리해야 "very really good" 같은 결과가 나오지 않는다.
    pattern: /\bvery\s+very\b/i,
    replace: 'really',
    explanationKo: 'very를 두 번 쓰기보다 really 한 번이면 느낌이 더 살아나요.',
    reasonKo: 'very very → really',
    keyExpression: {
      expression: 'really good',
      meaningKo: '정말 좋은',
      example: 'The weather was really good today.',
    },
  },
  {
    id: 'en-nat-very-plus-verb',
    language: 'en',
    severity: 'minor',
    // "I very like coffee." → "I really like coffee."
    pattern: new RegExp(String.raw`\bvery\s+(${alt(FEELING_VERBS)})\b`, 'i'),
    replace: 'really $1',
    explanationKo: 'like나 love 같은 동사 앞에는 very 대신 really를 쓰면 훨씬 자연스러워요.',
    reasonKo: '동사 앞에는 really',
    keyExpression: {
      expression: 'really like ~',
      meaningKo: '~를 정말 좋아해요',
      example: 'I really like rainy days.',
    },
  },
  {
    id: 'en-nat-very-strong-adjective',
    language: 'en',
    severity: 'minor',
    // "The pasta was very delicious." → "The pasta was really delicious."
    pattern: new RegExp(String.raw`\bvery\s+(${alt(STRONG_ADJECTIVES)})\b`, 'i'),
    replace: 'really $1',
    explanationKo: 'delicious나 amazing처럼 뜻이 이미 강한 말에는 really가 더 잘 어울려요.',
    reasonKo: '강한 형용사 앞에는 really',
    keyExpression: {
      expression: 'really delicious',
      meaningKo: '정말 맛있는',
      example: 'The soup my mom made was really delicious.',
    },
  },
  {
    id: 'en-nat-too-much-adjective',
    language: 'en',
    severity: 'minor',
    // "It was too much good." → "It was really good."
    pattern: new RegExp(String.raw`\btoo\s+much\s+(${alt(POSITIVE_ADJECTIVES)})\b`, 'i'),
    replace: 'really $1',
    explanationKo: '"너무 좋았어요"처럼 좋은 뜻일 때는 too much보다 really가 잘 어울려요.',
    reasonKo: 'too much + 형용사 → really',
    keyExpression: {
      expression: 'really nice',
      meaningKo: '정말 좋은',
      example: 'The cafe was really nice.',
    },
  },

  /* ---------- 자주 쓰는 말버릇 ---------- */
  {
    id: 'en-nat-so-so',
    language: 'en',
    severity: 'minor',
    // "The movie was so so." → "The movie was okay."
    // 반복 접속사 규칙보다 먼저 두어 "so so"가 "so"로 줄어드는 것을 막는다.
    pattern: /\bso[-\s]so\b(?=\s*(?:[,.!?]|$))/i,
    replace: 'okay',
    explanationKo: '영어에서는 "so so" 대신 okay라고 하면 그저 그런 느낌이 잘 전해져요.',
    reasonKo: 'so so → okay',
    keyExpression: {
      expression: 'It was okay',
      meaningKo: '그저 그랬어요',
      example: 'The movie was okay, but the popcorn was great.',
    },
  },
  {
    id: 'en-nat-i-think-so',
    language: 'en',
    severity: 'minor',
    // "I think so that it was a good day." → "I think that it was a good day."
    pattern: /\b(i)\s+think\s+so\s+(that|i|it|he|she|we|they|you|my|this|the)\b/i,
    replace: '$1 think $2',
    explanationKo: 'I think 뒤에는 하고 싶은 말을 바로 이어 주면 돼요. "I think so."는 상대 말에 맞장구칠 때 써요.',
    reasonKo: 'I think so + 문장 → I think + 문장',
    keyExpression: {
      expression: 'I think (that) ~',
      meaningKo: '~인 것 같아요',
      example: 'I think today was a good day.',
    },
  },
  {
    id: 'en-nat-repeated-conjunction',
    language: 'en',
    severity: 'minor',
    // "I ate lunch and then and then took a walk." → "… and then took a walk."
    pattern: /\b(and\s+then|and|but|so|then|because)\s+\1\b/i,
    replace: '$1',
    explanationKo: '같은 연결어가 두 번 이어졌어요. 한 번만 써도 문장이 매끄럽게 이어져요.',
    reasonKo: '중복된 연결어 정리',
    keyExpression: {
      expression: 'and then ~',
      meaningKo: '그리고 나서 ~',
      example: 'I had dinner and then went for a walk.',
    },
  },

  /* ---------- 한국어 직역 표현 ---------- */
  {
    id: 'en-nat-do-shopping',
    language: 'en',
    severity: 'minor',
    // "I did shopping with my sister." → "I went shopping with my sister."
    pattern: /\b(did|do|does|doing)\s+shopping\b/i,
    replace: (match) => {
      const verb = (match[1] ?? '').toLowerCase();
      const fixed = GO_VERB[verb];
      if (!fixed) return null;
      return `${fixed} shopping`;
    },
    explanationKo: '쇼핑은 go shopping으로 말하면 자연스러워요.',
    reasonKo: 'do shopping → go shopping',
    keyExpression: {
      expression: 'go shopping',
      meaningKo: '쇼핑하러 가다',
      example: 'I went shopping with my sister on Sunday.',
    },
  },
  {
    id: 'en-nat-eat-drink',
    language: 'en',
    severity: 'minor',
    // "I ate a coffee in the morning." → "I had a coffee in the morning."
    pattern: new RegExp(
      String.raw`\b(ate|eat|eats|eating)\s+((?:a|an|the|some|my|one)\s+)?(${alt(DRINKS)})\b` +
        // "coffee beans", "milk bread"처럼 뒤에 명사가 더 붙으면 음식일 수 있으므로 건드리지 않는다.
        String.raw`(?!\s+(?:beans?|cake|cakes|candy|candies|ice|powder|jelly|chocolate|bread|cookie|cookies|donut|donuts|shop|shops|machine|flavored?))`,
      'i',
    ),
    replace: (match) => {
      const verb = (match[1] ?? '').toLowerCase();
      const determiner = match[2] ?? '';
      const drink = match[3] ?? '';
      const fixed = DRINK_VERB[verb];
      if (!fixed || !drink) return null;
      return `${fixed} ${determiner}${drink}`;
    },
    explanationKo: '커피나 차처럼 마시는 것에는 have나 drink를 써요.',
    reasonKo: '마시는 것에는 have / drink',
    keyExpression: {
      expression: 'have a coffee',
      meaningKo: '커피를 한 잔 마시다',
      example: 'I had a coffee with my friend after lunch.',
    },
  },
  {
    id: 'en-nat-eat-medicine',
    language: 'en',
    severity: 'minor',
    // "I ate medicine before bed." → "I took medicine before bed."
    pattern:
      /\b(ate|eat|eats|eating)\s+((?:a|the|my|some)\s+)?(medicine|medicines|pill|pills|vitamin|vitamins|painkiller|painkillers)\b/i,
    replace: (match) => {
      const verb = (match[1] ?? '').toLowerCase();
      const determiner = match[2] ?? '';
      const noun = match[3] ?? '';
      const fixed = TAKE_VERB[verb];
      if (!fixed || !noun) return null;
      return `${fixed} ${determiner}${noun}`;
    },
    explanationKo: '약은 take를 써서 take medicine이라고 해요.',
    reasonKo: '약에는 take',
    keyExpression: {
      expression: 'take medicine',
      meaningKo: '약을 먹다',
      example: 'I took medicine and went to bed early.',
    },
  },
  {
    id: 'en-nat-my-condition',
    language: 'en',
    severity: 'minor',
    // "My condition is good today." → "I feel good today."
    pattern: new RegExp(
      String.raw`\bmy\s+condition\s+(is|was)\s+((?:so|very|really)\s+)?(not\s+good|${alt([
        'good',
        'great',
        'fine',
        'nice',
        'okay',
        'ok',
        'perfect',
        'bad',
        'terrible',
        'awful',
      ])})\b`,
      'i',
    ),
    replace: (match) => {
      const be = (match[1] ?? '').toLowerCase();
      const degree = (match[2] ?? '').toLowerCase();
      const adjective = (match[3] ?? '').toLowerCase().replace(/\s+/g, ' ');
      if (!be || !adjective) return null;
      const isPast = be === 'was';
      if (CONDITION_NEGATIVE.includes(adjective)) {
        return isPast ? "I didn't feel well" : "I don't feel well";
      }
      return isPast ? `I felt ${degree}${adjective}` : `I feel ${degree}${adjective}`;
    },
    explanationKo: '몸 상태나 컨디션은 I feel ~ 로 말하면 자연스러워요.',
    reasonKo: 'my condition is ~ → I feel ~',
    keyExpression: {
      expression: 'I feel good',
      meaningKo: '컨디션이 좋아요',
      example: 'I slept well, so I feel good today.',
    },
  },
  {
    id: 'en-nat-feeling-ing-adjective',
    language: 'en',
    severity: 'minor',
    // "I'm boring." → "I'm bored." / "I was interesting in it." → "I was interested in it."
    pattern: new RegExp(
      String.raw`\b(i|we)((?:\s*['’]m|\s*['’]re|\s+am|\s+was|\s+are|\s+were))\s+((?:so|very|really|super|too|kind\s+of|a\s+bit|a\s+little)\s+)?(${alt(
        Object.keys(ING_TO_ED),
      )})\b` + FEELING_TAIL,
      'i',
    ),
    replace: (match) => {
      const subject = match[1] ?? '';
      const be = match[2] ?? '';
      const degree = match[3] ?? '';
      const adjective = (match[4] ?? '').toLowerCase();
      const fixed = ING_TO_ED[adjective];
      if (!subject || !be || !fixed) return null;
      return `${subject}${be} ${degree}${fixed}`;
    },
    explanationKo: '내 기분은 -ed로, 그 대상이 어떤지는 -ing로 말해요. I\'m bored는 내가 심심한 것, It\'s boring은 그것이 지루한 거예요.',
    reasonKo: '기분을 나타내는 -ed 형태로',
    keyExpression: {
      expression: "I'm bored / It's boring",
      meaningKo: '나는 심심해요 / 그건 지루해요',
      example: "I was bored, so I called my friend.",
    },
  },
  {
    id: 'en-nat-funny-vs-fun',
    language: 'en',
    severity: 'minor',
    // "The trip was so funny." → "The trip was so fun."
    pattern: new RegExp(
      String.raw`\b(${alt(FUN_NOUNS)})\s+(was|is|were|are)\s+((?:so|very|really|super)\s+)?funny\b`,
      'i',
    ),
    replace: '$1 $2 $3fun',
    explanationKo: 'funny는 웃긴 것, fun은 즐거운 것을 뜻해요. 여행이나 파티에는 fun이 잘 어울려요.',
    reasonKo: 'funny → fun (즐거움)',
    keyExpression: {
      expression: 'It was so much fun',
      meaningKo: '정말 재미있었어요',
      example: 'The trip was so much fun.',
    },
  },
  {
    id: 'en-nat-duplicate-taste-word',
    language: 'en',
    severity: 'minor',
    // "The food was good and delicious." → "The food was delicious."
    pattern: new RegExp(String.raw`\b(${alt(TASTE_WORDS)})\s+and\s+(${alt(TASTE_WORDS)})\b`, 'i'),
    replace: (match) => {
      const first = (match[1] ?? '').toLowerCase();
      const second = (match[2] ?? '').toLowerCase();
      if (!first || !second) return null;
      // 맛을 나타내는 말이 하나도 없으면 다른 뜻일 수 있으므로 건드리지 않는다.
      if (!TASTE_CORE.has(first) && !TASTE_CORE.has(second)) return null;
      if (first === second) return first;
      if (TASTE_CORE.has(first) && TASTE_CORE.has(second)) return 'delicious';
      return TASTE_CORE.has(first) ? first : second;
    },
    explanationKo: '비슷한 뜻이 겹칠 때는 하나만 남겨도 맛있는 느낌이 충분히 전해져요.',
    reasonKo: '비슷한 뜻 중복 정리',
    keyExpression: {
      expression: 'It was delicious',
      meaningKo: '정말 맛있었어요',
      example: 'The bread from the new bakery was delicious.',
    },
  },
  {
    id: 'en-nat-promise-plans',
    language: 'en',
    severity: 'minor',
    // "I have a promise with my friend." → "I have plans with my friend."
    pattern: /\b(have|has|had)\s+(?:a\s+)?promise\s+with\b/i,
    replace: '$1 plans with',
    explanationKo: '친구와 만나는 약속은 plans라고 해요. promise는 "꼭 지킬게"라는 다짐에 가까워요.',
    reasonKo: '약속(만남)은 plans',
    keyExpression: {
      expression: 'have plans with ~',
      meaningKo: '~와 만날 약속이 있다',
      example: 'I have plans with my friend this weekend.',
    },
  },
  {
    id: 'en-nat-konglish-word',
    language: 'en',
    severity: 'minor',
    // "I lost my hand phone." → "I lost my cell phone."
    pattern: /\b(hand\s?phone|eye\s?shopping|self\s?camera|SNS)\b/i,
    replace: (match) => {
      const key = (match[1] ?? '').toLowerCase().replace(/\s+/g, '');
      const fixed = KONGLISH[key];
      if (!fixed) return null;
      return fixed;
    },
    explanationKo: '한국에서 쓰는 영어 표현 중에는 영어권에서 다르게 말하는 것들이 있어요.',
    reasonKo: '영어권에서 쓰는 표현으로',
  },
];
