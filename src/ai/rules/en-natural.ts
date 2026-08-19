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

/**
 * 매치 바로 앞 단어 (사이에 공백만 있을 때). 문장부호가 끼어 있으면 빈 문자열.
 * 뒤돌아보기(lookbehind) 없이 앞 문맥을 확인해 오탐을 거르는 데 쓴다.
 */
const wordBefore = (match: RegExpMatchArray): string => {
  const input = match.input ?? '';
  const head = input.slice(0, match.index ?? 0);
  return (/([A-Za-z]+(?:['’][A-Za-z]+)?)\s*$/.exec(head)?.[1] ?? '').toLowerCase();
};

/** 매치 바로 뒤 단어 (사이에 공백만 있을 때). 문장부호가 끼어 있으면 빈 문자열. */
const wordAfter = (match: RegExpMatchArray): string => {
  const input = match.input ?? '';
  const tail = input.slice((match.index ?? 0) + match[0].length);
  return (/^\s+([A-Za-z]+)/.exec(tail)?.[1] ?? '').toLowerCase();
};

/** very는 동사를 꾸미지 못한다 — 한국어 "아주 좋아해"를 직역할 때 자주 나온다. */
const FEELING_VERBS: readonly string[] = [
  'like', 'likes', 'liked', 'love', 'loves', 'loved', 'hate', 'hates', 'hated',
  'want', 'wants', 'wanted', 'need', 'needs', 'needed', 'enjoy', 'enjoys', 'enjoyed',
  'miss', 'misses', 'missed', 'thank', 'thanks', 'thanked', 'appreciate', 'appreciates',
  'appreciated', 'hope', 'hopes', 'hoped', 'prefer', 'prefers', 'preferred',
  'agree', 'agrees', 'agreed', 'respect', 'respects', 'respected', 'admire', 'admires',
  'admired', 'recommend', 'recommends', 'recommended', 'understand', 'understands',
];

/**
 * "very + 동사" 규칙에서 앞 단어가 이것들이면 뒤는 동사가 아니라 형용사로 쓰인 과거분사다.
 * "He is a very respected doctor" / "Your help is very appreciated"처럼 이미 맞는 문장을
 * 건드리지 않기 위한 안전장치.
 */
const NOT_SUBJECT_BEFORE_VERY: ReadonlySet<string> = new Set([
  // be동사·연결동사 뒤 → 수동/형용사 자리
  'is', 'are', 'am', 'was', 'were', 'be', 'been', 'being',
  'get', 'gets', 'got', 'gotten', 'feel', 'feels', 'felt', 'seem', 'seems', 'seemed',
  'look', 'looks', 'looked', 'sound', 'sounds', 'sounded',
  'become', 'becomes', 'became', 'stay', 'stays', 'stayed', 'remain', 'remains',
  // 관사·소유격·지시어 뒤 → 명사를 꾸미는 자리
  'a', 'an', 'the', 'my', 'your', 'his', 'her', 'our', 'their', 'its',
  'this', 'that', 'these', 'those', 'some', 'any', 'no', 'every', 'another',
]);

/**
 * 이미 뜻이 강해서 very와 잘 어울리지 않는 형용사.
 * very tired, very hot처럼 정상인 조합은 물론, very fun / very tiny처럼 원어민도 흔히 쓰는
 * 조합(= 고치면 오탐)도 목록에서 뺐다.
 */
const STRONG_ADJECTIVES: readonly string[] = [
  'delicious', 'amazing', 'awesome', 'perfect', 'huge', 'enormous',
  'freezing', 'boiling', 'exhausted', 'starving', 'terrible', 'awful', 'horrible',
  'fantastic', 'wonderful', 'excellent', 'gorgeous', 'furious', 'hilarious',
  'brilliant', 'stunning', 'impossible',
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

/**
 * 기분 형용사 뒤에 올 수 있는 말 — 목적어가 오는 진행형("I'm annoying my brother")을 걸러 준다.
 * 마지막 갈래(전치사)는 캡처해 두고, 단어별로 어울리는 전치사인지 다시 확인한다.
 * "I'm boring at parties"(내가 재미없는 사람이라는 뜻, 정상)까지 고쳐 버리지 않기 위해서다.
 */
const FEELING_TAIL = String.raw`(?=\s*(?:[,.!?;:]|$)|\s+(?:because|since|but|and|so|then|today|yesterday|tonight|now|lately|these|all|during|after|before|when|while|right|too|though|already)\b|\s+(about|at|in|on|by|with)\b)`;

/**
 * -ed 형태가 자연스럽게 취하는 전치사만 허용한다 (interested in, excited about …).
 * 목록이 비어 있으면 전치사가 따라올 때는 아예 손대지 않는다.
 */
const FEELING_PREPOSITIONS: Record<string, readonly string[]> = {
  interesting: ['in', 'about'],
  exciting: ['about'],
  confusing: ['about', 'by'],
  disappointing: ['about', 'with', 'in', 'by'],
  embarrassing: ['about', 'by'],
  frustrating: ['about', 'with', 'by'],
  satisfying: ['with', 'by'],
  annoying: ['about', 'with', 'by'],
  surprising: ['about', 'at', 'by'],
  depressing: ['about'],
  // "I'm boring in class" / "I'm tiring at work"는 -ing 뜻으로도 읽히므로 건드리지 않는다.
  boring: [],
  tiring: [],
};

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

/** shopping 뒤에 오면 "쇼핑하다"가 아니라 명사를 꾸미는 말이다 (shopping mall …) */
const SHOPPING_COMPOUND_NOUNS: ReadonlySet<string> = new Set([
  'mall', 'malls', 'center', 'centers', 'centre', 'centres', 'cart', 'carts',
  'bag', 'bags', 'basket', 'baskets', 'list', 'lists', 'spree', 'sprees',
  'app', 'apps', 'site', 'sites', 'website', 'websites', 'street', 'streets',
  'district', 'districts', 'season', 'seasons', 'habit', 'habits', 'addiction',
]);

const GO_VERB: Record<string, string> = {
  did: 'went',
  do: 'go',
  does: 'goes',
  doing: 'going',
};

/** 몸 상태를 말할 때 자주 나오는 직역 표현의 형용사 */
const CONDITION_NEGATIVE: readonly string[] = ['bad', 'not good', 'terrible', 'awful'];

/**
 * 즐거운 일에는 funny보다 fun이 어울리는 명사들.
 * date는 "만남"과 "날짜" 둘 다여서, 또 실제로 웃긴 데이트도 있어서 뺐다.
 */
const FUN_NOUNS: readonly string[] = [
  'trip', 'travel', 'vacation', 'holiday', 'weekend', 'camping', 'picnic',
  'hiking', 'festival', 'party',
];

/** 맛 표현이 겹칠 때 하나만 남긴다 */
const TASTE_WORDS: readonly string[] = ['delicious', 'tasty', 'yummy', 'good', 'nice', 'great'];
const TASTE_CORE = new Set(['delicious', 'tasty', 'yummy']);

/** 이 말 뒤의 hand는 "손"이 아니라 앞말과 한 덩어리다 (second hand phone = 중고폰) */
const HAND_MODIFIERS: ReadonlySet<string> = new Set([
  'second', '2nd', 'used', 'left', 'right', 'minute', 'hour', 'other', 'free', 'first',
]);

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
    // 앞에 주어가 있을 때만 동사로 본다. "is very appreciated", "a very respected doctor"처럼
    // 과거분사가 형용사로 쓰인 정상 문장은 건너뛴다.
    pattern: new RegExp(String.raw`\bvery\s+(${alt(FEELING_VERBS)})\b`, 'i'),
    replace: (match) => {
      const verb = match[1] ?? '';
      const before = wordBefore(match);
      if (!verb) return null;
      // 문장 첫머리("Very appreciated!")나 be동사·관사 뒤면 동사 자리가 아니다.
      if (!before || NOT_SUBJECT_BEFORE_VERY.has(before)) return null;
      // "It's very appreciated", "They're very missed" 같은 축약형 뒤도 마찬가지다.
      if (/['’](s|re|m|ve|d|ll)$/.test(before)) return null;
      return `really ${verb}`;
    },
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
    // be동사 뒤이면서 형용사에서 절이 끝날 때만 고친다. "I ate too much good food"처럼
    // too much가 뒤의 명사를 꾸미는 정상 문장을 건드리지 않기 위해서다.
    pattern: new RegExp(
      String.raw`\b(was|is|were|are|am|be|been|felt|feels?|looks?|looked|tastes?|tasted|seems?|seemed|['’]s|['’]m|['’]re)\s+too\s+much\s+(${alt(
        POSITIVE_ADJECTIVES,
      )})\b` +
        String.raw`(?=\s*(?:[,.!?;:]|$)|\s+(?:but|and|so|because|though|today|yesterday|tonight)\b)`,
      'i',
    ),
    replace: '$1 really $2',
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
    // so는 뺐다 — "I was so so tired"는 강조 반복(정상)이라 줄이면 뜻이 옅어진다.
    pattern: /\b(and\s+then|and|but|then|because)\s+\1\b/i,
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
      // "Did shopping malls exist?"처럼 shopping이 뒤 명사를 꾸미는 경우는 동사구가 아니다.
      if (SHOPPING_COMPOUND_NOUNS.has(wordAfter(match))) return null;
      // "Did shopping become popular?" — 문장 첫머리의 의문문 did는 조동사다.
      const isQuestion = /\?\s*$/.test(match.input ?? '');
      if (!wordBefore(match) && isQuestion && verb !== 'doing') return null;
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
        // "coffee beans", "milk bread", "water melon"처럼 뒤에 명사가 더 붙으면
        // 마시는 것이 아니라 먹는 것이므로 건드리지 않는다.
        String.raw`(?!\s+(?:beans?|cake|cakes|candy|candies|ice|powder|jelly|chocolate|bread|cookie|cookies|donut|donuts|shop|shops|machine|flavored?` +
        String.raw`|melons?|buns?|gums?|bottles?|parks?|leaf|leaves|pudding|puddings|pie|pies|tart|tarts` +
        String.raw`|jam|sauce|soup|rolls?|toast|biscuits?|pancakes?|muffins?|sandwich|sandwiches|steak|stew|salad|noodles?))`,
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
      const preposition = (match[5] ?? '').toLowerCase();
      const fixed = ING_TO_ED[adjective];
      if (!subject || !be || !fixed) return null;
      // 뒤에 전치사가 오면 -ed 형태와 어울리는 짝일 때만 고친다 (interested in ✓ / boring at ✗)
      if (preposition && !(FEELING_PREPOSITIONS[adjective] ?? []).includes(preposition)) return null;
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
    // 농담·웃음 이야기가 함께 나오면 정말 "웃겼다"는 뜻이므로 그대로 둔다.
    skipIf: /\b(joke|jokes|joking|laugh|laughs|laughed|laughing|comedian|comedy|humor|humour|pun|puns|hilarious)\b/i,
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
      // "second hand phone"(중고폰), "minute hand"처럼 hand가 앞말과 붙는 경우는 다른 뜻이다.
      if (key === 'handphone' && HAND_MODIFIERS.has(wordBefore(match))) return null;
      return fixed;
    },
    explanationKo: '한국에서 쓰는 영어 표현 중에는 영어권에서 다르게 말하는 것들이 있어요.',
    reasonKo: '영어권에서 쓰는 표현으로',
  },
];
