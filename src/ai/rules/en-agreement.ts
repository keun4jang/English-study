import { CorrectionRule } from './types';

/**
 * 영어 주어-동사 일치 / be동사 / 문장 구조 규칙.
 *
 * 한국어는 주어를 자주 생략하고 동사 어미가 인칭에 따라 변하지 않기 때문에
 * "He go", "I happy", "So tired", "because very hot" 같은 형태가 자주 나온다.
 *
 * 설계 원칙
 * - 정상 문장을 절대 건드리지 않는다. 조금이라도 애매하면 null을 돌려 규칙을 건너뛴다.
 * - 동사/형용사는 모두 화이트리스트로만 판단한다. 목록에 없으면 손대지 않는다.
 * - 대명사 바로 앞 단어를 함께 캡처해서 의문문(Does he ...?)·사역구문(make it work)·
 *   목적격 it(take it easy)에는 규칙이 걸리지 않게 막는다.
 * - 주어를 새로 넣는 규칙은 문장에 이미 주어가 있으면(skipIf) 적용하지 않는다.
 * - 과거 시점 표현이 있으면 현재형을 만들어내는 규칙은 모두 건너뛴다(시제 규칙에 맡긴다).
 * - 명령문(Please come, Don't worry, Let's go)과 의문문은 건드리지 않는다.
 */

/* ------------------------------------------------------------------ */
/* 공통 도우미                                                          */
/* ------------------------------------------------------------------ */

/** 긴 단어가 먼저 매치되도록 정렬한 정규식 대안 문자열 */
function alt(words: readonly string[]): string {
  return [...words].sort((a, b) => b.length - a.length).join('|');
}

/** 과거 시점 표현. 있으면 "현재형을 만들어내는" 규칙은 적용하지 않는다. */
const PAST_MARKER =
  /\b(yesterday|ago|last\s+(night|week|weekend|month|year|summer|winter|spring|fall|autumn)|the\s+day\s+before\s+yesterday|the\s+other\s+day|this\s+morning|this\s+afternoon|earlier\s+today)\b/i;

/**
 * that절 가정법 문맥. "It is important that he go home."처럼
 * 일부러 원형을 쓰는 정상 문장을 지키기 위해 3인칭 -s 규칙을 건너뛴다.
 */
const SUBJUNCTIVE_CONTEXT =
  /\b(important|necessary|essential|crucial|vital|suggest(?:s|ed)?|recommend(?:s|ed)?|insist(?:s|ed)?|demand(?:s|ed)?|propose[sd]?|request(?:s|ed)?)\b[\s\S]*\bthat\b/i;

/** 3인칭 단수 현재형 교정을 건너뛸 문맥 (과거 시점 표현 + that절 가정법) */
const SKIP_PRESENT_S = new RegExp(
  `${PAST_MARKER.source}|${SUBJUNCTIVE_CONTEXT.source}`,
  'i',
);

/**
 * 대명사(he/she/it) 바로 앞에 오면 규칙을 적용하지 않는 단어들.
 * 의문문(Did he go?), 조동사(He can go), 사역·지각동사(make it work, take it easy),
 * be동사(Is it good?) 같은 정상 문장을 보호한다.
 */
const BLOCKING_WORDS = new Set<string>([
  // 조동사 / 의문문
  'do', 'does', 'did', "don't", "doesn't", "didn't",
  'will', "won't", 'would', "wouldn't", 'can', "can't", 'cannot',
  'could', "couldn't", 'shall', 'should', "shouldn't",
  'may', 'might', 'must', "mustn't", 'to', 'than',
  // be동사 / 완료
  'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', "haven't", "hasn't", "hadn't",
  // 목적어 + 동사원형 / 목적격 보어 구문
  'let', 'lets', 'make', 'makes', 'made', 'help', 'helps', 'helped',
  'watch', 'watches', 'watched', 'see', 'sees', 'saw', 'hear', 'hears', 'heard',
  'feel', 'feels', 'felt', 'keep', 'keeps', 'kept', 'get', 'gets', 'got',
  'want', 'wants', 'wanted', 'wish', 'wishes', 'wished',
  'find', 'finds', 'found', 'leave', 'leaves', 'left',
  'call', 'calls', 'called', 'consider', 'considers', 'considered',
  'like', 'likes', 'liked', 'take', 'takes', 'took',
  'play', 'plays', 'played', 'think', 'thinks', 'thought',
  'turn', 'turns', 'turned',
  // that절 가정법 (It is important that he go ...)
  'suggest', 'suggests', 'suggested', 'insist', 'insists', 'insisted',
  'recommend', 'recommends', 'recommended', 'demand', 'demands', 'demanded',
  'require', 'requires', 'required', 'request', 'requests', 'requested',
]);

/** 대명사 앞 단어가 규칙을 막아야 하는 단어인지 */
function blocked(word: string): boolean {
  if (!word) return false;
  return BLOCKING_WORDS.has(word.toLowerCase());
}

/** 대명사 바로 앞 단어를 선택적으로 잡아두는 조각 (오탐 방지용) */
const LEAD = String.raw`(?:([A-Za-z']+)\s+)?`;

/** 정도 부사 (선택) */
const DEGREE = String.raw`(?:(?:so|very|really|too|quite|super|pretty|a\s+little|a\s+bit)\s+)?`;

/* ------------------------------------------------------------------ */
/* 동사 목록                                                            */
/* ------------------------------------------------------------------ */

/**
 * 3인칭 단수 -s를 붙일 수 있는 동사원형.
 * 과거형이 원형과 같은 동사(cost, put, read, hit, cut, set ...)는
 * "It cost 10 dollars"처럼 정상 과거 문장을 망칠 수 있어 제외했다.
 */
const BASE_VERBS: readonly string[] = [
  'go', 'come', 'make', 'take', 'get', 'give', 'like', 'love', 'hate', 'want',
  'need', 'know', 'think', 'say', 'tell', 'ask', 'answer', 'work', 'live',
  'look', 'seem', 'sound', 'taste', 'smell', 'matter', 'belong', 'eat', 'drink',
  'sleep', 'study', 'play', 'watch', 'listen', 'write', 'help', 'run', 'walk',
  'talk', 'call', 'start', 'finish', 'cook', 'clean', 'sing', 'dance', 'drive',
  'ride', 'buy', 'sell', 'wait', 'stay', 'arrive', 'happen', 'mean', 'keep',
  'become', 'try', 'use', 'learn', 'teach', 'speak', 'smile', 'laugh', 'cry',
  'worry', 'remember', 'forget', 'understand', 'believe', 'hope', 'enjoy',
  'miss', 'meet', 'visit', 'travel', 'exercise', 'rest', 'wake', 'open',
  'close', 'sit', 'stand', 'wear', 'send', 'bring', 'change', 'move', 'save',
  'spend', 'win', 'lose', 'grow', 'show', 'choose', 'decide', 'agree', 'care',
  'prefer', 'practice', 'prepare', 'rain', 'snow', 'text',
];

/** 3인칭 단수 현재형 만들기 */
function thirdPersonForm(base: string): string {
  const lower = base.toLowerCase();
  if (lower === 'have') return 'has';
  if (lower === 'be') return 'is';
  if (/(?:s|sh|ch|x|z|o)$/.test(lower)) return `${lower}es`;
  if (/[^aeiou]y$/.test(lower)) return `${lower.slice(0, -1)}ies`;
  return `${lower}s`;
}

/**
 * be동사 뒤에 원형이 오면 진행형으로 고칠 동작 동사 (원형 → -ing).
 * 철자 변화가 불규칙해서 표로 관리한다.
 */
const ING_FORMS: Record<string, string> = {
  go: 'going', come: 'coming', eat: 'eating', drink: 'drinking',
  study: 'studying', work: 'working', play: 'playing', watch: 'watching',
  read: 'reading', write: 'writing', sleep: 'sleeping', run: 'running',
  walk: 'walking', wait: 'waiting', cook: 'cooking', clean: 'cleaning',
  learn: 'learning', listen: 'listening', travel: 'traveling', drive: 'driving',
  ride: 'riding', swim: 'swimming', sing: 'singing', dance: 'dancing',
  talk: 'talking', meet: 'meeting', take: 'taking', make: 'making',
  use: 'using', prepare: 'preparing', practice: 'practicing', look: 'looking',
  leave: 'leaving', stay: 'staying', live: 'living', wear: 'wearing',
  buy: 'buying', try: 'trying', think: 'thinking', plan: 'planning',
  move: 'moving', help: 'helping', teach: 'teaching', call: 'calling',
  visit: 'visiting', rest: 'resting', relax: 'relaxing', shop: 'shopping',
  exercise: 'exercising', sit: 'sitting', stand: 'standing', start: 'starting',
  finish: 'finishing', draw: 'drawing', wash: 'washing', send: 'sending',
  cry: 'crying', smile: 'smiling', laugh: 'laughing', jog: 'jogging',
};

/**
 * 진행형으로 쓰지 않는 상태 동사. be동사를 빼고 일반동사로 고친다.
 * "It is like a dream"처럼 정상인 표현이 있는 like, mean, seem 등은 넣지 않았다.
 */
const STATIVE_PRESENT_S: Record<string, string> = {
  love: 'loves', hate: 'hates', want: 'wants', need: 'needs', know: 'knows',
  understand: 'understands', remember: 'remembers', forget: 'forgets',
  believe: 'believes', hope: 'hopes', prefer: 'prefers', agree: 'agrees',
  have: 'has',
};

const STATIVE_PAST: Record<string, string> = {
  love: 'loved', hate: 'hated', want: 'wanted', need: 'needed', know: 'knew',
  understand: 'understood', remember: 'remembered', forget: 'forgot',
  believe: 'believed', hope: 'hoped', prefer: 'preferred', agree: 'agreed',
  have: 'had',
};

/** did / didn't 뒤에 과거형이 온 경우 되돌릴 원형 (과거형 → 원형) */
const PAST_TO_BASE: Record<string, string> = {
  went: 'go', came: 'come', ate: 'eat', drank: 'drink', saw: 'see',
  met: 'meet', took: 'take', got: 'get', gave: 'give', made: 'make',
  bought: 'buy', brought: 'bring', thought: 'think', taught: 'teach',
  found: 'find', felt: 'feel', kept: 'keep', slept: 'sleep', left: 'leave',
  lost: 'lose', won: 'win', ran: 'run', sang: 'sing', wrote: 'write',
  knew: 'know', told: 'tell', said: 'say', spent: 'spend', sent: 'send',
  had: 'have', studied: 'study', watched: 'watch', played: 'play',
  worked: 'work', finished: 'finish',
};

/* ------------------------------------------------------------------ */
/* 형용사 목록                                                          */
/* ------------------------------------------------------------------ */

/** 사람의 상태를 나타내는 형용사 → 주어가 없으면 I'm을 붙인다 */
const SELF_ADJECTIVES: readonly string[] = [
  'tired', 'sleepy', 'hungry', 'thirsty', 'busy', 'sick', 'happy', 'sad',
  'angry', 'upset', 'nervous', 'anxious', 'excited', 'glad', 'proud',
  'lonely', 'bored', 'afraid', 'scared', 'worried', 'thankful', 'grateful',
  'sorry', 'stressed', 'exhausted', 'embarrassed', 'confused', 'jealous',
  'curious', 'disappointed', 'satisfied', 'surprised', 'shy', 'lucky',
  'relieved', 'refreshed', 'motivated', 'hopeful', 'depressed', 'frustrated',
  'annoyed', 'dizzy', 'full', 'ready',
];

/** 날씨·환경을 나타내는 표현 → 주어가 없으면 It's를 붙인다 */
const WEATHER_ADJECTIVES: readonly string[] = [
  'hot', 'cold', 'cool', 'warm', 'chilly', 'humid', 'rainy', 'sunny',
  'cloudy', 'windy', 'snowy', 'foggy', 'freezing', 'dark', 'bright',
  'noisy', 'quiet', 'crowded', 'raining', 'snowing', 'pouring',
];

/**
 * 주어(대명사) 뒤에 be동사가 빠졌을 때 넣어줄 형용사.
 * clean, open, free, warm, clear, long처럼 동사로도 쓰이는 단어는
 * "I clean my room" 같은 정상 문장을 지키기 위해 제외했다.
 */
const BE_ADJECTIVES: readonly string[] = [
  ...SELF_ADJECTIVES,
  'hot', 'cold', 'chilly', 'humid', 'rainy', 'sunny', 'cloudy', 'windy',
  'snowy', 'foggy', 'freezing', 'dark', 'bright', 'noisy', 'crowded', 'quiet',
  'good', 'great', 'bad', 'nice', 'fine', 'okay', 'ok', 'beautiful', 'pretty',
  'cute', 'delicious', 'tasty', 'yummy', 'sweet', 'salty', 'spicy',
  'difficult', 'easy', 'hard', 'wonderful', 'amazing', 'awesome', 'terrible',
  'awful', 'funny', 'interesting', 'boring', 'important', 'comfortable',
  'uncomfortable', 'safe', 'healthy', 'strong', 'weak', 'young', 'old', 'new',
  'perfect', 'serious', 'kind', 'smart', 'honest', 'helpful', 'useful',
  'special', 'strange', 'weird', 'different', 'similar', 'fun', 'alone',
  'expensive', 'cheap', 'small', 'big', 'short', 'tall', 'late', 'early',
  'dirty', 'loud', 'heavy',
];

/** 주어 없이 문장이 시작될 때 뒤에 이어질 수 있는 말 (오탐 방지용 확인) */
const SELF_TAIL = String.raw`(?=[.,!?;]|\s+(?:today|tonight|now|right\s+now|again|all\s+day|lately|these\s+days|and|but|so|because|since|after|from|of|though|too|as\s+well|already)\b|$)`;

const WEATHER_TAIL = String.raw`(?=[.,!?;]|\s+(?:today|tonight|outside|here|again|all\s+day|a\s+lot|hard|this\s+(?:morning|afternoon|evening)|in\s+the\s+(?:morning|afternoon|evening)|at\s+night|these\s+days|lately|and|but|so|though|because|since)\b|$)`;

/** 이미 주어가 있으면 주어를 새로 붙이지 않는다 */
const HAS_SUBJECT =
  /\b(i|we|you|they|he|she|it|there|this|that|these|those|my|our|your|his|her|their)\b/i;

/** 문장 앞에 올 수 있는 시간 표현 (주어 보충 규칙에서 그대로 살려둔다) */
const LEADING_TIME = String.raw`(?:(?:yesterday|today|tonight|this\s+morning|this\s+afternoon|this\s+evening|last\s+night|last\s+weekend|last\s+week|after\s+work|after\s+school|in\s+the\s+morning|in\s+the\s+afternoon)\s*,?\s+)?`;

/** 주어 없이 문장을 시작하는 과거형 동사들 (left처럼 명사로도 읽히는 단어는 제외) */
const PAST_STARTERS: readonly string[] = [
  'went', 'ate', 'had', 'saw', 'met', 'bought', 'watched', 'studied', 'worked',
  'played', 'slept', 'cooked', 'walked', 'talked', 'drank', 'finished',
  'started', 'visited', 'took', 'made', 'got', 'felt', 'woke', 'came', 'wrote',
  'called', 'cleaned', 'learned', 'listened', 'traveled', 'arrived', 'stayed',
  'enjoyed', 'helped', 'tried', 'decided', 'thought', 'remembered', 'forgot',
  'found', 'lost', 'won', 'ran', 'cried', 'laughed', 'smiled', 'rested',
  'relaxed', 'exercised', 'shopped', 'prepared', 'practiced', 'drove', 'rode',
  'swam', 'sang', 'danced', 'wore', 'brought', 'sent', 'told', 'asked',
  'answered', 'changed', 'opened', 'closed', 'moved', 'missed', 'waited',
  'needed', 'wanted', 'liked', 'loved', 'hated', 'spent', 'ordered',
  'packed', 'washed', 'checked', 'joined', 'returned', 'graduated',
];

/* ------------------------------------------------------------------ */
/* 규칙                                                                 */
/* ------------------------------------------------------------------ */

export const EN_AGREEMENT_RULES: CorrectionRule[] = [
  /* ---------- 주어가 없는 문장 ---------- */
  {
    id: 'en-agr-subject-missing-past-verb',
    language: 'en',
    severity: 'major',
    // "Went to school." → "I went to school."
    pattern: new RegExp(
      String.raw`^(${LEADING_TIME})(${alt(PAST_STARTERS)})\b(?!\s+(?:i|you|he|she|it|we|they)\b)(?=\s+\S)`,
      'i',
    ),
    replace: (match) => {
      const lead = match[1] ?? '';
      const verb = match[2] ?? '';
      if (!verb) return null;
      return `${lead}I ${verb.toLowerCase()}`;
    },
    explanationKo: '영어는 주어를 꼭 써요. 내가 한 일이면 앞에 I를 붙여 주면 문장이 완성돼요.',
    reasonKo: '주어 I 추가',
    keyExpression: {
      expression: 'I went to ~',
      meaningKo: '~에 갔어요',
      example: 'I went to the library after work.',
    },
    // "Made in Korea, this bag is nice." 처럼 분사구문으로 시작하는 문장은 건드리지 않는다
    skipIf: /,\s*(i|you|he|she|it|we|they|this|that|these|those|my|the)\b/i,
  },
  {
    id: 'en-agr-subject-missing-self-adjective',
    language: 'en',
    severity: 'major',
    // "So tired today." → "I'm so tired today."
    pattern: new RegExp(String.raw`^(${DEGREE})(${alt(SELF_ADJECTIVES)})\b${SELF_TAIL}`, 'i'),
    replace: (match) => {
      const degree = (match[1] ?? '').toLowerCase();
      const adjective = (match[2] ?? '').toLowerCase();
      if (!adjective) return null;
      return `I'm ${degree}${adjective}`;
    },
    explanationKo: '기분이나 몸 상태를 말할 때는 앞에 I\'m을 붙이면 완전한 문장이 돼요.',
    reasonKo: "주어 + be동사 (I'm) 추가",
    keyExpression: {
      expression: "I'm so tired",
      meaningKo: '너무 피곤해요',
      example: "I'm so tired today.",
    },
    skipIf: new RegExp(`${HAS_SUBJECT.source}|${PAST_MARKER.source}`, 'i'),
  },
  {
    id: 'en-agr-subject-missing-weather',
    language: 'en',
    severity: 'major',
    // "Very hot today." → "It's very hot today."
    pattern: new RegExp(String.raw`^(${DEGREE})(${alt(WEATHER_ADJECTIVES)})\b${WEATHER_TAIL}`, 'i'),
    replace: (match) => {
      const degree = (match[1] ?? '').toLowerCase();
      const word = (match[2] ?? '').toLowerCase();
      if (!word) return null;
      return `It's ${degree}${word}`;
    },
    explanationKo: '날씨나 상황을 말할 때는 It\'s로 시작하면 자연스러워요.',
    reasonKo: "주어 It's 추가 (날씨·상황)",
    keyExpression: {
      expression: "It's very hot",
      meaningKo: '아주 더워요',
      example: "It's very hot today.",
    },
    skipIf: new RegExp(`${HAS_SUBJECT.source}|${PAST_MARKER.source}`, 'i'),
  },
  {
    id: 'en-agr-because-missing-subject',
    language: 'en',
    severity: 'major',
    // "because very hot" → "because it's very hot"
    pattern: new RegExp(
      String.raw`\bbecause\s+(${DEGREE})(${alt([...SELF_ADJECTIVES, ...WEATHER_ADJECTIVES])})\b${SELF_TAIL}`,
      'i',
    ),
    replace: (match) => {
      const degree = (match[1] ?? '').toLowerCase();
      const adjective = (match[2] ?? '').toLowerCase();
      if (!adjective) return null;
      const subject = WEATHER_ADJECTIVES.includes(adjective) ? "it's" : "I'm";
      return `because ${subject} ${degree}${adjective}`;
    },
    explanationKo: 'because 뒤에도 주어와 동사가 필요해요. it\'s나 I\'m을 넣어 주면 문장이 이어져요.',
    reasonKo: 'because 뒤 주어 + be동사 추가',
    keyExpression: {
      expression: "because it's ~",
      meaningKo: '~하기 때문에',
      example: "I stayed home because it's very hot.",
    },
    skipIf: PAST_MARKER,
  },

  /* ---------- be동사 ---------- */
  {
    id: 'en-agr-missing-be-adjective',
    language: 'en',
    severity: 'major',
    // "I happy." → "I am happy." / "It good." → "It is good."
    pattern: new RegExp(
      String.raw`${LEAD}\b(i|you|we|they|he|she|it)\s+(${DEGREE})(${alt(BE_ADJECTIVES)})\b`,
      'i',
    ),
    replace: (match) => {
      const lead = match[1] ?? '';
      const subject = match[2] ?? '';
      const degree = (match[3] ?? '').toLowerCase();
      const adjective = (match[4] ?? '').toLowerCase();
      if (!subject || !adjective) return null;
      if (blocked(lead)) return null;
      const lower = subject.toLowerCase();
      const be = lower === 'i' ? 'am' : lower === 'you' || lower === 'we' || lower === 'they' ? 'are' : 'is';
      const prefix = lead ? `${lead} ` : '';
      return `${prefix}${subject} ${be} ${degree}${adjective}`;
    },
    explanationKo: '형용사 앞에는 be동사가 필요해요. I는 am, he/she/it은 is, you/we/they는 are를 써요.',
    reasonKo: 'be동사 추가',
    keyExpression: {
      expression: 'I am + 형용사',
      meaningKo: '나는 ~해요',
      example: 'I am happy today.',
    },
    skipIf: PAST_MARKER,
  },
  {
    id: 'en-agr-be-plus-base-verb',
    language: 'en',
    severity: 'major',
    // "I am go to school." → "I am going to school."
    pattern: new RegExp(
      String.raw`\b(i|you|we|they|he|she)\s+(am|are|is|was|were)\s+(${alt(Object.keys(ING_FORMS))})\b`,
      'i',
    ),
    replace: (match) => {
      const subject = match[1] ?? '';
      const be = match[2] ?? '';
      const verb = (match[3] ?? '').toLowerCase();
      const ing = ING_FORMS[verb];
      if (!subject || !be || !ing) return null;
      return `${subject} ${be} ${ing}`;
    },
    explanationKo: 'be동사 뒤에 동사가 오면 -ing를 붙여요. 지금 하고 있는 일을 말할 때 이렇게 써요.',
    reasonKo: 'be동사 + 동사ing',
    keyExpression: {
      expression: 'I am going',
      meaningKo: '가고 있어요',
      example: 'I am going to school now.',
    },
  },
  {
    id: 'en-agr-be-plus-stative-verb',
    language: 'en',
    severity: 'major',
    // "I am want a coffee." → "I want a coffee."
    pattern: new RegExp(
      String.raw`\b(i|you|we|they|he|she)\s+(am|are|is|was|were)\s+(${alt(Object.keys(STATIVE_PRESENT_S))})\b`,
      'i',
    ),
    replace: (match) => {
      const subject = match[1] ?? '';
      const be = (match[2] ?? '').toLowerCase();
      const verb = (match[3] ?? '').toLowerCase();
      if (!subject || !verb) return null;
      const isPast = be === 'was' || be === 'were';
      const lower = subject.toLowerCase();
      const form = isPast
        ? STATIVE_PAST[verb]
        : lower === 'he' || lower === 'she'
          ? STATIVE_PRESENT_S[verb]
          : verb;
      if (!form) return null;
      return `${subject} ${form}`;
    },
    explanationKo: 'want, know, love 같은 동사는 be동사 없이 혼자 써요.',
    reasonKo: 'be동사 없이 일반동사만',
    keyExpression: {
      expression: 'I want ~',
      meaningKo: '~을 원해요',
      example: 'I want a cup of coffee.',
    },
  },
  {
    id: 'en-agr-be-form-mismatch',
    language: 'en',
    severity: 'major',
    // "They is happy." → "They are happy." / "We was tired." → "We were tired."
    pattern: /\b(i|he|she|it|we|they|you)\s+(am|is|are|was|were)\b/i,
    replace: (match) => {
      const subject = match[1] ?? '';
      const be = (match[2] ?? '').toLowerCase();
      if (!subject || !be) return null;
      const lower = subject.toLowerCase();
      const plural = lower === 'we' || lower === 'they' || lower === 'you';
      if (be === 'was' || be === 'were') {
        // if I were / if he were 같은 가정법은 건드리지 않는다
        if (plural && be === 'was') return `${subject} were`;
        return null;
      }
      const expected = lower === 'i' ? 'am' : plural ? 'are' : 'is';
      if (be === expected) return null;
      return `${subject} ${expected}`;
    },
    explanationKo: 'be동사는 주어에 맞춰 써요. I는 am, he/she/it은 is, you/we/they는 are예요.',
    reasonKo: '주어에 맞는 be동사',
    keyExpression: {
      expression: 'They are ~',
      meaningKo: '그들은 ~해요',
      example: 'They are my close friends.',
    },
  },
  {
    id: 'en-agr-there-is-plural',
    language: 'en',
    severity: 'major',
    // "There is many people." → "There are many people."
    pattern:
      /\b(there)\s+(is|was)\s+((?:so\s+|too\s+)?(?:many|several|a\s+few|few|two|three|four|five|six|seven|eight|nine|ten|\d+)\b)/i,
    replace: (match) => {
      const there = match[1] ?? '';
      const be = (match[2] ?? '').toLowerCase();
      const rest = match[3] ?? '';
      if (!there || !be || !rest) return null;
      return `${there} ${be === 'is' ? 'are' : 'were'} ${rest}`;
    },
    explanationKo: '뒤에 오는 것이 여럿이면 There is 대신 There are를 써요.',
    reasonKo: '복수 명사 앞은 There are',
    keyExpression: {
      expression: 'There are many ~',
      meaningKo: '~이 많이 있어요',
      example: 'There are many people at the park.',
    },
  },

  /* ---------- 3인칭 단수 ---------- */
  {
    id: 'en-agr-third-person-dont',
    language: 'en',
    severity: 'major',
    // "He don't like coffee." → "He doesn't like coffee."
    pattern: new RegExp(String.raw`${LEAD}\b(he|she|it)\s+(don't|do\s+not)\b`, 'i'),
    replace: (match) => {
      const lead = match[1] ?? '';
      const subject = match[2] ?? '';
      const negative = match[3] ?? '';
      if (!subject || !negative) return null;
      if (blocked(lead)) return null;
      const prefix = lead ? `${lead} ` : '';
      const fixed = negative.includes(' ') ? 'does not' : "doesn't";
      return `${prefix}${subject} ${fixed}`;
    },
    explanationKo: "he, she, it 뒤에서는 don't 대신 doesn't를 써요.",
    reasonKo: "3인칭 단수는 doesn't",
    keyExpression: {
      expression: "He doesn't ~",
      meaningKo: '그는 ~하지 않아요',
      example: "He doesn't drink coffee at night.",
    },
    skipIf: SKIP_PRESENT_S,
  },
  {
    id: 'en-agr-plural-doesnt',
    language: 'en',
    severity: 'major',
    // "I doesn't know." → "I don't know."
    pattern: /\b(i|we|you|they)\s+(doesn't|does\s+not)\b/i,
    replace: (match) => {
      const subject = match[1] ?? '';
      const negative = match[2] ?? '';
      if (!subject || !negative) return null;
      return `${subject} ${negative.includes(' ') ? 'do not' : "don't"}`;
    },
    explanationKo: "I, we, you, they 뒤에서는 doesn't 대신 don't를 써요.",
    reasonKo: "주어가 he/she/it이 아니면 don't",
    keyExpression: {
      expression: "I don't ~",
      meaningKo: '저는 ~하지 않아요',
      example: "I don't like spicy food.",
    },
    skipIf: SKIP_PRESENT_S,
  },
  {
    id: 'en-agr-third-person-have',
    language: 'en',
    severity: 'major',
    // "He have a car." → "He has a car."
    pattern: new RegExp(String.raw`${LEAD}\b(he|she|it)\s+have\b`, 'i'),
    replace: (match) => {
      const lead = match[1] ?? '';
      const subject = match[2] ?? '';
      if (!subject) return null;
      if (blocked(lead)) return null;
      const prefix = lead ? `${lead} ` : '';
      return `${prefix}${subject} has`;
    },
    explanationKo: 'he, she, it 뒤에서는 have가 has로 바뀌어요.',
    reasonKo: '3인칭 단수는 has',
    keyExpression: {
      expression: 'She has ~',
      meaningKo: '그녀는 ~을 가지고 있어요',
      example: 'She has a cute cat.',
    },
    skipIf: SKIP_PRESENT_S,
  },
  {
    id: 'en-agr-third-person-s',
    language: 'en',
    severity: 'major',
    // "He go to school." → "He goes to school."
    pattern: new RegExp(String.raw`${LEAD}\b(he|she|it)\s+(${alt(BASE_VERBS)})\b`, 'i'),
    replace: (match) => {
      const lead = match[1] ?? '';
      const subject = match[2] ?? '';
      const verb = match[3] ?? '';
      if (!subject || !verb) return null;
      if (blocked(lead)) return null;
      const prefix = lead ? `${lead} ` : '';
      return `${prefix}${subject} ${thirdPersonForm(verb)}`;
    },
    explanationKo: '주어가 he, she, it이면 현재형 동사 끝에 -s를 붙여요.',
    reasonKo: '3인칭 단수 -s',
    keyExpression: {
      expression: 'He goes ~',
      meaningKo: '그는 ~에 가요',
      example: 'He goes to the gym every morning.',
    },
    skipIf: SKIP_PRESENT_S,
  },

  /* ---------- 이중 과거 ---------- */
  {
    id: 'en-agr-did-plus-past',
    language: 'en',
    severity: 'major',
    // "I did went to school." → "I did go to school."
    pattern: new RegExp(
      String.raw`\b(did\s+not|didn't|did)\s+(${alt(Object.keys(PAST_TO_BASE))})\b`,
      'i',
    ),
    replace: (match) => {
      const auxiliary = match[1] ?? '';
      const past = (match[2] ?? '').toLowerCase();
      const base = PAST_TO_BASE[past];
      if (!auxiliary || !base) return null;
      return `${auxiliary} ${base}`;
    },
    explanationKo: 'did에 이미 과거의 뜻이 있어서 뒤에는 동사원형을 써요.',
    reasonKo: 'did + 동사원형',
    keyExpression: {
      expression: "didn't + 동사원형",
      meaningKo: '~하지 않았어요',
      example: "I didn't go out last night.",
    },
  },
];
