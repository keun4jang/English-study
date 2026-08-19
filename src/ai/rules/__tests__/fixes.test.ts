import { applyRules } from '../engine';
import { rulesFor } from '../index';

/**
 * 교정 회귀 테스트 — 자주 나오는 오류가 실제로 고쳐지는지 확인한다.
 *
 * corpus.test.ts가 "맞는 문장을 건드리지 않는다"를 지키고, 이 파일이 "틀린 문장은
 * 고친다"를 지킨다. 둘을 함께 통과해야 규칙을 넓힐 수 있다.
 */

type Case = [input: string, expected: string];

const EN_FIXES: Case[] = [
  // 시제
  ['I go to the park yesterday.', 'I went to the park yesterday.'],
  ['Yesterday I eat an apple.', 'Yesterday I ate an apple.'],
  ["I didn't went home.", "I didn't go home."],
  // 수 일치
  ['She go to school every day.', 'She goes to school every day.'],
  ['It make me happy.', 'It makes me happy.'],
  ['There is many people.', 'There are many people.'],
  // 관사
  ['Yesterday I ate a apple.', 'Yesterday I ate an apple.'],
  // 전치사
  ['I listened music.', 'I listened to music.'],
  ['I arrived to the station.', 'I arrived at the station.'],
  // 자주 나오는 오류
  ['I want go home.', 'I want to go home.'],
  ['I need buy some milk.', 'I need to buy some milk.'],
  ['I hope see you soon.', 'I hope to see you soon.'],
  ['I enjoy to read books.', 'I enjoy reading books.'],
  ['I finished to write my report.', 'I finished writing my report.'],
  ['I practice to speak English.', 'I practice speaking English.'],
  ['I did a mistake at work.', 'I made a mistake at work.'],
  ['I am interested on photography.', 'I am interested in photography.'],
  ['I study english every days.', 'I study English every day.'],
  ['I very like coffee.', 'I really like coffee.'],
  ['I am boring today.', 'I am bored today.'],
];

/** 입력 보정 — 교정 카드에 "틀렸다"고 띄우지 않고 조용히 되돌린다 */
const EN_NORMALIZED: Case[] = [
  ["I m so tired today.", "I'm so tired today."],
  ['it s a nice day.', "It's a nice day."],
  ['yesterday i felt calm.', 'Yesterday I felt calm.'],
];

describe('영어 오류 교정', () => {
  it.each(EN_FIXES)('%s → %s', (input, expected) => {
    const result = applyRules(input, 'en', rulesFor('en'));
    expect(result.corrected).toBe(expected);
    expect(result.appliedRuleIds.length).toBeGreaterThan(0);
    expect(result.severity).not.toBe('correct');
  });

  it.each(EN_FIXES)('교정 시 한국어 설명이 함께 나온다: %s', (input) => {
    const result = applyRules(input, 'en', rulesFor('en'));
    expect(result.explanations.length).toBeGreaterThan(0);
    expect(result.changes.length).toBeGreaterThan(0);
  });
});

describe('입력 보정은 교정으로 세지 않는다', () => {
  it.each(EN_NORMALIZED)('%s → %s', (input, expected) => {
    const result = applyRules(input, 'en', rulesFor('en'));
    expect(result.corrected).toBe(expected);
    expect(result.appliedRuleIds).toEqual([]);
    expect(result.severity).toBe('correct');
  });
});

describe('같은 오류가 여러 번 나와도 모두 고친다', () => {
  const REPEATED: Case[] = [
    ['Yesterday I go to school and I go to the park.', 'Yesterday I went to school and I went to the park.'],
    ['I ate sandwich and I ate cookie.', 'I ate a sandwich and I ate a cookie.'],
    ['I listened music and my friend listened music too.', 'I listened to music and my friend listened to music too.'],
    ['I want go home and I want sleep early.', 'I want to go home and I want to sleep early.'],
    ['There is many people and there is many cars.', 'There are many people and there are many cars.'],
  ];

  it.each(REPEATED)('%s → %s', (input, expected) => {
    const result = applyRules(input, 'en', rulesFor('en'));
    expect(result.corrected).toBe(expected);
    expect(result.changes.length).toBeGreaterThanOrEqual(2);
  });

  it('같은 규칙이 두 번 적용돼도 규칙 id는 한 번만 기록한다', () => {
    const result = applyRules('I listened music and my friend listened music too.', 'en', rulesFor('en'));
    expect(result.appliedRuleIds).toEqual(['en-prep-listen-to']);
  });

  it('규칙이 자기 출력을 다시 고쳐 무한 반복하지 않는다', () => {
    // 이미 고쳐진 문장을 다시 넣어도 더 이상 바뀌지 않아야 한다
    const once = applyRules('I want go home and I want sleep early.', 'en', rulesFor('en'));
    const twice = applyRules(once.corrected, 'en', rulesFor('en'));
    expect(twice.corrected).toBe(once.corrected);
    expect(twice.appliedRuleIds).toEqual([]);
  });
});

describe('한 문장에서 여러 규칙이 함께 적용된다', () => {
  it('시제와 관사를 동시에 고친다', () => {
    const result = applyRules('Yesterday I eat a apple.', 'en', rulesFor('en'));
    expect(result.corrected).toBe('Yesterday I ate an apple.');
    expect(result.appliedRuleIds.length).toBeGreaterThanOrEqual(2);
  });

  it('major 오류가 하나라도 있으면 severity는 major', () => {
    const result = applyRules('I want go home.', 'en', rulesFor('en'));
    expect(result.severity).toBe('major');
  });
});
