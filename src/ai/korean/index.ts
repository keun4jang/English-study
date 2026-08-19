import { LearningLanguage } from '@/domain/types';
import { composeSuggestions } from './compose';
import { parseKorean, splitParticle } from './parse';
import { romanize } from './romanize';
import { KoHelp } from './types';
import { NOUN_INDEX, TIME_INDEX } from './words';

export { isKoreanInput, hangulRatio } from './detect';
export { parseKorean } from './parse';
export { buildFrames, composeFromFrame } from './builder';
export type { KoHelp, KoSuggestion } from './types';
export type { BuilderFrame, BuilderChoice, BuilderSelection } from './builder';

/**
 * 한국어 문장 하나를 받아 배울 언어의 예시 문장을 만든다.
 *
 * 외부 번역 API를 쓰지 않는다(비용 0원·오프라인). 사전과 문장 틀로 만들 수 있는 만큼만
 * 만들고, 못 만들면 `needsBuilder: true`로 알려서 화면이 '문장 만들기'로 안내하게 한다.
 */
export function helpFromKorean(text: string, language: LearningLanguage): KoHelp {
  const parse = parseKorean(text);
  const suggestions = composeSuggestions(parse, language);

  // 문장을 못 만들었어도 아는 단어는 알려준다 — 그것만으로도 시작할 수 있다
  const words: KoHelp['words'] = [];
  const seen = new Set<string>();
  for (const raw of parse.source.split(/\s+/)) {
    const word = raw.replace(/[^가-힣]/g, '');
    if (!word || seen.has(word)) continue;
    // 조사를 떼고 찾는다 — "신발이"는 그대로는 사전에 없다
    const { base } = splitParticle(word);
    const noun = NOUN_INDEX.get(base) ?? TIME_INDEX.get(base) ?? NOUN_INDEX.get(word) ?? TIME_INDEX.get(word);
    if (!noun) continue;
    seen.add(word);
    words.push({ ko: noun.ko, target: language === 'ja' ? noun.ja : noun.en });
  }

  // 장소·사람 자리에 온 모르는 말은 이름일 가능성이 높다 — 표기를 제안한다
  const nameHints = parse.unknown
    .filter((item) => item.role === 'place' || item.role === 'person')
    .map((item) => ({ ko: item.word, romanized: romanize(item.word) }));

  return {
    language,
    suggestions,
    needsBuilder: suggestions.length === 0,
    words,
    nameHints,
  };
}
