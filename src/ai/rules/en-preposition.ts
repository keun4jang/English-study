import { CorrectionRule } from './types';

/**
 * 영어 전치사 + 자주 쓰는 동사구 — 한국어에는 대응하는 전치사가 없거나
 * 조사(에/에서/을)와 1:1로 맞지 않아 일기에서 가장 자주 흔들리는 영역이다.
 *
 * 안전 원칙
 * - 정상 문장은 절대 건드리지 않는다. 애매하면 규칙에서 뺀다.
 * - 목적어는 화이트리스트로만 관리한다 (bus/train/music/English ...).
 *   목록에 없으면 아예 매치되지 않거나 null을 돌려 규칙을 건너뛴다.
 * - 뒤에 명사가 더 붙는 복합어(morning traffic, shopping mall, English class)는
 *   PHRASE_END 가드로 걸러 오탐을 막는다.
 * - 이미 맞는 표현(in the morning, listen to music, arrive at ...)은 패턴 구조상 매치되지 않는다.
 */

/**
 * 교정 대상 표현이 "여기서 끝난다"고 볼 수 있을 때만 규칙을 적용한다.
 * 뒤에 다른 명사가 붙으면(예: in morning traffic / to shopping mall) 복합어일 수 있으므로 건너뛴다.
 */
const PHRASE_END = String.raw`(?=\s*(?:[,.!?;:]|$)|\s+(?:and|but|or|so|because|since|when|while|before|after|then|though|although|if|as|by|with|without|for|from|to|at|on|in|of|about|near|early|late|again|now|today|yesterday|tomorrow|tonight|too|also|instead|together|alone|first|finally|really|very|almost|even|just|i|we|he|she|it|they|you|my|our|his|her|their|its|me|him|them|us|this|that|these|those|there|here|last|next|every|all|most|is|are|was|were|am|will|can|could|should|would|had|have|has|did|do|does)\b|\s+[a-z]{3,}ed\b)`;

/**
 * "on"을 꼭 필요로 하는 동사들. 이런 동사가 있으면 on 관련 규칙을 적용하지 않는다.
 * (예: It depends on today. / I'm working on today's report.)
 */
const ON_VERB_GUARD =
  /\b(?:count|counts|counted|counting|depend|depends|depended|depending|rely|relies|relied|relying|focus|focuses|focused|focusing|decide|decides|decided|deciding|agree|agrees|agreed|work|works|worked|working|based|spend|spends|spent|comment|commented)\s+on\b/i;

/** 관사/소유격 자리 (뒤에 공백까지 포함해서 캡처된다) */
const DET = String.raw`(?:the|a|an|my|his|her|their|our|your)\s+`;

/** to 없이 "동사 + 장소"로 쓰는 실수를 고칠 때, 관사 없이 쓰는 장소 */
const BARE_PLACES = new Set(['school', 'work', 'church', 'class', 'bed', 'university', 'college', 'camp']);

/** to 없이 "동사 + 장소"로 쓰는 실수를 고칠 때, 보통 the가 붙는 장소 */
const THE_PLACES = new Set([
  'office', 'gym', 'library', 'park', 'station', 'airport', 'bank', 'mall', 'museum',
  'hospital', 'beach', 'market', 'supermarket', 'store', 'restaurant', 'cafe', 'zoo',
  'theater', 'pharmacy', 'salon', 'dentist',
]);

/** arrive 뒤에 in을 쓰는 넓은 장소 */
const ARRIVE_IN_PLACES = new Set([
  'korea', 'japan', 'china', 'america', 'canada', 'australia', 'england', 'france',
  'seoul', 'busan', 'incheon', 'daegu', 'jeju', 'tokyo', 'osaka', 'kyoto', 'london',
  'paris', 'newyork', 'city', 'town', 'village', 'country', 'countryside',
]);

/** arrive 뒤에 at을 쓰는 지점 성격의 장소 */
const ARRIVE_AT_PLACES = new Set([
  'school', 'work', 'office', 'station', 'airport', 'hotel', 'restaurant', 'cafe',
  'library', 'gym', 'park', 'house', 'apartment', 'classroom', 'company', 'building',
  'hospital', 'mall', 'store', 'shop', 'museum', 'theater', 'beach', 'party',
  'meeting', 'class', 'venue', 'gate', 'platform',
]);

export const EN_PREPOSITION_RULES: CorrectionRule[] = [
  /* ---------------------------------------------------------------- */
  /* 시간 전치사                                                        */
  /* ---------------------------------------------------------------- */

  // 1) yesterday / today / tomorrow / last night / next week 앞에는 전치사를 쓰지 않는다.
  {
    id: 'en-prep-time-adverb-no-preposition',
    language: 'en',
    severity: 'major',
    pattern: new RegExp(
      String.raw`\b(?:in|on|at)\s+(yesterday|today|tomorrow|tonight)\b(?!['’])` +
        String.raw`|\b(?:in|on)\s+((?:last|next)\s+(?:night|week|weekend|month|year|summer|winter|spring|fall|autumn|semester|time|monday|tuesday|wednesday|thursday|friday|saturday|sunday))\b`,
      'i',
    ),
    replace: (m) => m[1] ?? m[2] ?? null,
    explanationKo: 'yesterday, today, last week 같은 말은 그 자체가 시간 표현이라 앞에 in/on/at 없이 그냥 써요.',
    reasonKo: '시간 부사 앞 전치사 삭제',
    skipIf: ON_VERB_GUARD,
    keyExpression: {
      expression: 'last week',
      meaningKo: '지난주에 (앞에 전치사를 붙이지 않아요)',
      example: 'Last week I started a new book.',
    },
  },

  // 2) 요일 앞에는 on
  {
    id: 'en-prep-weekday-on',
    language: 'en',
    severity: 'major',
    pattern:
      /\b(?:in|at)\s+(mondays?|tuesdays?|wednesdays?|thursdays?|fridays?|saturdays?|sundays?)\b(?!['’])/i,
    replace: (m) => {
      const day = m[1];
      if (!day) return null;
      return `on ${day.charAt(0).toUpperCase()}${day.slice(1).toLowerCase()}`;
    },
    explanationKo: '요일 앞에는 on을 써요. on Monday처럼요.',
    reasonKo: '요일 앞 전치사 on',
    keyExpression: {
      expression: 'on Monday',
      meaningKo: '월요일에',
      example: 'I have a piano lesson on Monday.',
    },
  },

  // 3) 연도 앞에는 in
  {
    id: 'en-prep-year-in',
    language: 'en',
    severity: 'minor',
    pattern: new RegExp(String.raw`\bon\s+((?:19|20)\d{2})\b(?![-/])` + PHRASE_END, 'i'),
    replace: 'in $1',
    explanationKo: '연도나 달처럼 긴 기간 앞에는 in을 써요. in 2026, in May처럼요.',
    reasonKo: '연도 앞 전치사 in',
    skipIf: ON_VERB_GUARD,
    keyExpression: {
      expression: 'in 2026',
      meaningKo: '2026년에',
      example: 'I want to travel to Japan in 2026.',
    },
  },

  // 4) 하루의 때: in the morning / in the afternoon / in the evening / at night
  {
    id: 'en-prep-part-of-day',
    language: 'en',
    severity: 'major',
    pattern: new RegExp(
      String.raw`\b(?:at\s+(?:the\s+)?|in\s+|on\s+)(morning|afternoon|evening|night)\b` + PHRASE_END,
      'i',
    ),
    replace: (m) => {
      const part = m[1];
      if (!part) return null;
      const lower = part.toLowerCase();
      return lower === 'night' ? 'at night' : `in the ${lower}`;
    },
    explanationKo: '아침·오후·저녁은 in the morning처럼 쓰고, 밤만 at night이라고 해요.',
    reasonKo: '하루의 때를 나타내는 전치사',
    keyExpression: {
      expression: 'in the morning / at night',
      meaningKo: '아침에 / 밤에',
      example: 'I drink coffee in the morning and read at night.',
    },
  },

  // 5) 주말: on the weekend
  {
    id: 'en-prep-weekend-on',
    language: 'en',
    severity: 'minor',
    pattern: new RegExp(
      String.raw`\b(?:in\s+the\s+weekend|in\s+weekend|on\s+weekend|at\s+weekend)\b` + PHRASE_END,
      'i',
    ),
    replace: 'on the weekend',
    explanationKo: '주말은 on the weekend라고 하면 자연스러워요.',
    reasonKo: '주말 앞 전치사 on the',
    keyExpression: {
      expression: 'on the weekend',
      meaningKo: '주말에',
      example: 'I usually sleep in on the weekend.',
    },
  },

  /* ---------------------------------------------------------------- */
  /* 장소 전치사                                                        */
  /* ---------------------------------------------------------------- */

  // 6) 집에(서)는 at home
  {
    id: 'en-prep-at-home',
    language: 'en',
    severity: 'major',
    pattern: new RegExp(String.raw`\bin\s+home\b` + PHRASE_END, 'i'),
    replace: 'at home',
    explanationKo: '"집에서"는 at home이라고 해요. home 앞에는 the도 붙이지 않아요.',
    reasonKo: 'home 앞 전치사 at',
    keyExpression: {
      expression: 'stay at home',
      meaningKo: '집에 있다, 집에 머무르다',
      example: 'I stayed at home all day.',
    },
  },

  // 7) home / here / there 앞에는 to를 쓰지 않는다.
  {
    id: 'en-prep-no-to-home-here-there',
    language: 'en',
    severity: 'major',
    pattern:
      /\b(go|goes|going|went|come|comes|coming|came|get|gets|getting|got|return|returns|returning|returned|arrive|arrives|arriving|arrived|drive|drives|driving|drove|walk|walks|walking|walked|head|heads|heading|headed|move|moves|moving|moved)\s+to\s+(home|here|there)\b/i,
    replace: '$1 $2',
    explanationKo: 'home, here, there는 그 자체에 "~로"라는 뜻이 있어서 to 없이 써요.',
    reasonKo: 'home/here/there 앞 to 삭제',
    keyExpression: {
      expression: 'go home',
      meaningKo: '집에 가다',
      example: 'I went home early yesterday.',
    },
  },

  // 8) 장소로 갈 때는 to가 필요하다 (went school → went to school)
  {
    id: 'en-prep-add-to-place',
    language: 'en',
    severity: 'major',
    pattern: new RegExp(
      String.raw`\b(went|go|goes|going|came|come|comes|coming|returned|return|returns|returning|headed|head|heads|heading)\s+(${DET})?(school|work|church|class|bed|university|college|camp|office|gym|library|park|station|airport|bank|mall|museum|hospital|beach|market|supermarket|store|restaurant|cafe|zoo|theater|pharmacy|salon|dentist)\b` +
        PHRASE_END,
      'i',
    ),
    replace: (m) => {
      const verb = m[1];
      const det = m[2];
      const place = m[3];
      if (!verb || !place) return null;
      if (det) return `${verb} to ${det}${place}`;
      const lower = place.toLowerCase();
      if (BARE_PLACES.has(lower)) return `${verb} to ${place}`;
      if (THE_PLACES.has(lower)) return `${verb} to the ${place}`;
      return null;
    },
    explanationKo: 'go, come 뒤에 장소가 오면 to를 넣어 주세요. go to school처럼요.',
    reasonKo: '장소 앞 to 추가',
    keyExpression: {
      expression: 'go to work',
      meaningKo: '출근하다, 회사에 가다',
      example: 'I go to work at eight every morning.',
    },
  },

  // 9) arrive는 to가 아니라 at / in
  {
    id: 'en-prep-arrive-at-in',
    language: 'en',
    severity: 'major',
    pattern: new RegExp(
      String.raw`\b([Aa]rrived|[Aa]rrives|[Aa]rriving|[Aa]rrive)\s+to\s+(${DET})?([A-Za-z]+)\b`,
    ),
    replace: (m) => {
      const verb = m[1];
      const det = m[2] ?? '';
      const place = m[3];
      if (!verb || !place) return null;
      const lower = place.toLowerCase();
      if (lower === 'home' && !det) return `${verb} home`;
      if (ARRIVE_IN_PLACES.has(lower)) return `${verb} in ${det}${place}`;
      if (!det && /^[A-Z]/.test(place)) return `${verb} in ${place}`;
      if (ARRIVE_AT_PLACES.has(lower)) return `${verb} at ${det}${place}`;
      return null;
    },
    explanationKo: 'arrive 뒤에는 to를 쓰지 않아요. 건물이나 지점은 arrive at, 도시나 나라는 arrive in이에요.',
    reasonKo: 'arrive 뒤 전치사 at/in',
    keyExpression: {
      expression: 'arrive at / arrive in',
      meaningKo: '(장소에) 도착하다',
      example: 'I arrived at the station just before the train left.',
    },
  },

  // 10) 인터넷은 on
  {
    id: 'en-prep-on-the-internet',
    language: 'en',
    severity: 'minor',
    pattern: /\bin\s+the\s+internet\b/i,
    replace: 'on the internet',
    explanationKo: '인터넷에서는 on the internet이라고 해요.',
    reasonKo: 'internet 앞 전치사 on',
    keyExpression: {
      expression: 'on the internet',
      meaningKo: '인터넷에서',
      example: 'I found the recipe on the internet.',
    },
  },

  /* ---------------------------------------------------------------- */
  /* 자주 쓰는 동사구                                                    */
  /* ---------------------------------------------------------------- */

  // 11) listen에는 to가 필요하다
  {
    id: 'en-prep-listen-to',
    language: 'en',
    severity: 'major',
    pattern: new RegExp(
      String.raw`\b(listen|listens|listened|listening)\s+((?:the|a|some|my|his|her|their|our|your)\s+)?(music|song|songs|radio|podcast|podcasts|news|album|playlist|jazz|k-pop|kpop)\b`,
      'i',
    ),
    replace: '$1 to $2$3',
    explanationKo: 'listen 뒤에는 to를 붙여요. listen to music처럼요.',
    reasonKo: 'listen 뒤 to 추가',
    keyExpression: {
      expression: 'listen to music',
      meaningKo: '음악을 듣다',
      example: 'I listened to music on the bus.',
    },
  },

  // 12) wait에는 for가 필요하다
  {
    id: 'en-prep-wait-for',
    language: 'en',
    severity: 'major',
    pattern: new RegExp(
      String.raw`\b(wait|waits|waited|waiting)\s+((?:the|a|my|his|her|their|our|your)\s+)?(bus|train|subway|taxi|friend|friends|him|her|them|me|us|answer|reply|response|order|food|elevator|results?)\b`,
      'i',
    ),
    replace: '$1 for $2$3',
    explanationKo: '누군가나 무언가를 기다릴 때는 wait for를 써요.',
    reasonKo: 'wait 뒤 for 추가',
    keyExpression: {
      expression: 'wait for the bus',
      meaningKo: '버스를 기다리다',
      example: 'I waited for the bus for twenty minutes.',
    },
  },

  // 13) discuss / mention 뒤에는 about을 쓰지 않는다
  {
    id: 'en-prep-discuss-no-about',
    language: 'en',
    severity: 'minor',
    pattern:
      /\b(discuss|discusses|discussed|discussing|mention|mentions|mentioned|mentioning)\s+about\b/i,
    replace: '$1',
    explanationKo: 'discuss와 mention은 about 없이 바로 목적어를 써요.',
    reasonKo: 'discuss/mention 뒤 about 삭제',
    keyExpression: {
      expression: 'discuss the plan',
      meaningKo: '그 계획에 대해 이야기하다',
      example: 'We discussed the plan over dinner.',
    },
  },

  // 14) 사람을 만날 때는 meet + 사람
  {
    id: 'en-prep-meet-person',
    language: 'en',
    severity: 'minor',
    pattern: new RegExp(
      String.raw`\b(meet|meets|met|meeting)\s+with\s+(him|her|them|me|us|my\s+(?:friend|friends|family|mom|mother|dad|father|sister|brother|parents|boyfriend|girlfriend|husband|wife|cousin|grandma|grandmother|grandpa|grandfather|classmate|classmates))\b`,
      'i',
    ),
    replace: '$1 $2',
    explanationKo: '친구나 가족을 만날 때는 with 없이 meet my friend처럼 바로 쓰면 자연스러워요.',
    reasonKo: 'meet 뒤 with 삭제',
    skipIf: /\b(?:a|an|the|my|our|your|their|his|her|this|that|one|another|first|last|next|team|zoom)\s+meeting\b/i,
    keyExpression: {
      expression: 'meet my friend',
      meaningKo: '친구를 만나다',
      example: 'I met my friend at a cafe after work.',
    },
  },

  // 15) 결혼은 married to
  {
    id: 'en-prep-married-to',
    language: 'en',
    severity: 'minor',
    pattern: /\bmarried\s+with\s+(him|her|me|us|them|you|my|his|their|our|your)\b/i,
    replace: 'married to $1',
    explanationKo: '누구와 결혼했다고 할 때는 be married to를 써요.',
    reasonKo: 'married 뒤 전치사 to',
    keyExpression: {
      expression: 'be married to someone',
      meaningKo: '~와 결혼한 상태다',
      example: 'She has been married to him for ten years.',
    },
  },

  // 16) 잘한다고 말할 때는 good at
  {
    id: 'en-prep-good-at',
    language: 'en',
    severity: 'minor',
    pattern: new RegExp(
      String.raw`\b(good|bad|great|terrible|better|best|poor|weak)\s+in\s+(english|japanese|korean|chinese|spanish|math|maths|science|history|music|art|sports|cooking|singing|dancing|drawing|swimming|writing|speaking|reading|listening|running|studying|driving|baking|painting|languages|games|golf|tennis|soccer|basketball)\b` +
        PHRASE_END,
      'i',
    ),
    replace: '$1 at $2',
    explanationKo: '어떤 일을 잘하거나 못한다고 할 때는 at을 써요. good at English처럼요.',
    reasonKo: 'good/bad 뒤 전치사 at',
    keyExpression: {
      expression: 'be good at',
      meaningKo: '~을 잘하다',
      example: 'My sister is good at drawing.',
    },
  },

  // 17) go shopping / go swimming 에는 to를 넣지 않는다
  {
    id: 'en-prep-go-activity-no-to',
    language: 'en',
    severity: 'minor',
    pattern: new RegExp(
      String.raw`\b(go|goes|going|went)\s+to\s+(shopping|swimming|fishing|hiking|jogging|camping|skiing|running|dancing|drinking|traveling|travelling|surfing|bowling|skating|climbing)\b` +
        PHRASE_END,
      'i',
    ),
    replace: '$1 $2',
    explanationKo: 'go shopping, go swimming처럼 -ing 활동 앞에는 to를 넣지 않아요.',
    reasonKo: 'go + 활동(-ing) 앞 to 삭제',
    keyExpression: {
      expression: 'go shopping',
      meaningKo: '쇼핑하러 가다',
      example: 'We went shopping after lunch.',
    },
  },
];
