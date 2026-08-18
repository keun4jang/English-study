/**
 * 다시 말하기(재발화) 비교 로직.
 *
 * 주의: 이 비교는 "목표 문장 일치도"이며 과학적 발음 평가가 아니다.
 * 음소 단위 평가 없이 "발음 점수"라고 표시하지 않는다.
 */

const EN_CONTRACTIONS: [RegExp, string][] = [
  [/\bi'm\b/g, 'i am'],
  [/\byou're\b/g, 'you are'],
  [/\bwe're\b/g, 'we are'],
  [/\bthey're\b/g, 'they are'],
  [/\bit's\b/g, 'it is'],
  [/\bthat's\b/g, 'that is'],
  [/\bhe's\b/g, 'he is'],
  [/\bshe's\b/g, 'she is'],
  [/\bdon't\b/g, 'do not'],
  [/\bdoesn't\b/g, 'does not'],
  [/\bdidn't\b/g, 'did not'],
  [/\bcan't\b/g, 'cannot'],
  [/\bwon't\b/g, 'will not'],
  [/\bwouldn't\b/g, 'would not'],
  [/\bcouldn't\b/g, 'could not'],
  [/\bshouldn't\b/g, 'should not'],
  [/\bisn't\b/g, 'is not'],
  [/\baren't\b/g, 'are not'],
  [/\bwasn't\b/g, 'was not'],
  [/\bweren't\b/g, 'were not'],
  [/\bi've\b/g, 'i have'],
  [/\bi'll\b/g, 'i will'],
  [/\bi'd\b/g, 'i would'],
  [/\blet's\b/g, 'let us'],
];

/**
 * 비교용 정규화:
 * - 소문자화, 구두점 제거, 다중 공백 정리
 * - 영어 축약형 풀기
 * - 일본어는 공백 차이를 무시 (공백 제거)
 */
export function normalizeForComparison(text: string, language: 'en' | 'ja'): string {
  let t = text.toLowerCase().trim();
  if (language === 'en') {
    // 축약형 확장은 구두점(어포스트로피) 제거 전에 수행한다
    t = t.replace(/[’‘]/g, "'");
    for (const [pattern, replacement] of EN_CONTRACTIONS) {
      t = t.replace(pattern, replacement);
    }
  }
  // 유니코드 구두점 제거 (일본어 句読点 포함)
  t = t.replace(/[.,!?;:'"“”‘’«»、。！？・「」『』（）()\-–—…]/g, ' ');
  if (language === 'en') {
    t = t.replace(/\s+/g, ' ').trim();
  } else {
    // 일본어: 공백 자체를 비교에서 제외
    t = t.replace(/[\s　]+/g, '');
  }
  return t;
}

/** Levenshtein 거리 */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    prev = curr;
  }
  return prev[b.length];
}

/** 0~1 문자열 유사도 */
export function stringSimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

/** 목표 문장의 핵심 단어(3자 이상)가 얼마나 포함되었는지 0~1 */
export function keywordCoverage(target: string, spoken: string, language: 'en' | 'ja'): number {
  if (language === 'ja') {
    // 일본어는 단어 분리가 어려우므로 문자 2-gram 포함률 사용
    const grams: string[] = [];
    for (let i = 0; i < target.length - 1; i++) grams.push(target.slice(i, i + 2));
    if (grams.length === 0) return spoken.includes(target) ? 1 : 0;
    const hit = grams.filter((g) => spoken.includes(g)).length;
    return hit / grams.length;
  }
  const words = target.split(' ').filter((w) => w.length >= 3);
  if (words.length === 0) return 1;
  const spokenWords = new Set(spoken.split(' '));
  const hit = words.filter((w) => spokenWords.has(w)).length;
  return hit / words.length;
}

export interface MatchResult {
  /** 0~1 종합 일치도 (참고용 지표) */
  score: number;
  passed: boolean;
}

/**
 * 재발화 판정: 문자열 유사도(60%) + 핵심 단어 포함률(40%).
 * 정확히 같지 않아도 의미가 통하면 통과할 수 있게 임계값은 설정에서 조절 가능.
 */
export function matchSpokenSentence(
  target: string,
  spoken: string,
  language: 'en' | 'ja',
  threshold = 0.75,
): MatchResult {
  const nt = normalizeForComparison(target, language);
  const ns = normalizeForComparison(spoken, language);
  if (nt.length === 0 || ns.length === 0) return { score: 0, passed: false };
  const sim = stringSimilarity(nt, ns);
  const coverage = keywordCoverage(nt, ns, language);
  const score = sim * 0.6 + coverage * 0.4;
  return { score, passed: score >= threshold };
}
