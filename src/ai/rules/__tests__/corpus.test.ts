import { applyRules } from '../engine';
import { rulesFor } from '../index';

/**
 * 오탐 회귀 테스트 — "이미 맞는 문장"을 엔진이 건드리면 안 된다.
 *
 * 교정 앱에서 가장 나쁜 실패는 맞는 문장을 틀렸다고 고치는 것이다. 사용자가 배운 것을
 * 되돌리게 만들고 신뢰를 잃는다. 새 규칙을 추가할 때 이 테스트가 깨지면 규칙이 너무
 * 넓은 것이므로, 문장을 예외로 빼지 말고 규칙을 좁혀야 한다.
 */

/** 대문자/마침표 보완만 남기고 비교하기 위한 정규화 */
function normalize(text: string): string {
  return text.trim().replace(/[.。]$/, '').toLowerCase();
}

const CORRECT_EN = [
  // 기본 시제
  'I went to the park yesterday.',
  'I go to school every day.',
  'She goes to the gym on Mondays.',
  'They were watching a movie when I called.',
  'I have lived here for three years.',
  'I had already eaten when he arrived.',
  'It was raining all afternoon.',
  'I will call you tomorrow.',
  "I'm going to visit my grandmother next week.",
  'He has been studying Japanese since March.',
  // 수 일치
  'My friends are coming over tonight.',
  'There is a cat on the roof.',
  'There are two cats on the roof.',
  'Everyone was tired after the trip.',
  'The news was surprising.',
  'My family is very supportive.',
  'Each of the students has a notebook.',
  'Neither answer is correct.',
  // 관사
  'I ate an apple for breakfast.',
  'I bought a new book yesterday.',
  'The coffee at that cafe is amazing.',
  'I need to buy some milk.',
  'She is a university student.',
  'It took an hour to get there.',
  'I went for a 30 minute walk.',
  'I read a news article about it.',
  'Music makes me happy.',
  'I love listening to music.',
  'I have homework to do.',
  'We had rice and soup for dinner.',
  // 전치사
  'I arrived at the station at 7 pm.',
  'I arrived in Tokyo on Monday.',
  'I met her in 2019.',
  'I waited for the bus for twenty minutes.',
  'I listened to a podcast on the way home.',
  'I am interested in photography.',
  'It depends on the weather.',
  'I got on the train at Shibuya.',
  'She lives in a small town near the sea.',
  // 자연스러움
  'I had a great time with my friends.',
  'I was so tired that I fell asleep early.',
  'The weather was nice, so I went outside.',
  'I felt happy today.',
  'I am looking forward to the weekend.',
  'I could not sleep well last night.',
  'It made me think about my goals.',
  'I decided to take a walk after dinner.',
  'Today was a quiet day.',
  'Nothing special happened, but I felt calm.',
];

const CORRECT_JA = [
  '今日は公園に行きました。',
  '友だちと映画を見ました。',
  '朝ごはんにパンを食べました。',
  '天気がよかったので散歩しました。',
  '仕事が忙しかったです。',
  '日本語の勉強を続けています。',
  '昨日は早く寝ました。',
  'コーヒーを飲みながら本を読みました。',
];

describe('오탐 방지 — 맞는 영어 문장은 그대로 둔다', () => {
  it.each(CORRECT_EN)('%s', (sentence) => {
    const result = applyRules(sentence, 'en', rulesFor('en'));
    expect({ corrected: normalize(result.corrected), rules: result.appliedRuleIds }).toEqual({
      corrected: normalize(sentence),
      rules: [],
    });
  });
});

describe('오탐 방지 — 맞는 일본어 문장은 그대로 둔다', () => {
  it.each(CORRECT_JA)('%s', (sentence) => {
    const result = applyRules(sentence, 'ja', rulesFor('ja'));
    expect({ corrected: normalize(result.corrected), rules: result.appliedRuleIds }).toEqual({
      corrected: normalize(sentence),
      rules: [],
    });
  });
});

describe('규칙 정의 위생', () => {
  const all = [...rulesFor('en'), ...rulesFor('ja')];

  it('규칙 id가 중복되지 않는다', () => {
    const ids = all.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('모든 규칙에 한국어 설명과 사유가 있다', () => {
    for (const rule of all) {
      expect(rule.explanationKo.trim().length).toBeGreaterThan(0);
      expect(rule.reasonKo.trim().length).toBeGreaterThan(0);
    }
  });

  it('전역(g) 플래그를 쓰지 않는다 — 엔진은 첫 매치만 치환한다', () => {
    for (const rule of all) {
      expect({ id: rule.id, flags: rule.pattern.flags }).toEqual({
        id: rule.id,
        flags: rule.pattern.flags.replace(/g/, ''),
      });
    }
  });
});
