import { LearningLanguage } from '@/domain/types';
import { doVerbOf } from './parse';
import { KoNoun, KoParse, KoSuggestion } from './types';

/**
 * 조각(KoParse)을 배울 언어의 문장으로 조립한다.
 *
 * 조립할 수 없으면 **빈 배열을 돌려준다**. 억지로 문장을 만들어 내지 않는다 —
 * 사용자는 그게 틀린 줄 모르고 그대로 일기에 쓰게 되고, 그건 도움이 아니라 피해다.
 */

/** 사전에 없던 단어는 대괄호로 남겨 사용자가 채우게 한다 */
function slot(noun: KoNoun | null, unknown: string[], index: number): string | null {
  if (noun) return noun.en;
  const word = unknown[index];
  return word ? `[${word}]` : null;
}

/**
 * 이미 서술어에 들어간 말을 뒤에 또 붙이지 않는다.
 * "회사에서 일했어" → "I worked at work"가 되는 식인데, 틀린 문장은 아니지만
 * 사람이 쓰지 않는 문장이라 예시로 보여줄 수 없다.
 */
function redundant(core: string, phrase: string): boolean {
  const head = phrase.replace(/^(at|to|with)\s+/, '').replace(/^(a|an|the|my)\s+/, '');
  return core.toLowerCase().includes(` ${head.toLowerCase()}`);
}

function joinSentence(parts: (string | null)[]): string {
  const body = parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  if (!body) return '';
  return `${body.charAt(0).toUpperCase()}${body.slice(1)}.`;
}

interface EnBuild {
  /** 주어 + 서술어 (I went to a café) */
  core: string;
  /** 뒤에 붙는 수식 (with a friend / at the gym) */
  tail: string[];
}

function buildEnglish(parse: KoParse): EnBuild | null {
  const past = parse.tense === 'past';
  const future = parse.tense === 'future';
  const tail: string[] = [];

  const withPerson =
    parse.person && parse.person.ko !== '혼자' ? `with ${parse.person.en}` : parse.person?.ko === '혼자' ? 'by myself' : null;

  // 1) 형용사 서술어 — "I was tired" / "It was fun"
  if (parse.adjective) {
    const isI = parse.adjective.subject === 'i';
    const subject = isI ? 'I' : 'It';
    // 축약형을 쓴다. "I am tired"는 문법은 맞지만 일기에서 아무도 그렇게 쓰지 않는다.
    let be: string;
    if (future) be = isI ? "I'll be" : "It'll be";
    else if (past) be = parse.negated ? `${subject} wasn't` : `${subject} was`;
    else if (parse.negated) be = isI ? "I'm not" : "It isn't";
    else be = isI ? "I'm" : "It's";
    const degree = parse.intensified && !parse.negated ? 'so ' : '';
    if (withPerson) tail.push(withPerson);
    if (parse.place) tail.push(`at ${parse.place.en}`);
    return { core: `${be} ${degree}${parse.adjective.en}`, tail };
  }

  // 2) 명사+하다 동사 — "I studied" / "I worked out"
  const doVerb = doVerbOf(parse);
  if (doVerb) {
    let core: string;
    if (future) core = `I'm going to ${doVerb.en.present}`;
    else if (parse.negated) core = past ? `I didn't ${doVerb.en.present}` : `I don't ${doVerb.en.present}`;
    else core = `I ${past ? doVerb.en.past : doVerb.en.present}`;
    if (withPerson) tail.push(withPerson);
    if (parse.place) tail.push(`at ${parse.place.en}`);
    return { core, tail };
  }

  // 3) 일반 동사
  const verb = parse.verb;
  if (!verb) return null;

  const conjugate = (rest: string | null): string => {
    const body = rest ? ` ${rest}` : '';
    // "I'm going to go to the hospital"은 문법은 맞지만 go가 두 번이라 아무도 안 쓴다
    if (future && verb.frame === 'go' && !parse.negated) return `I'm going${body}`;
    if (future) return `I'm going to ${verb.en.base}${body}`;
    if (parse.negated) return `I ${past ? "didn't" : "don't"} ${verb.en.base}${body}`;
    return `I ${past ? verb.en.past : verb.en.present}${body}`;
  };

  if (verb.frame === 'go') {
    const place = slot(parse.place, parse.unknown, 0);
    // 어디에 갔는지가 없으면 문장이 되지 않는다 — 지어내지 않고 포기한다
    if (!place) return null;
    const destination = parse.place?.bareDestination ? place : `to ${place}`;
    if (withPerson) tail.push(withPerson);
    return { core: conjugate(destination), tail };
  }

  if (verb.frame === 'meet') {
    const person = parse.person ? parse.person.en : parse.object ? parse.object.en : slot(null, parse.unknown, 0);
    if (!person) return null;
    if (parse.place) tail.push(`at ${parse.place.en}`);
    return { core: conjugate(person), tail };
  }

  if (verb.frame === 'transitive') {
    // "친구를 기다렸어"처럼 사람이 목적어인 경우도 있다
    const object = slot(parse.object ?? parse.person, parse.unknown, 0);
    if (!object) return null;
    if (withPerson && parse.object) tail.push(withPerson);
    if (parse.place) tail.push(`at ${parse.place.en}`);
    return { core: conjugate(object), tail };
  }

  // intransitive
  if (withPerson) tail.push(withPerson);
  if (parse.place) tail.push(parse.place.bareDestination ? `at ${parse.place.en}` : `at ${parse.place.en}`);
  return { core: conjugate(null), tail };
}

function buildJapanese(parse: KoParse): string | null {
  const past = parse.tense === 'past';
  const parts: string[] = [];
  if (parse.time) parts.push(parse.time.ja);
  if (parse.person && parse.person.ko !== '혼자') parts.push(`${parse.person.ja}と`);

  if (parse.adjective) {
    // 형용사 ja는 정중한 과거형 한 덩어리로 저장돼 있다
    if (parse.place) parts.push(`${parse.place.ja}は`);
    return `${parts.join('')}${parse.adjective.ja}。`;
  }

  const doVerb = doVerbOf(parse);
  if (doVerb) {
    if (parse.place) parts.push(`${parse.place.ja}で`);
    return `${parts.join('')}${past ? doVerb.ja.past : doVerb.ja.present}。`;
  }

  const verb = parse.verb;
  if (!verb) return null;

  if (verb.frame === 'go') {
    if (!parse.place) return null;
    parts.push(`${parse.place.ja}に`);
  } else if (verb.frame === 'meet') {
    if (!parse.person) return null;
  } else if (verb.frame === 'transitive') {
    if (!parse.object) return null;
    if (parse.place) parts.push(`${parse.place.ja}で`);
    parts.push(`${parse.object.ja}を`);
  } else if (parse.place) {
    parts.push(`${parse.place.ja}で`);
  }

  return `${parts.join('')}${past ? verb.ja.past : verb.ja.present}。`;
}

export function composeSuggestions(parse: KoParse, language: LearningLanguage): KoSuggestion[] {
  const usedUnknown = parse.unknown.slice(0, 1);

  if (language === 'ja') {
    const text = buildJapanese(parse);
    return text ? [{ text, unknown: usedUnknown }] : [];
  }

  const built = buildEnglish(parse);
  if (!built) return [];

  const time = parse.time?.en ?? null;
  const tail = built.tail.filter((phrase) => !redundant(built.core, phrase));
  const base = joinSentence([built.core, ...tail, time]);
  if (!base) return [];

  const suggestions: KoSuggestion[] = [{ text: base, unknown: usedUnknown }];

  // 두 번째 예시: 시간을 앞으로 빼서 자연스럽게 ("Today I went to a café.")
  if (time && !time.startsWith('in ') && !time.startsWith('at ') && !time.startsWith('over ')) {
    // 시간을 앞으로 빼면 그 뒤는 문장 첫 글자가 아니다 — 대문자를 되돌린다.
    // 단 'I'는 문장 어디에 있든 대문자다.
    const rest = /^I($|[\s'])/.test(built.core)
      ? built.core
      : `${built.core.charAt(0).toLowerCase()}${built.core.slice(1)}`;
    const fronted = joinSentence([
      `${time.charAt(0).toUpperCase()}${time.slice(1)}`,
      rest,
      ...tail,
    ]);
    if (fronted !== base) suggestions.push({ text: fronted, unknown: usedUnknown });
  }

  // 먹다는 had가 더 자주 쓰인다 — 같은 뜻의 다른 말도 보여 준다
  if (parse.verb?.id === 'eat' && parse.tense === 'past' && !parse.negated) {
    const casual = base.replace(/^I ate /, 'I had ');
    if (casual !== base) suggestions.push({ text: casual, unknown: usedUnknown });
  }

  return suggestions.slice(0, 3);
}
