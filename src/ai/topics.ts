import { LearningLanguage } from '@/domain/types';

/**
 * 내장 AI의 대화 사전.
 *
 * 사용자가 말한 내용에서 주제를 감지해 관련된 공감과 후속 질문을 고른다.
 * 외부 AI를 호출하지 않으므로 비용이 들지 않지만, 그만큼 사전의 폭이 대화 품질을 좌우한다.
 *
 * 원칙:
 * - 한 번에 질문은 하나만.
 * - 사용자가 말하지 않은 사실을 지어내지 않는다 (일반적인 질문/공감만).
 * - 같은 대화 안에서 같은 답변을 반복하지 않는다.
 */

export interface ReplyTemplate {
  reply: string;
  ko: string;
  question: string | null;
}

export interface Topic {
  id: string;
  pattern: RegExp;
  en: ReplyTemplate[];
  ja: ReplyTemplate[];
}

const t = (reply: string, ko: string, question: string | null): ReplyTemplate => ({
  reply,
  ko,
  question,
});

export const TOPICS: Topic[] = [
  {
    id: 'tired',
    pattern: /\b(tired|exhausted|sleepy|worn out|no energy)\b|疲れ|眠い|しんど/i,
    en: [
      t('You must be tired. I hope you can rest well tonight. What made today so tiring?', '많이 피곤하겠어요. 오늘 밤은 푹 쉬어요. 뭐가 제일 힘들었어요?', 'What made today so tiring?'),
      t('That sounds draining. Are you planning to sleep early tonight?', '지치는 하루였겠어요. 오늘은 일찍 잘 생각이에요?', 'Are you planning to sleep early tonight?'),
      t('Rest is important too. Did you get a chance to take a break today?', '쉬는 것도 중요해요. 오늘 잠깐이라도 쉴 틈이 있었어요?', 'Did you get a chance to take a break today?'),
    ],
    ja: [
      t('お疲れさまです。今日はゆっくり休んでくださいね。何が一番大変でしたか？', '수고했어요. 오늘은 푹 쉬어요. 뭐가 제일 힘들었어요?', '何が一番大変でしたか？'),
      t('大変でしたね。今日は早く寝られそうですか？', '힘들었겠네요. 오늘은 일찍 잘 수 있어요?', '今日は早く寝られそうですか？'),
    ],
  },
  {
    id: 'weather-hot',
    pattern: /\b(hot|heat|humid|sweat|sweating|boiling)\b|暑|蒸し暑/i,
    en: [
      t('The heat really takes it out of you. Did you drink enough water today?', '더위는 정말 사람을 지치게 하죠. 오늘 물은 충분히 마셨어요?', 'Did you drink enough water today?'),
      t('It has been so hot lately. How do you usually cool down?', '요즘 정말 덥죠. 보통 어떻게 더위를 식혀요?', 'How do you usually cool down?'),
    ],
    ja: [
      t('暑い日は大変ですね。水分はとりましたか？', '더운 날은 힘들죠. 수분은 챙겼어요?', '水分はとりましたか？'),
    ],
  },
  {
    id: 'weather-cold-rain',
    pattern: /\b(rain|rainy|raining|snow|cold|chilly|freezing|windy|weather)\b|雨|雪|寒|天気/i,
    en: [
      t('The weather really changes how a day feels. Did it affect your plans?', '날씨가 하루 기분을 좌우하죠. 계획에 영향이 있었어요?', 'Did it affect your plans?'),
      t('Days like that make me want to stay in. What did you do instead?', '그런 날은 집에 있고 싶어지죠. 대신 뭘 했어요?', 'What did you do instead?'),
    ],
    ja: [
      t('天気で気分が変わりますよね。予定に影響がありましたか？', '날씨 따라 기분이 달라지죠. 일정에 영향 있었어요?', '予定に影響がありましたか？'),
    ],
  },
  {
    id: 'food',
    pattern: /\b(eat|ate|eating|food|lunch|dinner|breakfast|delicious|meal|snack|cook|cooked|restaurant|hungry)\b|食べ|ごはん|昼食|夕食|料理|お腹/i,
    en: [
      t('Food is one of the best parts of a day. What did you have?', '먹는 건 하루의 큰 즐거움이죠. 뭘 먹었어요?', 'What did you have?'),
      t('That sounds good. Was it something you often eat?', '맛있었겠어요. 자주 먹는 거예요?', 'Was it something you often eat?'),
      t('Nice! Did you eat alone or with someone?', '좋네요! 혼자 먹었어요, 아니면 누구랑 같이 먹었어요?', 'Did you eat alone or with someone?'),
    ],
    ja: [
      t('おいしそうですね。何を食べましたか？', '맛있겠네요. 뭘 먹었어요?', '何を食べましたか？'),
      t('いいですね。だれかと一緒に食べましたか？', '좋네요. 누군가와 같이 먹었어요?', 'だれかと一緒に食べましたか？'),
    ],
  },
  {
    id: 'coffee-cafe',
    pattern: /\b(coffee|cafe|café|latte|americano|tea|dessert|cake)\b|カフェ|コーヒー|お茶/i,
    en: [
      t('A café can be such a nice break. What did you order?', '카페는 좋은 쉼표가 되죠. 뭘 주문했어요?', 'What did you order?'),
      t('That sounds relaxing. Do you go there often?', '여유로웠겠어요. 거기 자주 가요?', 'Do you go there often?'),
    ],
    ja: [
      t('カフェはいい息抜きになりますね。何を頼みましたか？', '카페는 좋은 휴식이 되죠. 뭘 주문했어요?', '何を頼みましたか？'),
    ],
  },
  {
    id: 'friend',
    pattern: /\b(friend|friends|buddy|met up|hang out|hung out)\b|友達|友だち/i,
    en: [
      t('Time with friends is precious. What did you do together?', '친구와 보내는 시간은 소중하죠. 같이 뭘 했어요?', 'What did you do together?'),
      t('That sounds fun. How long have you known each other?', '재밌었겠어요. 알고 지낸 지는 얼마나 됐어요?', 'How long have you known each other?'),
    ],
    ja: [
      t('友達と過ごす時間はいいですね。一緒に何をしましたか？', '친구와 보내는 시간 좋죠. 같이 뭘 했어요?', '一緒に何をしましたか？'),
    ],
  },
  {
    id: 'family',
    pattern: /\b(family|mom|mother|dad|father|sister|brother|parents|grandma|grandpa|son|daughter)\b|家族|母|父|姉|兄|妹|弟/i,
    en: [
      t('Family time can mean a lot. How was it?', '가족과의 시간은 특별하죠. 어땠어요?', 'How was it?'),
      t("That's nice to hear. What did you talk about?", '좋네요. 무슨 이야기를 나눴어요?', 'What did you talk about?'),
    ],
    ja: [
      t('家族と過ごす時間はいいですね。どうでしたか？', '가족과의 시간 좋죠. 어땠어요?', 'どうでしたか？'),
    ],
  },
  {
    id: 'work',
    pattern: /\b(work|worked|working|job|office|meeting|boss|colleague|project|deadline|overtime)\b|仕事|会議|残業|職場/i,
    en: [
      t('Sounds like a full day at work. How did it go?', '일로 꽉 찬 하루였네요. 어떻게 됐어요?', 'How did it go?'),
      t('Good job getting through it. Was there anything memorable?', '무사히 지나갔네요. 기억에 남는 일이 있었어요?', 'Was there anything memorable?'),
      t('Work can be a lot. Do you have anything left for tomorrow?', '일이 많았겠어요. 내일로 남은 일이 있어요?', 'Do you have anything left for tomorrow?'),
    ],
    ja: [
      t('お仕事お疲れさまです。どうでしたか？', '일 수고했어요. 어땠어요?', 'どうでしたか？'),
    ],
  },
  {
    id: 'study',
    pattern: /\b(study|studied|studying|school|class|exam|test|homework|university|college|english|japanese)\b|勉強|学校|授業|試験|宿題/i,
    en: [
      t('Studying takes real effort. What are you working on these days?', '공부는 꾸준함이 필요하죠. 요즘은 뭘 공부해요?', 'What are you working on these days?'),
      t('That sounds productive. Was it hard to focus today?', '알찬 시간이었네요. 오늘 집중은 잘 됐어요?', 'Was it hard to focus today?'),
    ],
    ja: [
      t('勉強、えらいですね。今はどんなことを勉強していますか？', '공부하다니 대단해요. 지금은 뭘 공부해요?', '今はどんなことを勉強していますか？'),
    ],
  },
  {
    id: 'exercise',
    pattern: /\b(exercise|workout|gym|run|running|ran|walk|walked|walking|yoga|swim|hike|hiking|bike)\b|運動|ジム|散歩|走/i,
    en: [
      t('Moving your body is a good habit. How did you feel afterwards?', '몸을 움직이는 건 좋은 습관이죠. 하고 나니 어땠어요?', 'How did you feel afterwards?'),
      t('Nice work. Do you do that often?', '멋져요. 자주 하는 편이에요?', 'Do you do that often?'),
    ],
    ja: [
      t('体を動かすのはいいですね。終わったあと、どんな気分でしたか？', '몸을 움직이는 건 좋죠. 끝나고 어떤 기분이었어요?', 'どんな気分でしたか？'),
    ],
  },
  {
    id: 'media',
    pattern: /\b(video|film|movie|shoot|shooting|filmed|youtube|vlog|drama|series|netflix|show|watch|watched)\b|動画|映画|ドラマ|見ました/i,
    en: [
      t('That sounds interesting. What was it about?', '흥미로운데요. 어떤 내용이었어요?', 'What was it about?'),
      t('Nice. Would you recommend it to someone else?', '좋네요. 다른 사람에게도 추천할 만해요?', 'Would you recommend it to someone else?'),
    ],
    ja: [
      t('面白そうですね。どんな内容でしたか？', '재밌겠네요. 어떤 내용이었어요?', 'どんな内容でしたか？'),
    ],
  },
  {
    id: 'music',
    pattern: /\b(music|song|listen|listened|concert|band|album|sing|sang|guitar|piano)\b|音楽|歌|コンサート/i,
    en: [
      t('Music really shapes a mood. What were you listening to?', '음악은 기분을 바꿔주죠. 뭘 듣고 있었어요?', 'What were you listening to?'),
      t('That sounds lovely. Do you listen while doing other things?', '좋네요. 다른 일 하면서도 자주 들어요?', 'Do you listen while doing other things?'),
    ],
    ja: [
      t('音楽は気分を変えてくれますね。何を聴きましたか？', '음악은 기분을 바꿔주죠. 뭘 들었어요?', '何を聴きましたか？'),
    ],
  },
  {
    id: 'travel',
    pattern: /\b(travel|trip|vacation|holiday|flight|airport|hotel|beach|abroad|tour|visited)\b|旅行|旅|空港|ホテル/i,
    en: [
      t('A trip always leaves something behind. What stood out the most?', '여행은 늘 무언가를 남기죠. 가장 기억에 남는 건 뭐예요?', 'What stood out the most?'),
      t('That sounds exciting. Would you go back again?', '설레는 이야기네요. 또 가고 싶어요?', 'Would you go back again?'),
    ],
    ja: [
      t('旅はいいですね。一番心に残ったことは何ですか？', '여행 좋죠. 가장 기억에 남는 건 뭐예요?', '一番心に残ったことは何ですか？'),
    ],
  },
  {
    id: 'shopping',
    pattern: /\b(shop|shopping|bought|buy|store|mall|market|clothes|shoes)\b|買い物|買った|お店/i,
    en: [
      t('Finding something you like feels good. What did you get?', '마음에 드는 걸 찾으면 기분 좋죠. 뭘 샀어요?', 'What did you get?'),
      t('Nice. Was it something you had been wanting?', '좋네요. 전부터 갖고 싶던 거예요?', 'Was it something you had been wanting?'),
    ],
    ja: [
      t('気に入るものが見つかるとうれしいですね。何を買いましたか？', '마음에 드는 걸 찾으면 기쁘죠. 뭘 샀어요?', '何を買いましたか？'),
    ],
  },
  {
    id: 'home-rest',
    pattern: /\b(home|house|room|rest|rested|relax|relaxed|nap|slept|sleep)\b|家|部屋|休/i,
    en: [
      t('A quiet day at home has its own value. How did you spend it?', '집에서 보내는 조용한 하루도 값지죠. 어떻게 보냈어요?', 'How did you spend it?'),
      t('Sounds peaceful. Did you get enough rest?', '평화로웠겠어요. 충분히 쉬었어요?', 'Did you get enough rest?'),
    ],
    ja: [
      t('家でゆっくりするのもいいですね。どんなふうに過ごしましたか？', '집에서 쉬는 것도 좋죠. 어떻게 보냈어요?', 'どんなふうに過ごしましたか？'),
    ],
  },
  {
    id: 'positive',
    pattern: /\b(happy|glad|great|fun|nice|good|amazing|excited|wonderful|lucky|proud|enjoyed|love|loved)\b|楽し|嬉し|良かった|最高/i,
    en: [
      t("I'm glad to hear that. What was the best moment?", '다행이에요. 가장 좋았던 순간은 뭐였어요?', 'What was the best moment?'),
      t('That sounds lovely. What made it so good?', '좋았겠네요. 뭐가 특히 좋았어요?', 'What made it so good?'),
      t('Days like that are worth remembering. Do you want to keep this one in your diary?', '그런 날은 기억해 둘 만해요. 오늘 일기에 남겨둘까요?', 'Do you want to keep this one in your diary?'),
    ],
    ja: [
      t('よかったですね。一番楽しかったことは何ですか？', '잘됐네요. 가장 즐거웠던 건 뭐예요?', '一番楽しかったことは何ですか？'),
      t('いいですね。どんなところがよかったですか？', '좋네요. 어떤 점이 좋았어요?', 'どんなところがよかったですか？'),
    ],
  },
  {
    id: 'negative',
    pattern: /\b(sad|bad|upset|angry|stress|stressed|hard|difficult|worried|anxious|lonely|disappointed|annoyed|hurt)\b|悲し|大変|辛|心配|寂し/i,
    en: [
      t("I'm sorry it was tough. Do you want to tell me more about it?", '힘들었겠어요. 조금 더 이야기해 줄래요?', 'Do you want to tell me more about it?'),
      t('That sounds heavy. Is there anything that helped, even a little?', '마음이 무거웠겠어요. 조금이라도 도움이 된 게 있었어요?', 'Is there anything that helped, even a little?'),
      t('Thank you for writing it down. How are you feeling now?', '적어줘서 고마워요. 지금은 기분이 어때요?', 'How are you feeling now?'),
    ],
    ja: [
      t('それは大変でしたね。もう少し聞かせてもらえますか？', '힘들었겠네요. 조금 더 들려줄래요?', 'もう少し聞かせてもらえますか？'),
      t('書いてくれてありがとうございます。今はどんな気持ちですか？', '적어줘서 고마워요. 지금은 어떤 기분이에요?', '今はどんな気持ちですか？'),
    ],
  },
  {
    id: 'busy',
    pattern: /\b(busy|rush|rushed|hurry|late|no time|packed)\b|忙し|急/i,
    en: [
      t('Busy days go by fast. Did you find a moment for yourself?', '바쁜 날은 훌쩍 지나가죠. 나를 위한 시간은 있었어요?', 'Did you find a moment for yourself?'),
      t('That sounds hectic. What kept you the busiest?', '정신없었겠어요. 뭐 때문에 제일 바빴어요?', 'What kept you the busiest?'),
    ],
    ja: [
      t('忙しい日は早く過ぎますね。自分の時間はありましたか？', '바쁜 날은 빨리 지나가죠. 내 시간은 있었어요?', '自分の時間はありましたか？'),
    ],
  },
  {
    id: 'pet',
    pattern: /\b(dog|cat|puppy|kitten|pet)\b|犬|猫|ペット/i,
    en: [
      t('Pets bring a special kind of comfort. What did they do today?', '반려동물은 특별한 위로가 되죠. 오늘은 뭘 했어요?', 'What did they do today?'),
    ],
    ja: [
      t('ペットはいやされますね。今日は何をしていましたか？', '반려동물은 위로가 되죠. 오늘은 뭘 하고 있었어요?', '今日は何をしていましたか？'),
    ],
  },
  {
    id: 'plan',
    pattern: /\b(tomorrow|next week|plan|planning|will|going to|hope)\b|明日|来週|予定|つもり/i,
    en: [
      t('It sounds like you have something ahead. What are you looking forward to?', '앞으로의 계획이 있군요. 어떤 게 기대돼요?', 'What are you looking forward to?'),
      t('Nice to have something planned. How do you feel about it?', '계획이 있다는 건 좋은 일이죠. 기분이 어때요?', 'How do you feel about it?'),
    ],
    ja: [
      t('予定があるんですね。何が楽しみですか？', '계획이 있군요. 뭐가 기대돼요?', '何が楽しみですか？'),
    ],
  },
];

/** 주제 미감지 시 쓰는 일반 반응 */
const GENERIC: Record<LearningLanguage, ReplyTemplate[]> = {
  en: [
    t('I see. Can you tell me a little more about that?', '그렇군요. 조금 더 이야기해 줄래요?', 'Can you tell me a little more about that?'),
    t('That sounds like a real moment from your day. How did you feel then?', '오늘의 한 장면이 그려지네요. 그때 기분이 어땠어요?', 'How did you feel then?'),
    t('Thank you for sharing. What happened after that?', '이야기해 줘서 고마워요. 그 다음엔 어떻게 됐어요?', 'What happened after that?'),
    t('Got it. Is there anything else you want to remember about today?', '알겠어요. 오늘 기억해 두고 싶은 게 또 있어요?', 'Is there anything else you want to remember about today?'),
  ],
  ja: [
    t('そうなんですね。もう少し詳しく教えてください。', '그렇군요. 조금 더 자세히 알려주세요.', 'もう少し詳しく教えてください。'),
    t('なるほど。そのとき、どんな気持ちでしたか？', '그렇군요. 그때 어떤 기분이었어요?', 'そのとき、どんな気持ちでしたか？'),
    t('話してくれてありがとうございます。そのあとはどうでしたか？', '이야기해 줘서 고마워요. 그 다음은 어땠어요?', 'そのあとはどうでしたか？'),
  ],
};

const EN_STOPWORDS = new Set([
  'the', 'and', 'but', 'for', 'with', 'was', 'were', 'this', 'that', 'today', 'yesterday',
  'very', 'really', 'just', 'have', 'has', 'had', 'been', 'because', 'about', 'then', 'when',
  'they', 'them', 'there', 'here', 'from', 'into', 'went', 'going', 'some', 'much', 'more',
  'time', 'like', 'want', 'good', 'nice', 'well', 'also', 'over', 'after', 'before',
]);

/** 주제를 못 찾았을 때 사용자의 말에서 인용할 핵심 단어 */
export function extractKeyword(text: string): string | null {
  const words = text
    .toLowerCase()
    .replace(/[^a-z\s']/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !EN_STOPWORDS.has(w));
  if (words.length === 0) return null;
  // 영어는 보통 목적어가 뒤에 오므로 마지막 후보를 고른다
  return words[words.length - 1];
}

export interface PickOptions {
  /** 이미 사용한 답변(중복 방지) */
  usedReplies?: Set<string>;
  /** 지금까지의 사용자 발화 수 (변화를 주기 위한 오프셋) */
  turnIndex?: number;
}

/**
 * 사용자 발화에 어울리는 반응을 고른다.
 * 1) 주제 감지 → 해당 주제의 답변 중 아직 안 쓴 것
 * 2) 미감지 → 핵심 단어를 인용한 질문
 * 3) 그래도 없으면 일반 반응
 */
export function pickReply(
  userText: string,
  language: LearningLanguage,
  options: PickOptions = {},
): ReplyTemplate {
  const used = options.usedReplies ?? new Set<string>();
  const turnIndex = options.turnIndex ?? 0;

  const matched = TOPICS.filter((topic) => topic.pattern.test(userText));
  // 여러 주제가 걸리면 턴에 따라 다른 주제를 골라 대화가 단조로워지지 않게 한다
  const ordered = matched.length > 0 ? [...matched.slice(turnIndex % matched.length), ...matched] : [];

  for (const topic of ordered) {
    const pool = language === 'en' ? topic.en : topic.ja;
    const fresh = pool.filter((r) => !used.has(r.reply));
    if (fresh.length > 0) return fresh[turnIndex % fresh.length];
  }

  if (language === 'en') {
    const keyword = extractKeyword(userText);
    if (keyword) {
      const reply = `You mentioned "${keyword}" — I'd love to hear more. What was it like?`;
      if (!used.has(reply)) {
        return t(reply, `"${keyword}" 이야기가 궁금해요. 어땠어요?`, 'What was it like?');
      }
    }
  }

  const generic = GENERIC[language];
  const fresh = generic.filter((r) => !used.has(r.reply));
  const pool = fresh.length > 0 ? fresh : generic;
  return pool[turnIndex % pool.length];
}
