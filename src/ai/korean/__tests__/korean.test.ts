import { composeFromFrame } from '../builder';
import { helpFromKorean } from '../index';
import { FOODS, PEOPLE, PLACES, THINGS, TIME_WORDS } from '../words';

/**
 * 한글 → 예시 문장 회귀 테스트.
 *
 * 이 엔진의 위험은 "틀린 영어를 자신 있게 보여주는 것"이다. 사용자는 그게 틀린 줄 모르고
 * 그대로 일기에 쓴다. 그래서 만들어 낸 문장은 전부 여기 고정해 두고, 못 만드는 문장은
 * **못 만든다는 사실 자체를** 고정한다.
 */

const first = (text: string) => helpFromKorean(text, 'en').suggestions[0]?.text ?? null;

describe('한국어 문장 → 영어 예시', () => {
  it.each([
    ['오늘 친구랑 카페 갔어', 'I went to a cafe with a friend today.'],
    ['오늘 친구랑 카페에 갔어요', 'I went to a cafe with a friend today.'],
    ['어제 엄마랑 마트에 갔다', 'I went to the store with my mom yesterday.'],
    ['점심에 김치찌개 먹었어', 'I ate kimchi stew at lunch.'],
    ['아침에 커피 마셨어', 'I drank coffee in the morning.'],
    ['저녁에 영화 봤어요', 'I watched a movie in the evening.'],
    ['밤에 책 읽었어', 'I read a book at night.'],
    ['친구를 만났어', 'I met a friend.'],
    ['주말에 집에서 쉬었어', 'I rested at home over the weekend.'],
    ['오늘 운동했어', 'I worked out today.'],
    ['어제 회사에서 일했어요', 'I worked yesterday.'],
    ['오늘 아무것도 안 했어', "I didn't do anything today."],
    ['내일 병원에 갈 거야', "I'm going to the hospital tomorrow."],
  ])('%s → %s', (input, expected) => {
    expect(first(input)).toBe(expected);
  });

  it('정도 부사(너무·진짜)는 so로 살린다', () => {
    expect(first('너무 피곤해')).toBe("I'm so tired.");
    expect(first('오늘 진짜 힘들었어')).toBe('It was so hard today.');
  });

  it('과거는 받침 ㅆ으로 판단한다 (었/았 말고도 웠·났·했)', () => {
    expect(first('오늘 날씨가 더웠어')).toBe('It was hot today.');
    expect(first('어제 친구를 만났어')).toBe('I met a friend yesterday.');
  });

  it('사람이 목적어면 목적어 자리에 넣고 with로 또 붙이지 않는다', () => {
    expect(first('친구를 만났어')).toBe('I met a friend.');
    expect(first('친구를 만났어')).not.toContain('with');
  });

  it('서술어에 이미 들어간 말을 뒤에 또 붙이지 않는다', () => {
    // "I worked at work"가 되면 안 된다
    expect(first('어제 회사에서 일했어요')).not.toContain('at work');
  });

  it('미래의 가다는 go를 두 번 쓰지 않는다', () => {
    expect(first('내일 병원에 갈 거야')).not.toContain('going to go');
  });

  it('시간을 앞으로 뺀 두 번째 예시에서도 I는 대문자다', () => {
    const suggestions = helpFromKorean('오늘 운동했어', 'en').suggestions;
    expect(suggestions[1]?.text).toBe('Today I worked out.');
  });

  it('먹다는 had 형태도 함께 보여준다', () => {
    const texts = helpFromKorean('점심에 김치찌개 먹었어', 'en').suggestions.map((s) => s.text);
    expect(texts).toContain('I had kimchi stew at lunch.');
  });
});

describe('만들 수 없을 때', () => {
  it('모르는 문장은 지어내지 않고 문장 만들기로 넘긴다', () => {
    const help = helpFromKorean('오늘 새로 산 신발이 마음에 들어', 'en');
    expect(help.suggestions).toHaveLength(0);
    expect(help.needsBuilder).toBe(true);
  });

  it('문장을 못 만들어도 아는 단어는 알려준다', () => {
    const help = helpFromKorean('오늘 신발이 마음에 들어', 'en');
    expect(help.words.some((w) => w.ko === '신발' && w.target === 'shoes')).toBe(true);
  });

  it('어디에 갔는지가 없으면 가다 문장을 만들지 않는다', () => {
    expect(helpFromKorean('갔어', 'en').suggestions).toHaveLength(0);
  });

  it('사전에 없는 단어는 대괄호로 남겨 사용자가 채우게 한다', () => {
    const help = helpFromKorean('오늘 떡볶이 먹었어', 'en');
    if (help.suggestions.length > 0) {
      expect(help.suggestions[0].text).toContain('[떡볶이]');
      expect(help.suggestions[0].unknown).toContain('떡볶이');
    }
  });
});

describe('문장 만들기', () => {
  it('고른 것만으로 문장이 된다', () => {
    expect(composeFromFrame('went', { time: '오늘', place: '카페', person: '친구' }, 'en')[0].text).toBe(
      'I went to a cafe with a friend today.',
    );
    expect(composeFromFrame('felt', { time: '오늘', feeling: '피곤하다' }, 'en')[0].text).toBe(
      'I was tired today.',
    );
    expect(composeFromFrame('did', { time: '오늘', activity: '운동', place: '헬스장' }, 'en')[0].text).toBe(
      'I worked out at the gym today.',
    );
    expect(composeFromFrame('met', { time: '어제', person: '동료' }, 'en')[0].text).toBe(
      'I met a coworker yesterday.',
    );
  });

  it('선택을 덜 해도 만들 수 있으면 만든다 (선택 항목은 건너뛸 수 있다)', () => {
    expect(composeFromFrame('went', { place: '학교' }, 'en')[0].text).toBe('I went to school.');
  });

  it('필수 선택이 비면 문장을 만들지 않는다', () => {
    expect(composeFromFrame('went', { time: '오늘' }, 'en')).toHaveLength(0);
    expect(composeFromFrame('felt', { time: '오늘' }, 'en')).toHaveLength(0);
  });

  it('일본어도 같은 틀로 만든다', () => {
    expect(composeFromFrame('ate', { time: '점심', object: '김밥' }, 'ja')[0].text).toBe('昼キンパを食べました。');
  });

  it('사전과 문장 만들기가 같은 영어를 내놓는다', () => {
    const fromKorean = helpFromKorean('오늘 친구랑 카페 갔어', 'en').suggestions[0].text;
    const fromBuilder = composeFromFrame('went', { time: '오늘', place: '카페', person: '친구' }, 'en')[0].text;
    expect(fromBuilder).toBe(fromKorean);
  });
});

describe('번들 폰트가 낼 수 있는 글자만 쓴다', () => {
  it('영어 단어에 ASCII 밖 글자가 없다', () => {
    // SUIT에 é·ñ 같은 확장 라틴이 없어서, 섞이면 그 한 글자만 시스템 폰트로 떨어진다
    const words = [...FOODS, ...THINGS, ...PLACES, ...PEOPLE, ...TIME_WORDS];
    const bad = words.filter((w) => /[^\x20-\x7E]/.test(w.en)).map((w) => `${w.ko}=${w.en}`);
    expect(bad).toEqual([]);
  });
});
