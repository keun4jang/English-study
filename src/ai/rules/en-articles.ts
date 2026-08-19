import { CorrectionRule } from './types';

/**
 * 영어 관사(a/an/the)와 명사의 수 — 한국어에는 관사가 없어서 가장 많이 흔들리는 영역이다.
 *
 * 안전 원칙
 * - 정상 문장은 절대 건드리지 않는다. 애매하면 규칙에서 뺀다.
 * - 명사는 "확실히 셀 수 있는" 것만 화이트리스트로 관리한다.
 * - 관사/소유격이 이미 있으면 패턴 구조상(동사·전치사 바로 뒤 명사) 매치되지 않는다.
 * - 명사 뒤에 다른 명사가 붙는 복합어(a 30 minute walk, a news article)는
 *   NOUN_END 가드로 걸러 오탐을 막는다.
 */

/** 명사 뒤에 올 수 있는 "안전한" 단어들 — 이 뒤에 또 다른 명사가 오면 복합어일 수 있으므로 규칙을 적용하지 않는다. */
/**
 * "to + 장소" 규칙에서 to부정사(to park the car)나 명사 수식(to market research)과
 * 구분하기 위해, to 바로 앞에 와야 하는 이동 동사들.
 * 이 규칙은 고유명사 판별을 위해 대소문자를 구분하므로 첫 글자 두 형태를 모두 적는다.
 */
const MOTION_VERBS = String.raw`[Gg]o|[Gg]oes|[Gg]oing|[Ww]ent|[Gg]one|[Cc]ome|[Cc]omes|[Cc]oming|[Cc]ame|[Gg]et|[Gg]ets|[Gg]etting|[Gg]ot|[Dd]rive|[Dd]rives|[Dd]riving|[Dd]rove|[Ww]alk|[Ww]alks|[Ww]alking|[Ww]alked|[Rr]un|[Rr]uns|[Rr]unning|[Rr]an|[Rr]ide|[Rr]ides|[Rr]iding|[Rr]ode|[Mm]ove|[Mm]oves|[Mm]oving|[Mm]oved|[Rr]eturn|[Rr]eturns|[Rr]eturning|[Rr]eturned|[Aa]rrive|[Aa]rrives|[Aa]rriving|[Aa]rrived|[Hh]ead|[Hh]eads|[Hh]eading|[Hh]eaded|[Tt]ravel|[Tt]ravels|[Tt]raveling|[Tt]ravelled|[Tt]raveled|[Tt]ake|[Tt]akes|[Tt]aking|[Tt]ook|[Bb]ring|[Bb]rings|[Bb]ringing|[Bb]rought|[Ss]end|[Ss]ends|[Ss]ending|[Ss]ent|[Ii]nvite|[Ii]nvites|[Ii]nviting|[Ii]nvited|[Bb]een|[Ww]ay`;

const NOUN_END = String.raw`(?=\s*(?:[,.!?;:]|$)|\s+(?:and|but|or|so|because|with|without|in|on|at|to|for|from|of|about|than|like|near|over|under|before|after|during|while|when|then|there|here|today|yesterday|tomorrow|tonight|this|that|these|those|last|next|every|each|again|too|also|now|already|only|per|ago|left|together|instead|a|an|the|my|your|his|her|its|our|their|i|we|you|he|she|it|they|me|him|them|us|is|are|was|were|am|be|been|will|can|could|should|would|must|may|might|have|has|had|do|does|did|go|goes|went|come|comes|came|said|says|told|gave|made|helped|visited|stayed|arrived|joined|looked|seemed|sat|stood|live|lives|lived|worked|played|walked|talked|ate|drank|bought|wanted|liked|know|knew|think|thought|felt|feel|get|gets|got|take|takes|took|see|sees|saw|watched|read|wrote|called|texted|met|meet|became|began|ran|sat|slept|woke|kept|sent|broke|spoke|taught|caught|heard|held|lost|won|paid|spent|understood|wore|put)\b|\s+[a-z]{2,}ed\b)`;

/** 확실히 셀 수 있는 명사(단수형)만 모았다. 불가산·복합어 위험이 있는 단어는 넣지 않는다. */
const COUNT_NOUNS = [
  'friend', 'book', 'apple', 'banana', 'cookie', 'dog', 'cat', 'photo', 'picture',
  'question', 'movie', 'song', 'page', 'student', 'teacher', 'egg', 'bag', 'shirt',
  'class', 'lesson', 'word', 'sentence', 'ticket', 'letter', 'glass', 'cup', 'bottle',
  'box', 'chair', 'table', 'plan', 'goal', 'idea', 'problem', 'mistake', 'game',
  'episode', 'chapter', 'hour', 'minute', 'day', 'week', 'month', 'year', 'time',
  'person', 'child', 'kid', 'baby', 'brother', 'sister', 'cousin', 'colleague',
  'classmate', 'coworker', 'neighbor', 'country', 'city', 'place', 'thing', 'item',
  'bowl', 'plate', 'seat', 'line', 'step', 'task', 'job', 'email', 'message',
  'video', 'drink', 'snack', 'meal', 'shop', 'store', 'hobby', 'dream', 'habit',
].join('|');

const IRREGULAR_PLURALS: Record<string, string> = {
  person: 'people',
  child: 'children',
  man: 'men',
  woman: 'women',
  foot: 'feet',
  tooth: 'teeth',
  life: 'lives',
  knife: 'knives',
  wife: 'wives',
  leaf: 'leaves',
};

/** 화이트리스트 명사만 들어오므로 단순 규칙으로 충분하다. */
function pluralize(noun: string): string {
  const lower = noun.toLowerCase();
  const irregular = IRREGULAR_PLURALS[lower];
  const plural = irregular
    ? irregular
    : /(?:s|x|z|ch|sh)$/i.test(noun)
      ? `${noun}es`
      : /[^aeiou]y$/i.test(noun)
        ? `${noun.slice(0, -1)}ies`
        : `${noun}s`;
  // 원래 명사가 대문자로 시작하면 형태를 유지한다.
  if (/^[A-Z]/.test(noun)) return plural.charAt(0).toUpperCase() + plural.slice(1);
  return plural;
}

/** 철자가 아니라 소리 기준으로 a/an을 고른다. */
const SOUNDS_LIKE_CONSONANT = /^(?:eu|one\b|once\b|uni|use|usu|user|ufo)/i;
const SOUNDS_LIKE_VOWEL = /^(?:hour|honest|honor|heir)/i;

function indefiniteArticle(noun: string): 'a' | 'an' {
  if (SOUNDS_LIKE_VOWEL.test(noun)) return 'an';
  if (SOUNDS_LIKE_CONSONANT.test(noun)) return 'a';
  return /^[aeiou]/i.test(noun) ? 'an' : 'a';
}

const UNCOUNTABLE_SINGULARS: Record<string, string> = {
  advices: 'advice',
  informations: 'information',
  homeworks: 'homework',
  furnitures: 'furniture',
  equipments: 'equipment',
  luggages: 'luggage',
  baggages: 'baggage',
  softwares: 'software',
  breads: 'bread',
  musics: 'music',
  knowledges: 'knowledge',
  traffics: 'traffic',
  stuffs: 'stuff',
  weathers: 'weather',
  moneys: 'money',
};

export const EN_ARTICLE_RULES: CorrectionRule[] = [
  // 1) 불가산 명사에 붙은 a/an — a/an 교정 규칙보다 먼저 처리한다.
  {
    id: 'en-art-uncountable-a',
    language: 'en',
    severity: 'major',
    pattern: new RegExp(
      // fun은 형용사로도 쓰여("a fun, relaxing weekend") 오탐이 나므로 넣지 않는다.
      String.raw`\b(?:a|an)\s+(advice|homework|information|money|bread|rice|music|news|furniture|luggage|baggage|equipment|traffic|knowledge|weather|software|jewelry|mail|pollution|progress|scenery|stuff|water|milk|salt|sugar|air|snow)` +
        NOUN_END,
      'i',
    ),
    replace: '$1',
    explanationKo: 'advice나 water처럼 세지 않는 명사에는 a/an을 붙이지 않아요.',
    reasonKo: '불가산 명사 앞 a/an 삭제',
    keyExpression: {
      expression: 'give advice',
      meaningKo: '조언을 해 주다',
      example: 'She gave me advice about my job.',
    },
  },

  // 2) 불가산 명사의 복수형 (advices, informations …)
  {
    id: 'en-art-uncountable-plural',
    language: 'en',
    severity: 'major',
    pattern:
      /\b(advices|informations|homeworks|furnitures|equipments|luggages|baggages|softwares|breads|musics|knowledges|traffics|stuffs|weathers|moneys)\b/i,
    replace: (m) => {
      const word = m[1];
      if (!word) return null;
      const singular = UNCOUNTABLE_SINGULARS[word.toLowerCase()];
      if (!singular) return null;
      return /^[A-Z]/.test(word) ? singular.charAt(0).toUpperCase() + singular.slice(1) : singular;
    },
    explanationKo: 'advice, information, homework는 복수형으로 쓰지 않고 그대로 써요.',
    reasonKo: '불가산 명사는 단수형으로',
  },

  // 3) 동사 바로 뒤에 온 셀 수 있는 단수 명사 — a/an이 빠진 경우
  //    cold는 형용사로도 쓰여("It got cold.") 오탐이 나므로 명사 목록에서 뺐다.
  {
    id: 'en-art-missing-a-after-verb',
    language: 'en',
    severity: 'major',
    pattern: new RegExp(
      String.raw`\b(ate|eat|eats|have|has|had|bought|buy|buys|saw|see|sees|got|get|gets|took|take|takes|made|make|makes|found|find|finds|watched|watch|watches|read|reads|wrote|write|writes|want|wants|need|needs|drank|drink|drinks|ordered|order|orders|brought|bring|brings)\s+(sandwich|hamburger|burger|apple|banana|cookie|book|movie|car|bike|bicycle|dog|cat|phone|camera|ticket|letter|umbrella|present|gift|question|problem|mistake|headache|fever|plan|dream|idea|meeting|test|exam|job|shower|nap|walk|break|party|picture|photo|message|email|watch|bag|hat|shirt|jacket|pen|pencil|notebook|chair|desk|house|haircut|call|snack|box|towel|blanket|pillow|key|wallet|dress|coat|scarf|ring)` +
        NOUN_END,
      'i',
    ),
    replace: (m) => {
      const verb = m[1];
      const noun = m[2];
      if (!verb || !noun) return null;
      return `${verb} ${indefiniteArticle(noun)} ${noun}`;
    },
    explanationKo: '셀 수 있는 명사가 하나일 때는 앞에 a나 an을 붙여요.',
    reasonKo: '셀 수 있는 단수 명사 앞 a/an 추가',
    keyExpression: {
      expression: 'take a walk',
      meaningKo: '산책하다',
      example: 'I took a walk after dinner.',
    },
  },

  // 4) be동사 + 직업/신분 명사 — a/an이 빠진 경우
  {
    id: 'en-art-missing-a-occupation',
    language: 'en',
    severity: 'major',
    pattern: new RegExp(
      String.raw`(\bam\b|\bis\b|\bwas\b|'m)\s+(elementary school teacher|high school student|middle school student|university student|college student|office worker|police officer|teacher|student|doctor|nurse|engineer|designer|writer|singer|actor|actress|lawyer|chef|programmer|developer|artist|manager|dentist|soldier|barista|beginner|freshman|photographer|scientist|reporter|driver|waiter|waitress|farmer)` +
        NOUN_END,
      'i',
    ),
    replace: (m) => {
      const be = m[1];
      const noun = m[2];
      if (!be || !noun) return null;
      return `${be} ${indefiniteArticle(noun)} ${noun}`;
    },
    explanationKo: '직업이나 신분을 말할 때도 a나 an이 필요해요.',
    reasonKo: '직업 명사 앞 a/an 추가',
    keyExpression: {
      expression: 'I am a college student',
      meaningKo: '저는 대학생이에요',
      example: 'I am a college student in Seoul.',
    },
  },

  // 5) 장소 명사 앞 the 누락 (go to hospital / went to gym …)
  //    to부정사("We had to park outside", "I want to park there")와
  //    명사 수식("according to market research", "looking forward to beach season")을 피하려고
  //    (a) to 바로 앞에 이동 동사(go/went/took/way …)가 있을 때만,
  //    (b) 장소 명사가 구의 끝(NOUN_END)일 때만 적용한다.
  //    고유명사(to Seoul Station)와 뒤따르는 한정사(to park the car)는 lookahead로 제외한다.
  {
    id: 'en-art-missing-the-place',
    language: 'en',
    severity: 'major',
    // 대소문자를 구분한다: 뒤에 대문자 낱말(고유명사)이 오면 적용하지 않기 위해서다.
    pattern: new RegExp(
      String.raw`\b(${MOTION_VERBS})(\s+(?:back|straight|right)\s+|\s+(?:me|him|her|us|them|you)\s+|\s+)([Tt]o)\s+(hospital|park|gym|station|bank|library|airport|beach|mall|museum|zoo|market|supermarket|hotel|bathroom|restroom|office|pharmacy|post office|convenience store|department store|bookstore|movies|theater|dentist|doctor)\b(?!\s+(?:[A-Z]|(?:a|an|the|my|your|his|her|its|our|their|it|them|this|that|these|those|some|any|to)\b))` +
        NOUN_END,
    ),
    replace: '$1$2$3 the $4',
    explanationKo: '서로 아는 그 장소를 말할 때는 to the hospital처럼 the를 넣어요.',
    reasonKo: '장소 명사 앞 the 추가',
    keyExpression: {
      expression: 'go to the gym',
      meaningKo: '헬스장에 가다',
      example: 'I go to the gym every morning.',
    },
  },

  // 6) go to (the) home → go home
  {
    id: 'en-art-go-home',
    language: 'en',
    severity: 'major',
    pattern:
      /\b(go|goes|going|went|come|comes|coming|came|get|gets|getting|got|arrive|arrived|arriving)\s+to\s+(?:the\s+)?home\b/i,
    replace: '$1 home',
    skipIf: /\bhome\s+(?:of|for)\b/i,
    explanationKo: 'home은 그 자체로 "집으로"라는 뜻이라 to나 the 없이 go home으로 써요.',
    reasonKo: 'go home 형태로 정리',
    keyExpression: {
      expression: 'go home',
      meaningKo: '집에 가다',
      example: 'I went home early yesterday.',
    },
  },

  // 7) in morning → in the morning
  {
    id: 'en-art-in-the-morning',
    language: 'en',
    severity: 'minor',
    pattern: /\bin\s+(morning|afternoon|evening)\b/i,
    replace: 'in the $1',
    explanationKo: '하루의 때를 말할 때는 in the morning처럼 the를 함께 써요.',
    reasonKo: '시간 표현 the 추가',
    keyExpression: {
      expression: 'in the morning',
      meaningKo: '아침에',
      example: 'I drink coffee in the morning.',
    },
  },

  // 8) in last week / on this Sunday 처럼 과잉으로 붙은 전치사
  //    "in the last month"(현재완료의 '지난 한 달 동안')는 올바른 영어라서
  //    last/next/this 앞에 the가 있으면 아예 건드리지 않는다.
  //    "The show is on tonight."(방송 일정)도 맞는 문장이라 be동사 + on은 건너뛴다.
  {
    id: 'en-art-extra-the-time',
    language: 'en',
    severity: 'minor',
    pattern:
      /\b(?:(is|are|was|were|am|been|'s|'re|'m)\s+)?(in|on|at)\s+(?:(?:the\s+)?(yesterday|today|tomorrow|tonight)|((?:last|next|this)\s+(?:night|week|weekend|month|monday|tuesday|wednesday|thursday|friday|saturday|sunday)))\b(?!['’]|\s+(?:morning|afternoon|evening|night))/i,
    replace: (m) => {
      const be = m[1];
      const preposition = m[2];
      const dayWord = m[3];
      const phrase = m[4];
      if (phrase) return phrase;
      if (!dayWord) return null;
      if (be && preposition && preposition.toLowerCase() === 'on') return null;
      return dayWord;
    },
    skipIf: /\b(?:last|next|this)\s+\w+\s+of\b/i,
    explanationKo: 'last night, yesterday 같은 표현은 앞에 in이나 the 없이 그대로 써요.',
    reasonKo: '불필요한 전치사와 the 삭제',
    keyExpression: {
      expression: 'last night',
      meaningKo: '어젯밤에',
      example: 'Last night I read a book.',
    },
  },

  // 9) play the soccer → play soccer (운동 종목에는 the를 쓰지 않는다)
  {
    id: 'en-art-extra-the-sport',
    language: 'en',
    severity: 'minor',
    pattern:
      /\b(play|plays|played|playing)\s+the\s+(soccer|baseball|basketball|tennis|football|badminton|golf|volleyball|table tennis|chess|cards)\b/i,
    replace: '$1 $2',
    explanationKo: '운동 종목 이름 앞에는 the를 붙이지 않고 play soccer처럼 써요.',
    reasonKo: '운동 종목 앞 the 삭제',
  },

  // 10) 숫자 + 단수 명사 → 복수형
  //     "a 9 to 5 job", "the number 2 line"처럼 숫자가 이름·범위로 쓰인 경우는
  //     앞 단어를 함께 잡아 두었다가 건너뛴다(오탐 방지).
  {
    id: 'en-art-number-plural',
    language: 'en',
    severity: 'major',
    pattern: new RegExp(
      String.raw`\b(?:(to|number|no|size|line|room|floor|page|chapter|level|grade|unit|apartment|bus|route|gate|exit|channel|part|version)[-\s]+)?(two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|thirty|forty|fifty|[2-9]|\d{2,})\s+(${COUNT_NOUNS})` +
        NOUN_END,
      'i',
    ),
    replace: (m) => {
      const labelWord = m[1];
      const number = m[2];
      const noun = m[3];
      if (labelWord) return null;
      if (!number || !noun) return null;
      return `${number} ${pluralize(noun)}`;
    },
    explanationKo: '둘 이상일 때는 명사 끝에 -s를 붙여 복수형으로 써요.',
    reasonKo: '숫자 뒤 명사는 복수형',
    keyExpression: {
      expression: 'three friends',
      meaningKo: '친구 세 명',
      example: 'I met three friends today.',
    },
  },

  // 11) many / a lot of / a few + 단수 명사 → 복수형
  {
    id: 'en-art-quantifier-plural',
    language: 'en',
    severity: 'major',
    pattern: new RegExp(
      String.raw`\b(many|several|a lot of|lots of|a few|few|both|various)\s+(${COUNT_NOUNS})` + NOUN_END,
      'i',
    ),
    replace: (m) => {
      const quantifier = m[1];
      const noun = m[2];
      if (!quantifier || !noun) return null;
      // "a lot of time"(시간이 많이)은 불가산 용법이라 복수형으로 바꾸면 안 된다.
      const q = quantifier.toLowerCase();
      if (noun.toLowerCase() === 'time' && (q === 'a lot of' || q === 'lots of')) return null;
      return `${quantifier} ${pluralize(noun)}`;
    },
    explanationKo: 'many나 a lot of 뒤에는 복수형 명사가 와요.',
    reasonKo: '수량 표현 뒤 명사는 복수형',
    keyExpression: {
      expression: 'a lot of things',
      meaningKo: '많은 것들',
      example: 'I learned a lot of things today.',
    },
  },

  // 12) one of my friend → one of my friends
  {
    id: 'en-art-one-of-plural',
    language: 'en',
    severity: 'major',
    pattern: new RegExp(
      String.raw`\b(one of)\s+(my|his|her|our|their|the|these|those)\s+(?:(best|favorite|favourite|closest|oldest|youngest|new|old|good)\s+)?(${COUNT_NOUNS})` +
        NOUN_END,
      'i',
    ),
    replace: (m) => {
      const head = m[1];
      const determiner = m[2];
      const adjective = m[3];
      const noun = m[4];
      if (!head || !determiner || !noun) return null;
      return `${head} ${determiner} ${adjective ? `${adjective} ` : ''}${pluralize(noun)}`;
    },
    explanationKo: 'one of 뒤에는 여럿 중 하나라는 뜻이라 복수형 명사를 써요.',
    reasonKo: 'one of 뒤 명사는 복수형',
    keyExpression: {
      expression: 'one of my friends',
      meaningKo: '내 친구들 중 한 명',
      example: 'One of my friends moved to Busan.',
    },
  },

  // 13) a apple → an apple (모음 소리 앞의 a)
  {
    id: 'en-art-a-to-an',
    language: 'en',
    severity: 'minor',
    pattern: /\ba\s+([aeio][a-z]+)\b/i,
    replace: (m) => {
      const word = m[1];
      if (!word) return null;
      if (indefiniteArticle(word) !== 'an') return null;
      return `an ${word}`;
    },
    explanationKo: '모음 소리로 시작하는 단어 앞에서는 a 대신 an을 써요.',
    reasonKo: '모음 소리 앞은 an',
    keyExpression: {
      expression: 'an apple',
      meaningKo: '사과 한 개',
      example: 'I ate an apple in the morning.',
    },
  },

  // 14) an book → a book (자음 소리 앞의 an). 고유명사·약어(an SNS)는 건너뛴다.
  {
    id: 'en-art-an-to-a',
    language: 'en',
    severity: 'minor',
    pattern: /\ban\s+([bcdfgjklmnpqrstvwxyz][a-z]{1,})\b/i,
    replace: (m) => {
      const word = m[1];
      if (!word) return null;
      if (/^[A-Z]/.test(word)) return null;
      if (indefiniteArticle(word) !== 'a') return null;
      return `a ${word}`;
    },
    explanationKo: '자음 소리로 시작하는 단어 앞에서는 an 대신 a를 써요.',
    reasonKo: '자음 소리 앞은 a',
  },
];
