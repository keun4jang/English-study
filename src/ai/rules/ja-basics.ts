import { CorrectionRule } from './types';

/**
 * 일본어 기초 교정 — 한국어 화자가 실제로 자주 하는 오류만 다룬다.
 *
 * 안전 원칙
 * - 일본어는 단어 경계(\b)가 없으므로 앞뒤 글자를 명시적으로 포함해 매치한다.
 * - 조사 규칙은 "그 조합이 절대 성립하지 않는" 경우(を会う, を乗る 등)나
 *   화이트리스트로 한정한 경우만 넣는다.
 * - 시제 규칙은 과거 시간 표현(昨日は / 先週、…)이 확실할 때만 동작하고,
 *   현재·미래 표현이나 접속 표현이 섞이면 skipIf로 전부 건너뛴다.
 * - 애매하면 replace에서 null을 반환해 규칙을 통째로 넘긴다.
 */

/* ------------------------------------------------------------------ */
/* 공통 헬퍼                                                            */
/* ------------------------------------------------------------------ */

/** 긴 표현이 먼저 매치되도록 정렬해 alternation을 만든다. */
function alternation(words: readonly string[]): string {
  return [...words].sort((a, b) => b.length - a.length).join('|');
}

/** 확실한 い형용사만 모았다. な형용사(きれい・嫌い・幸せ 등)는 넣지 않는다. */
const I_ADJECTIVES = [
  '楽しい', 'たのしい', '嬉しい', 'うれしい', '悲しい', 'かなしい', '寂しい', 'さびしい',
  '忙しい', 'いそがしい', '暑い', '熱い', '寒い', '涼しい', '暖かい', '温かい', 'あたたかい',
  'おいしい', '美味しい', 'まずい', '面白い', 'おもしろい', 'つまらない',
  '難しい', 'むずかしい', '易しい', 'やさしい', '優しい',
  'いい', '良い', 'よい', '悪い', '多い', '少ない', '早い', '速い', '遅い',
  '長い', '短い', '高い', '安い', '低い', '新しい', 'あたらしい', '古い',
  '大きい', '小さい', '近い', '遠い', '眠い', 'ねむい', 'すごい', '凄い',
  'かわいい', '可愛い', '素晴らしい', 'すばらしい', '怖い', 'こわい', '痛い',
  '強い', '弱い', '明るい', '暗い', '広い', '狭い', '重い', '軽い', '若い',
  'ひどい', '恥ずかしい', '珍しい', '美しい', 'うるさい', '苦しい', '悔しい',
  '懐かしい', '羨ましい', '気持ちいい', '気持ち良い', 'かっこいい', 'かっこ良い',
] as const;

/** 「〜くない / 〜じゃない」도 い형용사와 같은 방식으로 과거형을 만든다. */
const ADJ_LIKE = alternation([...I_ADJECTIVES, 'くない', 'じゃない', 'ではない', 'でない']);

const IRREGULAR_ADJ_PAST: Record<string, string> = {
  いい: 'よかった',
  よい: 'よかった',
  良い: 'よかった',
  かっこいい: 'かっこよかった',
  かっこ良い: 'かっこよかった',
  気持ちいい: '気持ちよかった',
  気持ち良い: '気持ちよかった',
};

/** 楽しい → 楽しかった. 형태를 확신할 수 없으면 null. */
function iAdjectivePast(word: string): string | null {
  const irregular = IRREGULAR_ADJ_PAST[word];
  if (irregular) return irregular;
  if (!word.endsWith('い')) return null;
  return `${word.slice(0, -1)}かった`;
}

/**
 * 과거 시간 표현 — 조사(は・、・に・も)가 바로 붙은 경우만 인정한다.
 * 「昨日買った服は高いです」처럼 시간 표현이 수식어로 쓰인 정상 문장을 건드리지 않기 위함이다.
 */
const PAST_TIME_MARKER =
  /(昨日|きのう|一昨日|おととい|先週|先月|去年|昨年|一昨年|先日|この前|さっき)(は|、|に|も)/;

/**
 * 현재·미래를 가리키거나 절이 이어지는 문장은 시제 규칙을 전부 건너뛴다.
 * (예: 「昨日は疲れたので早く寝ます」의 寝ます는 오늘 일일 수 있다)
 */
const NON_PAST_CONTEXT =
  /今|明日|あした|あす|本日|毎日|毎朝|毎晩|毎週|毎月|毎年|いつも|来週|来月|来年|予定|つもり|でしょう|ましょう|ください|かもしれ|と思|ようです|そうです|ています|ている|ありがとう|お願い|すみません|ので|から|けど|けれど|のに|ため|たら|なら|でも|が、|し、|て、/;

/** 문장 경계 — 앞 문장의 시간 표현이 뒤 문장으로 번지지 않게 자른다. */
const SENTENCE_BREAK = /[。！？.!?\n]/g;

/**
 * 과거 시간 표현이 **매치와 같은 문장 안에서, 매치보다 앞에** 있는지.
 *
 * 문장 전체를 보면 「昨日は雨でした。私は学生です。」의 学生です까지 과거로 바꿔버린다.
 * (앞 문장이 과거라고 뒤 문장까지 과거인 건 아니다.)
 */
function hasPastTimeMarker(match: RegExpMatchArray): boolean {
  const input = match.input ?? '';
  const head = input.slice(0, (match.index ?? 0) + (match[0] ?? '').length);
  let start = 0;
  SENTENCE_BREAK.lastIndex = 0;
  for (let m = SENTENCE_BREAK.exec(head); m; m = SENTENCE_BREAK.exec(head)) {
    start = m.index + m[0].length;
  }
  return PAST_TIME_MARKER.test(head.slice(start));
}

function textBefore(match: RegExpMatchArray): string {
  return (match.input ?? '').slice(0, match.index ?? 0);
}

/** 「〜です」를 「〜でした」로 바꿔도 안전한지 — 앞 글자가 명사처럼 끝나야 한다. */
const UNSAFE_BEFORE_DESHITA = /[いたっんなのてでるうくぐすつぬぶむ]$/;

/** 장소 명사(이동 목적지) 화이트리스트 — 통과·경유로 읽힐 수 있는 명사는 넣지 않는다. */
const DESTINATIONS = alternation([
  '学校', '会社', '病院', '図書館', '大学', '銀行', '郵便局', 'コンビニ', 'スーパー',
  'カフェ', 'レストラン', '映画館', '美容院', '美容室', 'ジム', '駅', '空港', '教室', '本屋',
]);

/** 사람·동물 명사 — 「ある」가 아니라 「いる」를 쓰는 대상만 모았다. */
const ANIMATE_NOUNS = alternation([
  '友達', 'ともだち', '友だち', '犬', '猫', 'ねこ', '子犬', '子猫',
  '赤ちゃん', '先生', '学生', 'お客さん', 'ペット',
]);

const ARU_TO_IRU: Record<string, string> = {
  ある: 'いる',
  あった: 'いた',
  あります: 'います',
  ありました: 'いました',
  ありません: 'いません',
  ありませんでした: 'いませんでした',
};

/** 사전형 + たい 오류를 고치기 위한 ます형 어간 표. */
const MASU_STEM: Record<string, string> = {
  行く: '行き', 来る: '来', する: 'し', 見る: '見', 食べる: '食べ', 飲む: '飲み',
  買う: '買い', 会う: '会い', 読む: '読み', 書く: '書き', 聞く: '聞き', 話す: '話し',
  遊ぶ: '遊び', 休む: '休み', 寝る: '寝', 帰る: '帰り', 作る: '作り', 撮る: '撮り',
  泳ぐ: '泳ぎ', 待つ: '待ち', 起きる: '起き', 出かける: '出かけ', なる: 'なり',
  もらう: 'もらい', 習う: '習い', 歌う: '歌い', 走る: '走り', 住む: '住み',
  使う: '使い', 送る: '送り', 始める: '始め', 続ける: '続け', 覚える: '覚え',
};

const DICT_VERBS = alternation(Object.keys(MASU_STEM));

/** 정중체 문장에 섞인 반말 종결 — 정중형으로 바꿔줄 수 있는 표현만 모았다. */
const PLAIN_ENDING_TO_POLITE: Record<string, string> = {
  楽しかった: '楽しかったです',
  嬉しかった: '嬉しかったです',
  うれしかった: 'うれしかったです',
  悲しかった: '悲しかったです',
  寂しかった: '寂しかったです',
  忙しかった: '忙しかったです',
  よかった: 'よかったです',
  良かった: '良かったです',
  おいしかった: 'おいしかったです',
  美味しかった: '美味しかったです',
  暑かった: '暑かったです',
  寒かった: '寒かったです',
  眠かった: '眠かったです',
  大変だった: '大変でした',
  幸せだった: '幸せでした',
  元気だった: '元気でした',
  疲れた: '疲れました',
  行った: '行きました',
  来た: '来ました',
  食べた: '食べました',
  見た: '見ました',
  会った: '会いました',
  買った: '買いました',
  帰った: '帰りました',
  飲んだ: '飲みました',
  読んだ: '読みました',
  寝た: '寝ました',
};

const PLAIN_ENDINGS = alternation(Object.keys(PLAIN_ENDING_TO_POLITE));

/** 문장 어딘가에 정중체가 쓰였는지 */
const POLITE_STYLE = /です|ます|でした|ました|ません/;

/* ------------------------------------------------------------------ */
/* 규칙                                                                 */
/* ------------------------------------------------------------------ */

export const JA_RULES: CorrectionRule[] = [
  // 1) 「友達を会う」→「友達に会う」 (한국어 "친구를 만나다"의 를 → を 직역)
  {
    id: 'ja-particle-wo-ni-au',
    language: 'ja',
    severity: 'major',
    // 会わせる(사역)·会得 같은 정상 표현은 어미가 달라 매치되지 않는다.
    pattern: /を(会いま|会いた|会う|会っ|会お)/,
    replace: 'に$1',
    explanationKo: '会う는 「〜に会う」로 써요. 한국어 "친구를 만나다"와 조사가 달라요.',
    reasonKo: 'を → に (会う)',
    keyExpression: {
      expression: '友達に会う',
      meaningKo: '친구를 만나다',
      example: '昨日、友達に会いました。',
    },
  },

  // 2) 「バスを乗る」→「バスに乗る」 ("버스를 타다")
  {
    id: 'ja-particle-wo-ni-noru',
    language: 'ja',
    severity: 'major',
    // 「電車を乗り換える」처럼 を를 쓰는 복합동사는 어미가 달라 걸리지 않는다.
    // 「飛行機を乗っ取る」「荷物を乗っける」는 を가 정상이라 乗っ 뒤를 확인한다.
    pattern: /を(乗りま|乗りた|乗る|乗っ(?![取け])|乗ろ)/,
    replace: 'に$1',
    explanationKo: '탈것에는 「〜に乗る」를 써요. バスに乗る, 電車に乗る처럼요.',
    reasonKo: 'を → に (乗る)',
    keyExpression: {
      expression: '電車に乗る',
      meaningKo: '전철을 타다',
      example: '駅で電車に乗りました。',
    },
  },

  // 3) 「学校を行く」→「学校に行く」 (목적지 화이트리스트만)
  {
    id: 'ja-particle-wo-ni-iku',
    language: 'ja',
    severity: 'major',
    // 「家と学校を行ったり来たりする」의 を는 정상이라 行っ 뒤에 たり가 오면 넘긴다.
    pattern: new RegExp(`(${DESTINATIONS})を(行きま|行きた|行く|行っ(?!たり)|行こ)`),
    replace: '$1に$2',
    explanationKo: '가는 곳에는 「〜に行く」를 써요. 「〜へ行く」도 좋아요.',
    reasonKo: 'を → に (行く)',
    keyExpression: {
      expression: '学校に行く',
      meaningKo: '학교에 가다',
      example: '毎朝、学校に行きます。',
    },
  },

  // 4) 「ソウルで住む」→「ソウルに住む」 (한국어 "서울에서 살다"의 에서 → で 직역)
  {
    id: 'ja-particle-de-ni-sumu',
    language: 'ja',
    severity: 'major',
    pattern: /で(住んで|住みま|住みた|住む|住んだ)/,
    replace: 'に$1',
    explanationKo: '사는 곳은 「〜に住む」로 표현해요. 「ソウルに住んでいます」처럼요.',
    reasonKo: 'で → に (住む)',
    keyExpression: {
      expression: '東京に住んでいます',
      meaningKo: '도쿄에 살고 있어요',
      example: '今は東京に住んでいます。',
    },
    // 「一人で住む」「家族で住む」의 で는 정상이라 이런 문장은 통째로 건너뛴다.
    skipIf: /(一人|ひとり|独り|二人|ふたり|三人|家族|みんな|皆|自分|夫婦|[0-9０-９]+人|人)で/,
  },

  // 5) 「日本語を好きです」→「日本語が好きです」
  {
    id: 'ja-particle-wo-ga-suki',
    language: 'ja',
    severity: 'major',
    // 정상 표현은 lookahead로 제외한다.
    // 「日本語を上手に話す」「得意とする」 → に・と
    // 「英語を上手く話せない」 → く (上手く는 부사라 を가 목적어로 정상)
    // 「彼女を好きだと言う」 → だと (인용절에서는 を도 자연스럽다)
    // 「権力をほしいままにする」 → ほしいまま (관용구)
    // 「できるだけ」「できる限り」 → だけ・限
    pattern:
      /を((?:大好き|大嫌い|好き|嫌い|上手|下手|得意|苦手)(?![にとく]|だと)|(?:欲しい|ほしい)(?!まま)|(?:でき|出来)(?:る|ます|ました|ません)(?!だけ|限))/,
    replace: 'が$1',
    explanationKo: '好き・上手・欲しい・できる 앞에는 が를 써요. 한국어의 "를"과 달라요.',
    reasonKo: 'を → が (好き・上手・できる)',
    keyExpression: {
      expression: '日本語が好きです',
      meaningKo: '일본어를 좋아해요',
      example: '私は日本語が好きです。',
    },
  },

  // 6) 「友達があります」→「友達がいます」 (사람·동물은 いる)
  {
    id: 'ja-aru-iru-animate',
    language: 'ja',
    severity: 'major',
    pattern: new RegExp(
      `(${ANIMATE_NOUNS})(が|は|も)(ありませんでした|ありません|ありました|あります|あった|ある(?=[。、！？]|$))`,
    ),
    replace: (match) => {
      const noun = match[1] ?? '';
      const particle = match[2] ?? '';
      const verb = ARU_TO_IRU[match[3] ?? ''];
      if (!verb) return null;
      return `${noun}${particle}${verb}`;
    },
    explanationKo: '사람이나 동물이 있을 때는 ある 대신 いる를 써요.',
    reasonKo: 'ある → いる (사람・동물)',
    keyExpression: {
      expression: '友達がいます',
      meaningKo: '친구가 있어요',
      example: '日本に友達がいます。',
    },
  },

  // 7) 「楽しいでした」→「楽しかったです」 / 「楽しいだった」→「楽しかった」
  {
    id: 'ja-i-adj-past-deshita',
    language: 'ja',
    severity: 'major',
    pattern: new RegExp(`(${ADJ_LIKE})(でした|だった)`),
    replace: (match) => {
      const past = iAdjectivePast(match[1] ?? '');
      if (!past) return null;
      return match[2] === 'でした' ? `${past}です` : past;
    },
    explanationKo: 'い형용사의 과거형은 「〜かったです」예요. 楽しい는 楽しかったです가 돼요.',
    reasonKo: 'い형용사 과거형',
    keyExpression: {
      expression: '楽しかったです',
      meaningKo: '즐거웠어요',
      example: '今日はとても楽しかったです。',
    },
  },

  // 8) 「昨日は楽しいです」→「昨日は楽しかったです」
  {
    id: 'ja-i-adj-past-by-time',
    language: 'ja',
    severity: 'major',
    pattern: new RegExp(`(${ADJ_LIKE})です(?=[。！？]|$)`),
    replace: (match) => {
      if (!hasPastTimeMarker(match)) return null;
      const past = iAdjectivePast(match[1] ?? '');
      if (!past) return null;
      return `${past}です`;
    },
    explanationKo: '昨日처럼 지난 일을 말할 때는 「〜かったです」로 바꿔요.',
    reasonKo: '과거 시제 (い형용사)',
    skipIf: NON_PAST_CONTEXT,
  },

  // 9) 「昨日、映画を見ます」→「見ました」 / 「昨日は雨です」→「雨でした」
  {
    id: 'ja-past-desu-masu',
    language: 'ja',
    severity: 'major',
    pattern: /(です|ます)(?=[。！？]|$)/,
    replace: (match) => {
      if (!hasPastTimeMarker(match)) return null;
      if (match[1] === 'ます') return 'ました';
      // い형용사·동사 뒤의 です는 형태가 달라지므로 여기서는 손대지 않는다.
      if (UNSAFE_BEFORE_DESHITA.test(textBefore(match))) return null;
      return 'でした';
    },
    explanationKo: '昨日・先週처럼 지난 일에는 ました, でした를 써요.',
    reasonKo: '과거 시제 (ました・でした)',
    keyExpression: {
      expression: '昨日は雨でした',
      meaningKo: '어제는 비가 왔어요',
      example: '昨日は雨でした。',
    },
    skipIf: NON_PAST_CONTEXT,
  },

  // 10) 「食べるたいです」→「食べたいです」 (사전형 + たい)
  {
    id: 'ja-dict-form-tai',
    language: 'ja',
    severity: 'major',
    pattern: new RegExp(`(${DICT_VERBS})たい`),
    replace: (match) => {
      const stem = MASU_STEM[match[1] ?? ''];
      if (!stem) return null;
      return `${stem}たい`;
    },
    explanationKo: 'たい는 ます형에 붙여요. 食べる는 食べたい, 行く는 行きたい가 돼요.',
    reasonKo: 'ます형 + たい',
    keyExpression: {
      expression: '行きたいです',
      meaningKo: '가고 싶어요',
      example: '今度、日本に行きたいです。',
    },
  },

  // 11) 「食べれる」→「食べられる」 (ら抜き言葉)
  {
    id: 'ja-ranuki-potential',
    language: 'ja',
    severity: 'minor',
    // 「見れば」처럼 정상인 형태는 뒤 글자로 걸러낸다. 切れる·入れる 등은 어간이 달라 걸리지 않는다.
    pattern:
      /(食べ|見|来|出|寝|起き|着|覚え|信じ|決め|考え|続け|止め|降り|借り|開け|閉め|教え|受け|集め|忘れ|始め|投げ|逃げ)れ(?=[るまなたて])/,
    replace: '$1られ',
    explanationKo: '글로 쓸 때는 「食べられる」처럼 ら를 넣은 형태가 자연스러워요.',
    reasonKo: 'ら抜き → 가능형',
    keyExpression: {
      expression: '食べられます',
      meaningKo: '먹을 수 있어요',
      example: '辛いものも食べられます。',
    },
  },

  // 12) 정중체 문장에 섞인 반말 종결 (「〜です。とても楽しかった。」)
  {
    id: 'ja-polite-consistency',
    language: 'ja',
    severity: 'minor',
    pattern: new RegExp(`(${PLAIN_ENDINGS})(?=[。！？]|$)`),
    replace: (match) => {
      // 다른 문장이 정중체일 때만 맞춰준다. 전부 반말이면 그대로 둔다.
      if (!POLITE_STYLE.test(match.input ?? '')) return null;
      return PLAIN_ENDING_TO_POLITE[match[1] ?? ''] ?? null;
    },
    explanationKo: 'です・ます체로 쓴 글에는 문장 끝도 정중형으로 맞추면 더 깔끔해요.',
    reasonKo: '정중체 통일 (です・ます)',
    keyExpression: {
      expression: '〜です / 〜ます',
      meaningKo: '정중한 말투',
      example: '今日は公園に行きました。とても楽しかったです。',
    },
  },
];
