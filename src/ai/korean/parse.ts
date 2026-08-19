import { KoNoun, KoParse, KoVerb, Tense } from './types';
import { ADJECTIVES, DO_VERBS, PAST_ENDINGS, VERBS } from './verbs';
import { NOUN_INDEX, PEOPLE_INDEX, PLACE_INDEX, TIME_INDEX } from './words';

/**
 * 한국어 문장에서 조각(시간·사람·장소·목적어·서술어)을 뽑아낸다.
 *
 * 형태소 분석기를 넣지 않았다. 사전에 있는 표면형만 알아보고, 모르는 말은
 * `unknown`에 담아 **모른다고 말한다**. 어설프게 추측해서 엉뚱한 영어 문장을 만들어 주면
 * 사용자는 그게 틀린 줄도 모르고 그대로 일기에 쓰게 된다. 그게 제일 나쁘다.
 */

/** 조사 — 긴 것부터 떼어내야 '이랑'이 '랑'으로 잘리지 않는다 */
const PERSON_PARTICLES = ['이랑', '하고', '랑', '와', '과'];
const PLACE_PARTICLES = ['에서', '으로', '에', '로'];
const OBJECT_PARTICLES = ['를', '을'];
const TOPIC_PARTICLES = ['에게', '한테', '은', '는', '이', '가', '도', '만'];

const ALL_PARTICLES = [
  ...PERSON_PARTICLES,
  ...PLACE_PARTICLES,
  ...OBJECT_PARTICLES,
  ...TOPIC_PARTICLES,
].sort((a, b) => b.length - a.length);

interface Token {
  base: string;
  particle: string | null;
}

/** 조사를 떼어낸다. 사전에 그 형태 그대로 있으면 떼지 않는다 (예: '오늘은'이 아니라 '밖') */
export function splitParticle(word: string): Token {
  for (const particle of ALL_PARTICLES) {
    if (!word.endsWith(particle) || word.length <= particle.length) continue;
    const base = word.slice(0, -particle.length);
    // 조사를 뗀 결과가 사전에 있을 때만 인정한다 ('사과'를 '사'+'과'로 자르지 않도록)
    if (TIME_INDEX.has(base) || NOUN_INDEX.has(base)) return { base, particle };
  }
  return { base: word, particle: null };
}

interface Predicate {
  verb: KoVerb | null;
  doVerb: (typeof DO_VERBS)[number] | null;
  adjective: (typeof ADJECTIVES)[number] | null;
  tense: Tense;
  /** 문장에서 서술어가 차지한 부분 (남은 문장에서 잘라낸다) */
  matched: string;
}

/** 가장 긴 표면형이 이기도록 후보를 모아 비교한다 */
function findPredicate(text: string): Predicate | null {
  let best: Predicate | null = null;
  const take = (candidate: Predicate) => {
    if (!best || candidate.matched.length > best.matched.length) best = candidate;
  };

  for (const adjective of ADJECTIVES) {
    for (const form of adjective.forms) {
      if (text.includes(form)) {
        take({ verb: null, doVerb: null, adjective, tense: hasPastBatchim(form) ? 'past' : 'present', matched: form });
      }
    }
  }

  // 어미까지 붙여서 비교한다. '했'까지만 보면 '일했어요'(2자)가 '하다'의 '했어요'(3자)에게
  // 밀려서 "I did [일]"이라는 엉뚱한 문장이 나온다.
  const DO_SUFFIXES = [
    ['했어요', 'past'], ['했습니다', 'past'], ['했었어', 'past'], ['했어', 'past'], ['했다', 'past'], ['했음', 'past'], ['했', 'past'],
    ['해요', 'present'], ['한다', 'present'], ['해', 'present'],
    ['할 거', 'future'], ['하려고', 'future'],
  ] as const;
  for (const doVerb of DO_VERBS) {
    for (const [suffix, tense] of DO_SUFFIXES) {
      const form = doVerb.ko + suffix;
      if (text.includes(form)) {
        take({ verb: null, doVerb, adjective: null, tense, matched: form });
      }
    }
  }

  for (const verb of VERBS) {
    for (const ending of PAST_ENDINGS) {
      const form = verb.pastStem + ending;
      if (text.includes(form)) take({ verb, doVerb: null, adjective: null, tense: 'past', matched: form });
    }
    for (const form of verb.presentForms) {
      if (text.includes(form)) take({ verb, doVerb: null, adjective: null, tense: 'present', matched: form });
    }
    for (const stem of verb.futureStems) {
      if (text.includes(stem)) take({ verb, doVerb: null, adjective: null, tense: 'future', matched: stem });
    }
  }

  return best;
}

/**
 * 과거형인지 판정한다.
 *
 * '었/았'만 찾으면 '더웠어·했어·만났어'를 현재로 본다. 한국어 과거는 받침 ㅆ으로 드러나므로
 * 음절을 분해해서 종성이 ㅆ인지 본다. (가 0xAC00, 종성 28개 중 20번이 ㅆ)
 */
function hasPastBatchim(form: string): boolean {
  for (const ch of form) {
    const code = ch.charCodeAt(0) - 0xac00;
    if (code < 0 || code > 11171) continue;
    if (code % 28 === 20) return true;
  }
  return false;
}

/**
 * 서술어를 떼어낸 자리에 남는 어미 조각.
 * "운동했어" → 서술어 '운동했'을 빼면 '어'가 남는데, 이건 모르는 단어가 아니다.
 */
const LEFTOVER_ENDINGS = new Set([
  '어', '어요', '아', '아요', '요', '다', '야', '음', '습니다', '네', '네요',
  '고', '는데', '지만', '거', '걸', '까', '지', '겠', '더라', '구나', '군요',
]);

/** 문장 끝의 마침표·물결·이모지를 걷어내고 공백을 정리한다 */
function normalize(text: string): string {
  return text.replace(/[.!?~…\s]+$/u, '').replace(/\s+/g, ' ').trim();
}

export function parseKorean(input: string): KoParse {
  const source = normalize(input);
  const negated = /(^|\s)(안|못)\s|지\s?않|지\s?못/.test(source);

  // "너무 피곤해"의 '너무'는 버리면 문장의 세기가 사라진다 — so로 살린다
  const intensified = /(너무|진짜|정말|엄청|되게|완전)/.test(source);

  const predicate = findPredicate(source);
  const remainder = predicate ? source.split(predicate.matched).join(' ') : source;

  const parsed: KoParse = {
    source,
    time: null,
    person: null,
    place: null,
    object: null,
    verb: predicate?.verb ?? null,
    adjective: predicate?.adjective ?? null,
    tense: predicate?.tense ?? 'past',
    negated,
    intensified,
    unknown: [],
  };

  // 하다 동사(공부했어)는 KoVerb가 아니라 별도 표에 있어서, 조립할 때 쓰도록 여기 담아 둔다
  if (predicate?.doVerb) {
    (parsed as KoParse & { doVerb?: (typeof DO_VERBS)[number] }).doVerb = predicate.doVerb;
  }

  const goFrame = predicate?.verb?.frame === 'go';

  for (const raw of remainder.split(/\s+/)) {
    const word = raw.replace(/[^가-힣a-zA-Z0-9]/g, '');
    if (!word) continue;
    // 부정 표현과 정도 부사는 조각이 아니다
    if (['안', '못', '너무', '진짜', '정말', '좀', '조금', '엄청', '되게', '많이', '그냥', '다시', '또'].includes(word)) continue;

    const { base, particle } = splitParticle(word);

    const time = TIME_INDEX.get(base) ?? TIME_INDEX.get(word);
    if (time && !parsed.time) {
      parsed.time = time;
      continue;
    }

    // 사람은 조사를 가리지 않고 person으로 본다.
    // "친구랑"(랑)과 "친구를"(를)은 조사가 다르지만 둘 다 사람이고, 영어에서 어디에 놓일지는
    // 조사가 아니라 동사가 정한다(만나다 → 목적어, 가다 → with). 조사로 나누면 "친구를 만났어"가
    // 목적어로 잡혀 만나다 틀이 사람을 못 찾는다.
    const person = PEOPLE_INDEX.get(base);
    if (person) {
      if (!parsed.person) parsed.person = person;
      continue;
    }

    const noun = NOUN_INDEX.get(base);
    if (noun) {
      const isPlaceParticle = particle !== null && PLACE_PARTICLES.includes(particle);
      const isObjectParticle = particle !== null && OBJECT_PARTICLES.includes(particle);
      if (isPlaceParticle || (particle === null && goFrame && PLACE_INDEX.has(base))) {
        if (!parsed.place) parsed.place = noun;
      } else if (isObjectParticle || particle === null) {
        if (!parsed.object) parsed.object = noun;
      } else if (!parsed.object) {
        parsed.object = noun;
      }
      continue;
    }

    // 서술어를 잘라내고 남은 어미 조각(했'어', 갈 거'야')은 단어가 아니다
    if (LEFTOVER_ENDINGS.has(base)) continue;

    // 사전에 없는 말 — 지어내지 않고 모른다고 기록한다
    if (/[가-힣]/.test(base)) parsed.unknown.push(base);
  }

  return parsed;
}

/** parse 결과에 실린 '명사+하다' 동사 (타입 밖으로 새지 않도록 여기서만 꺼낸다) */
export function doVerbOf(parse: KoParse): (typeof DO_VERBS)[number] | null {
  return (parse as KoParse & { doVerb?: (typeof DO_VERBS)[number] }).doVerb ?? null;
}

export type { KoNoun };
