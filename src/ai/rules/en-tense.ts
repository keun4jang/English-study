import { CorrectionRule } from './types';

/**
 * 영어 시제 규칙 — 한국인 학습자가 일기에서 자주 하는 시제 오류를 다룬다.
 *
 * 설계 원칙
 * - 시간 표현(yesterday, last night, ago, tomorrow ...)이 문장에 있을 때만 시제를 바꾼다.
 *   동사만 보고 바꾸면 정상 문장을 망칠 수 있다.
 * - every day / usually / today / now 같은 현재·습관 문맥이면 아예 건드리지 않는다.
 * - 동사는 화이트리스트(맵)에만 의존한다. 맵에 없으면 null을 돌려 규칙을 건너뛴다.
 */

/* ------------------------------------------------------------------ */
/* 시간 표현                                                            */
/* ------------------------------------------------------------------ */

/** 과거를 가리키는 시간 표현 */
const PAST_TIME_MARKER =
  /\b(yesterday|ago|last\s+(night|week|weekend|month|year|summer|winter|spring|fall|autumn|semester|christmas|monday|tuesday|wednesday|thursday|friday|saturday|sunday)|the\s+day\s+before\s+yesterday|the\s+other\s+day)\b/i;

/** 미래를 가리키는 시간 표현 */
const FUTURE_TIME_MARKER =
  /\b(tomorrow|next\s+(week|weekend|month|year|semester|time|monday|tuesday|wednesday|thursday|friday|saturday|sunday)|the\s+day\s+after\s+tomorrow)\b/i;

/**
 * 현재·습관·완료 문맥. 이런 표현이 함께 있으면 시제를 바꾸지 않는다.
 * (예: "Yesterday was hard but today I am fine." 처럼 두 시제가 섞인 문장 보호)
 */
const PRESENT_CONTEXT =
  /\b(every\s+\w+|each\s+\w+|usually|always|often|sometimes|normally|generally|nowadays|these\s+days|today|now|tonight|currently|anymore|since|from\s+now|this\s+(morning|afternoon|evening|week|month|year))\b/i;

/** 현재완료가 자연스러운 문맥. 완료형 규칙에서만 사용한다. */
const PERFECT_CONTEXT =
  /\b(since|already|just|yet|ever|never|so\s+far|recently|lately|before|how\s+long|for\s+(a|an|two|three|four|five|many|several|\d+))\b/i;

/* ------------------------------------------------------------------ */
/* 동사 사전                                                            */
/* ------------------------------------------------------------------ */

/** 불규칙 동사: 원형 → 과거형 */
const IRREGULAR_PAST: Record<string, string> = {
  go: 'went',
  come: 'came',
  eat: 'ate',
  drink: 'drank',
  see: 'saw',
  meet: 'met',
  take: 'took',
  get: 'got',
  give: 'gave',
  make: 'made',
  buy: 'bought',
  bring: 'brought',
  think: 'thought',
  teach: 'taught',
  catch: 'caught',
  find: 'found',
  feel: 'felt',
  keep: 'kept',
  sleep: 'slept',
  leave: 'left',
  lose: 'lost',
  win: 'won',
  run: 'ran',
  swim: 'swam',
  sing: 'sang',
  write: 'wrote',
  ride: 'rode',
  drive: 'drove',
  fly: 'flew',
  grow: 'grew',
  know: 'knew',
  throw: 'threw',
  wear: 'wore',
  wake: 'woke',
  break: 'broke',
  speak: 'spoke',
  choose: 'chose',
  forget: 'forgot',
  begin: 'began',
  become: 'became',
  fall: 'fell',
  hold: 'held',
  hear: 'heard',
  tell: 'told',
  sell: 'sold',
  send: 'sent',
  spend: 'spent',
  stand: 'stood',
  sit: 'sat',
  say: 'said',
  do: 'did',
  pay: 'paid',
  build: 'built',
  understand: 'understood',
};

/** 규칙 동사: 원형 → 과거형(-ed) */
const REGULAR_PAST: Record<string, string> = {
  watch: 'watched',
  work: 'worked',
  play: 'played',
  study: 'studied',
  cook: 'cooked',
  clean: 'cleaned',
  walk: 'walked',
  talk: 'talked',
  call: 'called',
  visit: 'visited',
  want: 'wanted',
  need: 'needed',
  like: 'liked',
  love: 'loved',
  enjoy: 'enjoyed',
  finish: 'finished',
  start: 'started',
  help: 'helped',
  learn: 'learned',
  listen: 'listened',
  stay: 'stayed',
  try: 'tried',
  cry: 'cried',
  move: 'moved',
  arrive: 'arrived',
  decide: 'decided',
  happen: 'happened',
  rain: 'rained',
  snow: 'snowed',
  wait: 'waited',
  use: 'used',
  look: 'looked',
  ask: 'asked',
  answer: 'answered',
  order: 'ordered',
  open: 'opened',
  close: 'closed',
  live: 'lived',
  travel: 'traveled',
  practice: 'practiced',
  prepare: 'prepared',
  exercise: 'exercised',
  jog: 'jogged',
  stop: 'stopped',
  plan: 'planned',
  shop: 'shopped',
  chat: 'chatted',
  miss: 'missed',
  worry: 'worried',
  smile: 'smiled',
  laugh: 'laughed',
  dance: 'danced',
  bake: 'baked',
  wash: 'washed',
  change: 'changed',
  check: 'checked',
  share: 'shared',
  thank: 'thanked',
  invite: 'invited',
  join: 'joined',
  rest: 'rested',
  relax: 'relaxed',
  remember: 'remembered',
  return: 'returned',
  save: 'saved',
  show: 'showed',
  text: 'texted',
};

/** 원형 → 과거형 (불규칙 + 규칙) */
const BASE_PAST: Record<string, string> = { ...IRREGULAR_PAST, ...REGULAR_PAST };

/**
 * 감정·상태를 나타내는 동사. 과거 시간 표현이 있어도 현재형 그대로가 맞을 때가 많다.
 * (예: "A week ago I started a new job, and I like it a lot.")
 * 정상 문장을 지키기 위해 과거형 변환 대상에서 제외한다.
 */
const STATE_VERBS = new Set([
  'like', 'love', 'want', 'need', 'remember', 'know', 'think', 'understand',
  'feel', 'miss', 'worry', 'live',
]);

function withoutStateVerbs(table: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(table).filter(([base]) => !STATE_VERBS.has(base)));
}

/** 과거형 변환에 쓰는 안전 사전 (상태 동사 제외) */
const IRREGULAR_PAST_SAFE = withoutStateVerbs(IRREGULAR_PAST);
const REGULAR_PAST_SAFE = withoutStateVerbs(REGULAR_PAST);
const BASE_PAST_SAFE: Record<string, string> = { ...IRREGULAR_PAST_SAFE, ...REGULAR_PAST_SAFE };

/** 3인칭 단수 현재형 만들기 (goes, studies, watches ...) */
function thirdPersonForm(base: string): string {
  if (/(s|x|z|ch|sh|o)$/.test(base)) return `${base}es`;
  if (/[^aeiou]y$/.test(base)) return `${base.slice(0, -1)}ies`;
  return `${base}s`;
}

/** 명사로도 자주 쓰여 오탐 위험이 있는 3인칭 형태는 제외한다. */
const RISKY_THIRD_PERSON = new Set(['leaves', 'falls', 'drinks', 'means', 'rests', 'texts', 'orders']);

/** 3인칭 단수 현재형 → 과거형 (goes → went) */
const THIRD_PERSON_PAST: Record<string, string> = {};
/** 3인칭 단수 현재형 → 원형 (goes → go) */
const THIRD_PERSON_BASE: Record<string, string> = {};
for (const [base, past] of Object.entries(BASE_PAST)) {
  const s = thirdPersonForm(base);
  if (RISKY_THIRD_PERSON.has(s)) continue;
  THIRD_PERSON_PAST[s] = past;
  THIRD_PERSON_BASE[s] = base;
}

/** 3인칭 단수 현재형 → 과거형 (상태 동사 제외) */
const THIRD_PERSON_PAST_SAFE: Record<string, string> = {};
for (const [form, past] of Object.entries(THIRD_PERSON_PAST)) {
  const base = THIRD_PERSON_BASE[form];
  if (base && !STATE_VERBS.has(base)) THIRD_PERSON_PAST_SAFE[form] = past;
}

/** 과거형 → 원형 (didn't went → didn't go) */
const PAST_BASE: Record<string, string> = {};
for (const [base, past] of Object.entries(BASE_PAST)) {
  if (base !== past) PAST_BASE[past] = base;
}

/** 과거분사 → 과거형 (완료형을 단순 과거로 바꿀 때) */
const PARTICIPLE_PAST: Record<string, string> = {
  been: 'was',
  gone: 'went',
  done: 'did',
  seen: 'saw',
  eaten: 'ate',
  drunk: 'drank',
  taken: 'took',
  written: 'wrote',
  given: 'gave',
  known: 'knew',
  spoken: 'spoke',
  broken: 'broke',
  chosen: 'chose',
  driven: 'drove',
  ridden: 'rode',
  worn: 'wore',
  woken: 'woke',
  begun: 'began',
  become: 'became',
  fallen: 'fell',
  thrown: 'threw',
  flown: 'flew',
  grown: 'grew',
  sung: 'sang',
  swum: 'swam',
  forgotten: 'forgot',
  come: 'came',
  run: 'ran',
  met: 'met',
  made: 'made',
  bought: 'bought',
  brought: 'brought',
  caught: 'caught',
  taught: 'taught',
  thought: 'thought',
  found: 'found',
  felt: 'felt',
  kept: 'kept',
  slept: 'slept',
  left: 'left',
  lost: 'lost',
  won: 'won',
  sent: 'sent',
  spent: 'spent',
  told: 'told',
  sold: 'sold',
  heard: 'heard',
  held: 'held',
  stood: 'stood',
  sat: 'sat',
  said: 'said',
  paid: 'paid',
  built: 'built',
  understood: 'understood',
  had: 'had',
  read: 'read',
};

/** 과거형 → 과거분사 (have went → have gone). 형태가 같은 동사는 넣지 않는다. */
const PAST_PARTICIPLE: Record<string, string> = {
  went: 'gone',
  ate: 'eaten',
  saw: 'seen',
  did: 'done',
  drank: 'drunk',
  took: 'taken',
  wrote: 'written',
  gave: 'given',
  knew: 'known',
  spoke: 'spoken',
  broke: 'broken',
  chose: 'chosen',
  drove: 'driven',
  rode: 'ridden',
  wore: 'worn',
  woke: 'woken',
  began: 'begun',
  became: 'become',
  fell: 'fallen',
  threw: 'thrown',
  flew: 'flown',
  grew: 'grown',
  sang: 'sung',
  swam: 'swum',
  forgot: 'forgotten',
  came: 'come',
  ran: 'run',
  // rose / stole / drew 는 넣지 않는다.
  // "She has rose bushes", "She has Drew's number", "a silk stole" 처럼
  // 명사·사람 이름으로 훨씬 자주 쓰여 정상 문장을 망친다.
};

/** 모든 과거형 (완료형 오용 판단용) */
const PAST_FORMS = new Set(Object.values(BASE_PAST));

/** don't → didn't 규칙에서 다룰 동작 동사 */
const ACTION_VERBS = [
  'go', 'come', 'eat', 'drink', 'sleep', 'study', 'watch', 'work', 'play', 'cook',
  'clean', 'meet', 'call', 'visit', 'finish', 'wear', 'buy', 'take', 'see', 'do',
  'walk', 'answer', 'wake', 'bring', 'ride', 'write', 'send', 'wash', 'exercise',
];

/** will을 붙여 주면 자연스러운 미래 동사 (상태·희망 동사는 제외) */
const FUTURE_VERBS = [
  'go', 'come', 'meet', 'see', 'visit', 'eat', 'watch', 'study', 'work', 'start',
  'finish', 'take', 'buy', 'call', 'travel', 'move', 'leave', 'stay', 'cook',
  'clean', 'play', 'sleep', 'wake', 'make', 'try', 'join', 'send', 'tell', 'bring',
  'wear', 'walk', 'ride', 'write', 'exercise', 'rest',
];

/** can → could 규칙에서 다룰 동사 */
const CAN_VERBS = [
  'sleep', 'eat', 'go', 'come', 'see', 'find', 'finish', 'meet', 'buy', 'swim',
  'do', 'understand', 'answer', 'catch', 'hear', 'move', 'walk', 'stand', 'wait',
  'study', 'focus', 'concentrate', 'solve', 'open', 'call', 'take', 'stop', 'breathe',
];

/** will 뒤에 잘못 오는 형태 → 원형 */
const WILL_WRONG_FORM: Record<string, string> = {
  ...PAST_BASE,
  ...THIRD_PERSON_BASE,
  going: 'go',
  being: 'be',
  was: 'be',
  were: 'be',
  am: 'be',
  is: 'be',
  are: 'be',
};

/* ------------------------------------------------------------------ */
/* 헬퍼                                                                 */
/* ------------------------------------------------------------------ */

function sentenceOf(match: RegExpMatchArray): string {
  return match.input ?? '';
}

/**
 * 매치를 둘러싼 구간을 잘라낸다. 경계 정규식은 호출자가 정한다.
 * (일기는 여러 문장이 이어지므로 구간을 나누지 않으면 다른 문장의 시간 표현에 끌려간다)
 */
function spanAround(match: RegExpMatchArray, breaks: RegExp): { text: string; start: number } {
  const text = sentenceOf(match);
  const index = match.index ?? 0;
  const end = index + (match[0] ?? '').length;
  const scanner = new RegExp(breaks.source, breaks.flags.includes('g') ? breaks.flags : `${breaks.flags}g`);
  let start = 0;
  let stop = text.length;
  let found: RegExpExecArray | null = scanner.exec(text);
  while (found !== null) {
    const foundEnd = found.index + found[0].length;
    if (foundEnd <= index) start = foundEnd;
    else if (found.index >= end) {
      stop = found.index;
      break;
    }
    if (scanner.lastIndex === found.index) scanner.lastIndex += 1; // 빈 매치 방어
    found = scanner.exec(text);
  }
  return { text: text.slice(start, stop), start };
}

/** 문장 경계 (마침표·물음표·느낌표·줄바꿈). 일기는 대개 여러 문장이다. */
const SENTENCE_BREAKS = /[.!?…]+\s*|\n+/g;

/**
 * 절(clause) 경계. 문장 경계 + 접속사·쉼표·관계사.
 * "A week ago I moved, and I have a new room." 처럼 절마다 시제가 다른 문장을 보호한다.
 */
// "so tired" 같은 강조 부사는 절 경계가 아니므로 so 뒤에 주어가 올 때만 경계로 본다
const CLAUSE_BREAKS =
  /[.!?…]+\s*|\n+|,|;|\band\b|\bbut\b|\bso\s+(?=(?:I|we|you|they|he|she|it|my|our|his|her|the)\b)|\bbecause\b|\bthen\b|\bwhile\b|\bwhen\b|\bwho\b|\bwhich\b|\bthat\b|\bhow\b|\bwhere\b|\bif\b|\buntil\b|\bafter\b|\bbefore\b/gi;

function clauseOf(match: RegExpMatchArray): string {
  return spanAround(match, CLAUSE_BREAKS).text;
}

/** 같은 절 안에 과거 시간 표현이 있을 때만 true */
function hasPastMarkerInClause(match: RegExpMatchArray): boolean {
  return PAST_TIME_MARKER.test(clauseOf(match));
}

/** 같은 절 안에 미래 시간 표현이 있을 때만 true */
function hasFutureMarkerInClause(match: RegExpMatchArray): boolean {
  return FUTURE_TIME_MARKER.test(clauseOf(match));
}

/**
 * 같은 절에 현재·습관 문맥이 있으면 시제를 건드리지 않는다.
 * "Yesterday I went to the gym, and now I go every day." 같은 문장을 지킨다.
 */
function hasPresentContextInClause(match: RegExpMatchArray): boolean {
  return PRESENT_CONTEXT.test(clauseOf(match));
}

/**
 * 같은 "문장" 안에서, 매치보다 앞쪽에 과거 시간 표현이 있을 때만 true.
 * 시제 일치 규칙(두 번째 동사)은 절을 넘어가야 하지만 문장은 넘어가면 안 된다.
 * "I enjoy my morning walks, but yesterday it rained." 처럼 뒤쪽 절에만 과거 표현이
 * 있는 문장을 보호한다.
 */
function hasPastMarkerEarlierInSentence(match: RegExpMatchArray): boolean {
  const { text, start } = spanAround(match, SENTENCE_BREAKS);
  const relative = (match.index ?? 0) - start;
  if (relative <= 0) return false;
  return PAST_TIME_MARKER.test(text.slice(0, relative));
}

/** 매치 바로 앞 단어 (조동사 뒤 주어인지 확인해 오탐을 막는다) */
function wordBefore(match: RegExpMatchArray): string {
  const before = sentenceOf(match).slice(0, match.index ?? 0);
  const found = before.match(/([A-Za-z']+)\s*$/);
  return found ? found[1].toLowerCase() : '';
}

/** "Did you go...?" 처럼 이미 조동사가 시제를 나타내는 경우 */
const AUX_BEFORE_SUBJECT = new Set([
  'do', 'does', 'did', "don't", "doesn't", "didn't", 'will', "won't", 'would',
  'can', "can't", 'could', 'should', 'must', 'might', 'may', 'to', 'let', 'never',
]);

function isAfterAuxiliary(match: RegExpMatchArray): boolean {
  return AUX_BEFORE_SUBJECT.has(wordBefore(match));
}

/** 정규식 선택지 만들기 (긴 단어 우선) */
function alternation(words: string[]): string {
  return [...words].sort((a, b) => b.length - a.length).join('|');
}

function lookup(table: Record<string, string>, word: string): string | null {
  const found = table[word.toLowerCase()];
  return found ?? null;
}

/**
 * 3인칭 주어로 쓸 수 있는 명사(사람·동물·집단)만 허용한다.
 * "my/the + 아무 단어" 를 주어로 보면 "my future plans", "my phone calls",
 * "the new shows", "her morning runs" 의 명사를 동사로 착각해 망가뜨린다.
 */
const PERSON_NOUNS = [
  'mom', 'mother', 'mum', 'dad', 'father', 'sister', 'brother', 'friend', 'friends',
  'teacher', 'professor', 'boss', 'coworker', 'colleague', 'classmate', 'roommate',
  'neighbor', 'neighbour', 'husband', 'wife', 'boyfriend', 'girlfriend', 'son',
  'daughter', 'baby', 'kid', 'kids', 'child', 'children', 'family', 'parents',
  'grandma', 'grandmother', 'grandpa', 'grandfather', 'uncle', 'aunt', 'cousin',
  'dog', 'cat', 'puppy', 'team', 'class', 'club', 'company', 'doctor', 'nurse',
  'manager', 'partner', 'student', 'coach', 'driver', 'owner', 'guy', 'man',
  'woman', 'girl', 'boy', 'people', 'group',
];

/** "her will was strong" 처럼 will 이 명사인 경우에 앞서 오는 말 */
const DETERMINER_BEFORE_WILL = new Set([
  'a', 'an', 'the', 'my', 'your', 'his', 'her', 'our', 'their', 'its',
  'free', 'own', 'strong', 'good', 'last', 'iron',
]);

/**
 * 조동사 will 이 아니라 명사 will / 사람 이름 Will 인지 판단한다.
 * ("Her will was strong.", "My friend Will works at a bank.", "Will called me last night.")
 */
function isWillNotModal(match: RegExpMatchArray): boolean {
  const modal = (match[1] ?? '').trim();
  if (!/^will$/i.test(modal)) return false; // won't / will not / 'll 은 안전
  if (DETERMINER_BEFORE_WILL.has(wordBefore(match))) return true;
  // 문장 첫머리가 아닌데 대문자 Will 이면 사람 이름으로 본다
  const head = sentenceOf(match).slice(0, match.index ?? 0);
  if (modal.startsWith('W') && !/(?:^|[.!?…"'\n]\s*)$/.test(head)) return true;
  // will 은 미래라 과거형·과거 시간 표현과 함께 오지 않는다.
  // "Will called me last night." 은 조동사가 아니라 사람 이름 + 과거형 동사다.
  const following = (match[2] ?? '').toLowerCase();
  if (!PAST_BASE[following]) return false;
  return modal.startsWith('W') || hasPastMarkerInClause(match);
}

/** have/has/had 뒤에서 명사로도 흔히 쓰이는 형태 (a saw, a fell, a drove, broke) */
const NOUN_LIKE_PAST_FORMS = new Set(['saw', 'fell', 'broke', 'drove']);

/** 완료형 오류로 볼 만한 주어 (사물 주어면 "The workshop has saw blades" 같은 정상 문장이다) */
const PRONOUN_SUBJECTS = new Set(['i', 'we', 'you', 'they', 'he', 'she', 'it']);

/* ------------------------------------------------------------------ */
/* 규칙                                                                 */
/* ------------------------------------------------------------------ */

export const EN_TENSE_RULES: CorrectionRule[] = [
  {
    id: 'en-tense-been-to-past-time',
    language: 'en',
    severity: 'major',
    // "I have been to Busan last weekend" → "I went to Busan last weekend"
    pattern: /\b(I|we|you|they|he|she)\s+(?:have|has)\s+been\s+to\b/i,
    replace: (match) => {
      if (!hasPastMarkerInClause(match)) return null;
      if (hasPresentContextInClause(match)) return null;
      return `${match[1]} went to`;
    },
    explanationKo:
      'last weekend처럼 지난 시점을 콕 집어 말할 때는 have been to 대신 went to를 써요.',
    reasonKo: '지난 시점에는 단순 과거',
    keyExpression: {
      expression: 'have been to',
      meaningKo: '~에 가 본 적이 있어요 (시점을 말하지 않을 때)',
      example: 'I have been to Busan twice.',
    },
    skipIf: PERFECT_CONTEXT,
  },
  {
    id: 'en-tense-perfect-with-past-time',
    language: 'en',
    severity: 'major',
    // "I have finished it yesterday" → "I finished it yesterday"
    pattern: /\b(I|we|you|they|he|she|it)\s+(?:have|has)\s+([a-z]+)\b/i,
    replace: (match) => {
      if (!hasPastMarkerInClause(match)) return null;
      if (hasPresentContextInClause(match)) return null;
      const subject = match[1];
      const word = (match[2] ?? '').toLowerCase();
      let past = lookup(PARTICIPLE_PAST, word);
      if (!past && PAST_FORMS.has(word)) past = word;
      if (!past && /^[a-z]{2,}ed$/.test(word)) past = word;
      if (!past) return null;
      if (past === 'was' && /^(we|you|they)$/i.test(subject)) past = 'were';
      return `${subject} ${past}`;
    },
    explanationKo:
      'yesterday처럼 끝난 시점이 나오면 have + 과거분사 대신 과거형 하나로 말해요.',
    reasonKo: '완료형 대신 단순 과거',
    skipIf: PERFECT_CONTEXT,
  },
  {
    id: 'en-tense-perfect-wrong-participle',
    language: 'en',
    severity: 'major',
    // "I have went to Japan" → "I have gone to Japan"
    pattern: new RegExp(
      String.raw`\b(have|has|had)\s+(${alternation(Object.keys(PAST_PARTICIPLE))})\b(?!['\u2019])`,
      'i',
    ),
    replace: (match) => {
      const word = (match[2] ?? '').toLowerCase();
      // 명사로도 쓰이는 형태는 대명사 주어일 때만 (The workshop has saw blades.)
      if (NOUN_LIKE_PAST_FORMS.has(word) && !PRONOUN_SUBJECTS.has(wordBefore(match))) return null;
      const participle = lookup(PAST_PARTICIPLE, word);
      return participle ? `${match[1]} ${participle}` : null;
    },
    explanationKo: 'have 뒤에는 과거형이 아니라 과거분사를 써요. went 대신 gone처럼요.',
    reasonKo: 'have + 과거분사',
    keyExpression: {
      expression: 'have + 과거분사',
      meaningKo: '지금까지의 경험이나 결과를 말할 때',
      example: 'I have gone through a lot this year.',
    },
  },
  {
    id: 'en-tense-be-past-singular',
    language: 'en',
    severity: 'major',
    // "Yesterday I am so tired" → "Yesterday I was so tired"
    pattern:
      /\b(I|he|she|it|there|the\s+[a-z]+|my\s+[a-z]+|our\s+[a-z]+|his\s+[a-z]+|her\s+[a-z]+|their\s+[a-z]+)\s+(?:am|is)\b|\b(I|he|she|it|there)(?:'m|'s)(?!\s+(?:been|got)\b)/i,
    replace: (match) => {
      if (!hasPastMarkerInClause(match)) return null;
      if (hasPresentContextInClause(match)) return null;
      const subject = match[1] || match[2];
      if (!subject) return null;
      return `${subject} was`;
    },
    explanationKo: '어제 일을 말할 때는 am/is 대신 was를 쓰면 자연스러워요.',
    reasonKo: '과거 시제 (be동사)',
  },
  {
    id: 'en-tense-be-past-plural',
    language: 'en',
    severity: 'major',
    // "We are happy last night" → "We were happy last night"
    pattern:
      /\b(we|they|you|these|those|the\s+[a-z]+s|my\s+[a-z]+s|our\s+[a-z]+s|his\s+[a-z]+s|her\s+[a-z]+s|their\s+[a-z]+s)\s+are\b|\b(we|they|you)(?:'re)\b/i,
    replace: (match) => {
      if (!hasPastMarkerInClause(match)) return null;
      if (hasPresentContextInClause(match)) return null;
      const subject = match[1] || match[2];
      if (!subject) return null;
      return `${subject} were`;
    },
    explanationKo: '지난 일을 말할 때 주어가 여럿이면 are 대신 were를 써요.',
    reasonKo: '과거 시제 (be동사)',
  },
  {
    id: 'en-tense-did-plus-past-verb',
    language: 'en',
    severity: 'major',
    // "I didn't went to school" → "I didn't go to school"
    pattern: new RegExp(
      String.raw`\b(did\s+not|didn't|did)\s+((?:not|I|you|we|they|he|she|it)\s+)?(${alternation(
        Object.keys(PAST_BASE),
      )})\b`,
      'i',
    ),
    replace: (match) => {
      const base = lookup(PAST_BASE, match[3] ?? '');
      return base ? `${match[1]} ${match[2] ?? ''}${base}` : null;
    },
    explanationKo: 'did와 didn\'t가 이미 과거를 나타내니까 뒤에는 동사원형을 써요.',
    reasonKo: "did/didn't + 동사원형",
    keyExpression: {
      expression: "didn't + 동사원형",
      meaningKo: '~하지 않았어요',
      example: "I didn't go out yesterday.",
    },
  },
  {
    id: 'en-tense-dont-to-didnt',
    language: 'en',
    severity: 'major',
    // "I don't sleep well last night" → "I didn't sleep well last night"
    pattern: new RegExp(
      String.raw`\b(do\s+not|don't|does\s+not|doesn't)\s+(${alternation(ACTION_VERBS)})\b`,
      'i',
    ),
    replace: (match) => {
      if (!hasPastMarkerInClause(match)) return null;
      if (hasPresentContextInClause(match)) return null;
      const negative = /\s/.test(match[1]) ? 'did not' : "didn't";
      return `${negative} ${match[2]}`;
    },
    explanationKo: '지난 일을 부정할 때는 don\'t 대신 didn\'t를 써요.',
    reasonKo: '과거 부정형',
    skipIf: PRESENT_CONTEXT,
  },
  {
    id: 'en-tense-irregular-base-past',
    language: 'en',
    severity: 'major',
    // "I go to the cafe yesterday" → "I went to the cafe yesterday"
    pattern: new RegExp(
      String.raw`\b(I|we|you|they|he|she|it)\s+(${alternation(Object.keys(IRREGULAR_PAST_SAFE))})\b`,
      'i',
    ),
    replace: (match) => {
      if (!hasPastMarkerInClause(match)) return null;
      if (hasPresentContextInClause(match)) return null;
      if (isAfterAuxiliary(match)) return null;
      const past = lookup(IRREGULAR_PAST_SAFE, match[2] ?? '');
      return past ? `${match[1]} ${past}` : null;
    },
    explanationKo: '지난 일이니까 동사를 과거형으로 바꾸면 자연스러워요. 불규칙 동사는 형태를 통째로 외워 두면 편해요.',
    reasonKo: '과거 시제 (불규칙 동사)',
  },
  {
    id: 'en-tense-regular-base-past',
    language: 'en',
    severity: 'major',
    // "I watch a movie last night" → "I watched a movie last night"
    pattern: new RegExp(
      String.raw`\b(I|we|you|they|he|she|it)\s+(${alternation(Object.keys(REGULAR_PAST_SAFE))})\b`,
      'i',
    ),
    replace: (match) => {
      if (!hasPastMarkerInClause(match)) return null;
      if (hasPresentContextInClause(match)) return null;
      if (isAfterAuxiliary(match)) return null;
      const past = lookup(REGULAR_PAST_SAFE, match[2] ?? '');
      return past ? `${match[1]} ${past}` : null;
    },
    explanationKo: '지난 일을 말할 때는 동사 뒤에 -ed를 붙여 과거형으로 써요.',
    reasonKo: '과거 시제 (-ed)',
  },
  {
    id: 'en-tense-past-second-verb',
    language: 'en',
    severity: 'major',
    // "Yesterday I went to school and I eat lunch there" → 두 번째 동사도 과거로
    pattern: new RegExp(
      String.raw`\b(I|we|you|they|he|she|it)\s+(${alternation(Object.keys(BASE_PAST_SAFE))})\b`,
      'i',
    ),
    replace: (match) => {
      if (!hasPastMarkerEarlierInSentence(match)) return null;
      if (hasPresentContextInClause(match)) return null;
      if (isAfterAuxiliary(match)) return null;
      const past = lookup(BASE_PAST_SAFE, match[2] ?? '');
      return past ? `${match[1]} ${past}` : null;
    },
    explanationKo: '한 문장에 동사가 여러 개면 시제를 모두 과거로 맞춰 주면 자연스러워요.',
    reasonKo: '시제 일치 (과거)',
  },
  {
    id: 'en-tense-third-person-past',
    language: 'en',
    severity: 'major',
    // "My mom cooks bulgogi yesterday" → "My mom cooked bulgogi yesterday"
    pattern: new RegExp(
      String.raw`\b(he|she|it|everyone|everybody|someone|somebody|nobody|(?:my|his|her|our|their|the)\s+(?:${alternation(
        PERSON_NOUNS,
      )}))\s+(${alternation(Object.keys(THIRD_PERSON_PAST_SAFE))})\b`,
      'i',
    ),
    replace: (match) => {
      if (!hasPastMarkerInClause(match)) return null;
      if (hasPresentContextInClause(match)) return null;
      if (isAfterAuxiliary(match)) return null;
      const past = lookup(THIRD_PERSON_PAST_SAFE, match[2] ?? '');
      return past ? `${match[1]} ${past}` : null;
    },
    explanationKo: '지난 일이니까 goes, cooks 같은 현재형 대신 과거형으로 써요.',
    reasonKo: '과거 시제 (3인칭 단수)',
  },
  {
    id: 'en-tense-have-to-had',
    language: 'en',
    severity: 'major',
    // "I have a headache yesterday" → "I had a headache yesterday"
    pattern:
      /\b(I|we|you|they|he|she|it|my\s+[a-z]+|his\s+[a-z]+|her\s+[a-z]+)\s+(?:have|has)\s+(?=(?:a|an|the|my|his|her|our|their|some|no|any|two|three|four|five|many|several|lots|breakfast|brunch|lunch|dinner|coffee|tea|class|classes|work|homework|fun|time|plans|plan)\b)/i,
    replace: (match) => {
      if (!hasPastMarkerInClause(match)) return null;
      if (hasPresentContextInClause(match)) return null;
      return `${match[1]} had `;
    },
    explanationKo: '지난 일을 말할 때는 have 대신 had를 써요.',
    reasonKo: '과거 시제 (have → had)',
    keyExpression: {
      expression: 'had a great time',
      meaningKo: '즐거운 시간을 보냈어요',
      example: 'I had a great time with my friends last weekend.',
    },
  },
  {
    id: 'en-tense-can-to-could',
    language: 'en',
    severity: 'minor',
    // "I can't sleep last night" → "I couldn't sleep last night"
    pattern: new RegExp(
      String.raw`\b(I|we|he|she|they|you)\s+(can't|cannot|can\s+not|can)\s+(${alternation(
        CAN_VERBS,
      )})\b`,
      'i',
    ),
    replace: (match) => {
      if (!hasPastMarkerInClause(match)) return null;
      if (hasPresentContextInClause(match)) return null;
      if (isAfterAuxiliary(match)) return null;
      const modal = match[2].toLowerCase() === 'can' ? 'could' : "couldn't";
      return `${match[1]} ${modal} ${match[3]}`;
    },
    explanationKo: '지난 일이라 can 대신 could를 쓰면 시제가 맞아요.',
    reasonKo: 'can → could (과거)',
    skipIf: PRESENT_CONTEXT,
  },
  {
    id: 'en-tense-will-plus-base',
    language: 'en',
    severity: 'major',
    // "I will went there" → "I will go there"
    pattern: new RegExp(
      String.raw`(\bwill\s+not|\bwon't|\bwill|'ll)\s+(${alternation(
        Object.keys(WILL_WRONG_FORM),
      )})\b`,
      'i',
    ),
    replace: (match) => {
      if (isWillNotModal(match)) return null;
      const base = lookup(WILL_WRONG_FORM, match[2] ?? '');
      return base ? `${match[1]} ${base}` : null;
    },
    explanationKo: 'will 뒤에는 항상 동사원형이 와요. will go, will be처럼요.',
    reasonKo: 'will + 동사원형',
    keyExpression: {
      expression: 'will + 동사원형',
      meaningKo: '앞으로 할 일을 말할 때',
      example: 'I will call you tomorrow.',
    },
  },
  {
    id: 'en-tense-future-missing-will',
    language: 'en',
    severity: 'minor',
    // "I meet my friend tomorrow" → "I will meet my friend tomorrow"
    pattern: new RegExp(
      String.raw`\b(I|we|they|you|he|she)\s+(${alternation([
        ...FUTURE_VERBS,
        ...FUTURE_VERBS.map(thirdPersonForm),
      ])})\b`,
      'i',
    ),
    replace: (match) => {
      if (!hasFutureMarkerInClause(match)) return null;
      if (hasPresentContextInClause(match)) return null;
      if (isAfterAuxiliary(match)) return null;
      const word = (match[2] ?? '').toLowerCase();
      const base = lookup(THIRD_PERSON_BASE, word) ?? (FUTURE_VERBS.includes(word) ? word : null);
      if (!base) return null;
      return `${match[1]} will ${base}`;
    },
    explanationKo: 'tomorrow처럼 앞으로의 일을 말할 때는 will을 넣어 주면 더 분명해져요.',
    reasonKo: '미래 표현 (will)',
    skipIf:
      /\b(will|'ll|won't|going\s+to|gonna|would|should|might|must|can|could|have\s+to|has\s+to|need\s+to|want\s+to|plan|hope|wish|if|when|before|after|until|maybe)\b/i,
  },
];
