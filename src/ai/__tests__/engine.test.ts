import { applyRules, toCorrectionResult } from '../rules/engine';
import { CorrectionRule } from '../rules/types';

const RULES: CorrectionRule[] = [
  {
    id: 'test-go-went',
    language: 'en',
    severity: 'major',
    pattern: /\bI go\b/,
    replace: 'I went',
    explanationKo: '어제 일이라 went를 써요.',
    reasonKo: '과거 시제',
  },
  {
    id: 'test-cafe',
    language: 'en',
    severity: 'major',
    pattern: /\bwent (cafe|café)\b/,
    replace: 'went to a $1',
    explanationKo: '장소 앞에 to a를 넣으면 자연스러워요.',
    reasonKo: '전치사와 관사',
    keyExpression: { expression: 'go to a café', meaningKo: '카페에 가다', example: 'I go to a café.' },
  },
  {
    id: 'test-very-fun',
    language: 'en',
    severity: 'minor',
    pattern: /\bvery fun\b/,
    replace: 'really fun',
    explanationKo: '"really fun"이 조금 더 자연스러워요.',
    reasonKo: '자연스러운 표현',
  },
  {
    id: 'test-skip',
    language: 'en',
    severity: 'major',
    pattern: /\bwater\b/,
    replace: 'some water',
    explanationKo: '설명',
    reasonKo: '이유',
    skipIf: /\bsome water\b/,
  },
  {
    id: 'test-ja',
    language: 'ja',
    severity: 'major',
    pattern: /楽しいでした/,
    replace: '楽しかったです',
    explanationKo: '형용사 과거형은 「楽しかったです」예요.',
    reasonKo: '형용사 과거형',
  },
];

describe('교정 엔진', () => {
  it('한 문장의 여러 오류를 함께 고친다', () => {
    const r = applyRules('I go cafe yesterday', 'en', RULES);
    expect(r.corrected).toBe('I went to a cafe yesterday.');
    expect(r.appliedRuleIds).toEqual(['test-go-went', 'test-cafe']);
    expect(r.changes).toHaveLength(2);
    expect(r.severity).toBe('major');
  });

  it('minor 규칙만 걸리면 severity는 minor', () => {
    const r = applyRules('It was very fun', 'en', RULES);
    expect(r.corrected).toBe('It was really fun.');
    expect(r.severity).toBe('minor');
  });

  it('고칠 게 없으면 severity는 correct로 남는다', () => {
    const r = applyRules('I had a great day.', 'en', RULES);
    expect(r.severity).toBe('correct');
    expect(r.changes).toHaveLength(0);
    expect(r.corrected).toBe('I had a great day.');
  });

  it('첫 글자 대문자와 마침표를 보완하되 교정으로 세지 않는다', () => {
    const r = applyRules('it was a good day', 'en', RULES);
    expect(r.corrected).toBe('It was a good day.');
    expect(r.severity).toBe('correct');
  });

  it('이미 마침표/물음표가 있으면 덧붙이지 않는다', () => {
    expect(applyRules('How are you?', 'en', RULES).corrected).toBe('How are you?');
    expect(applyRules('Great!', 'en', RULES).corrected).toBe('Great!');
  });

  it('skipIf에 걸리면 규칙을 적용하지 않는다', () => {
    const r = applyRules('I drank some water', 'en', RULES);
    expect(r.corrected).toBe('I drank some water.');
    expect(r.appliedRuleIds).not.toContain('test-skip');
  });

  it('다른 언어의 규칙은 적용하지 않는다', () => {
    const r = applyRules('I go cafe', 'ja', RULES);
    expect(r.appliedRuleIds).toHaveLength(0);
  });

  it('일본어는 마침표로 。를 쓴다', () => {
    const r = applyRules('昨日は楽しいでした', 'ja', RULES);
    expect(r.corrected).toBe('昨日は楽しかったです。');
    expect(r.severity).toBe('major');
  });

  it('중복 공백을 정리한다', () => {
    const r = applyRules('I  had   lunch', 'en', RULES);
    expect(r.corrected).toBe('I had lunch.');
  });

  it('빈 입력에도 안전하다', () => {
    const r = applyRules('   ', 'en', RULES);
    expect(r.severity).toBe('correct');
    expect(r.changes).toHaveLength(0);
  });

  it('CorrectionResult로 변환하면 설명과 표현이 담긴다', () => {
    const r = applyRules('I go cafe', 'en', RULES);
    const result = toCorrectionResult('I go cafe', r);
    expect(result.original).toBe('I go cafe');
    expect(result.corrected).toBe('I went to a cafe.');
    expect(result.explanationKo).toContain('went');
    expect(result.keyExpressions[0].expression).toBe('go to a café');
    expect(result.changedParts).toHaveLength(2);
  });

  it('같은 설명이 두 번 들어가지 않는다', () => {
    const dup: CorrectionRule[] = [
      { ...RULES[0], id: 'a' },
      { ...RULES[0], id: 'b', pattern: /\bI eat\b/, replace: 'I ate' },
    ];
    const r = applyRules('I go and I eat', 'en', dup);
    expect(r.explanations).toHaveLength(1);
  });
});
