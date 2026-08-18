import {
  keywordCoverage,
  levenshtein,
  matchSpokenSentence,
  normalizeForComparison,
  stringSimilarity,
} from '../textSimilarity';

describe('normalizeForComparison', () => {
  it('영어: 소문자화, 구두점 제거, 다중 공백 정리', () => {
    expect(normalizeForComparison('  Hello,   World!  ', 'en')).toBe('hello world');
  });

  it('영어: 축약형을 풀어서 비교', () => {
    expect(normalizeForComparison("I'm happy", 'en')).toBe('i am happy');
    expect(normalizeForComparison("don't go", 'en')).toBe('do not go');
  });

  it('일본어: 공백 차이를 무시', () => {
    expect(normalizeForComparison('今日は 楽しかった。', 'ja')).toBe(
      normalizeForComparison('今日は楽しかった', 'ja'),
    );
  });
});

describe('levenshtein / stringSimilarity', () => {
  it('동일 문자열은 거리 0, 유사도 1', () => {
    expect(levenshtein('abc', 'abc')).toBe(0);
    expect(stringSimilarity('abc', 'abc')).toBe(1);
  });

  it('빈 문자열 처리', () => {
    expect(levenshtein('', 'abc')).toBe(3);
    expect(stringSimilarity('', '')).toBe(1);
  });
});

describe('keywordCoverage', () => {
  it('핵심 단어 포함률 계산', () => {
    expect(keywordCoverage('went cafe friend', 'went cafe friend yesterday', 'en')).toBe(1);
    expect(keywordCoverage('went cafe friend', 'went home', 'en')).toBeCloseTo(1 / 3);
  });
});

describe('matchSpokenSentence', () => {
  const target = 'I went to a café with my friend yesterday.';

  it('대소문자/구두점 차이는 통과', () => {
    const result = matchSpokenSentence(target, 'i went to a cafe with my friend yesterday', 'en');
    expect(result.passed).toBe(true);
  });

  it('축약형 차이는 유연하게 처리', () => {
    const result = matchSpokenSentence("I'm going to the park", 'I am going to the park', 'en');
    expect(result.passed).toBe(true);
    expect(result.score).toBeGreaterThan(0.95);
  });

  it('전혀 다른 문장은 실패', () => {
    const result = matchSpokenSentence(target, 'The weather is nice today', 'en');
    expect(result.passed).toBe(false);
  });

  it('빈 발화는 실패', () => {
    expect(matchSpokenSentence(target, '', 'en').passed).toBe(false);
  });

  it('임계값 조정 가능', () => {
    const spoken = 'I went to a cafe with friend';
    const lenient = matchSpokenSentence(target, spoken, 'en', 0.6);
    const strict = matchSpokenSentence(target, spoken, 'en', 0.98);
    expect(lenient.passed).toBe(true);
    expect(strict.passed).toBe(false);
  });

  it('일본어: 공백 차이 통과', () => {
    const result = matchSpokenSentence('昨日、友達とカフェに行きました。', '昨日 友達と カフェに 行きました', 'ja');
    expect(result.passed).toBe(true);
  });
});
