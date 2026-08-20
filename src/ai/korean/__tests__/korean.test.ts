import { BUILDER_CHOICE_NAMES, buildFrames, composeFromFrame } from '../builder';
import { helpFromKorean } from '../index';
import { splitParticle } from '../parse';
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
    const help = helpFromKorean('오늘 물회 먹었어', 'en');
    expect(help.suggestions[0].text).toBe('I ate [물회] today.');
    expect(help.suggestions[0].unknown).toEqual([{ word: '물회', romanized: null }]);
  });

  it('뜻이 거의 안 남는 문장은 내놓지 않는다', () => {
    // "I did ... today"만 남는다. 앱이 뭔가 이해한 것처럼 보여서 오히려 해롭다.
    const help = helpFromKorean('오늘 그거 했어', 'en');
    expect(help.suggestions).toHaveLength(0);
    expect(help.needsBuilder).toBe(true);
  });
});

describe('조사를 떼는 규칙', () => {
  it.each([
    ['떡볶이', '떡볶이', null],
    ['떡볶이를', '떡볶이', '를'],
    ['떡볶이랑', '떡볶이', '랑'],
    ['촬영을', '촬영', '을'],
    ['대구에서', '대구', '에서'],
    ['노을을', '노을', '을'],
    ['마을에', '마을', '에'],
    ['고양이가', '고양이', '가'],
    // 2글자 미만이 남는 분리는 하지 않는다 ('사과'를 '사'+'과'로 자르지 않기)
    ['사과', '사과', null],
  ])('%s → %s (+%s)', (word, base, particle) => {
    expect(splitParticle(word)).toEqual({ base, particle });
  });
});

describe('조사가 알려주는 자리를 지킨다', () => {
  /**
   * 실제로 있었던 버그: "오늘 대구에서 촬영을 했어"가
   * "I did [대구에서] today."가 됐다. 장소가 목적어 자리로 들어가고 목적어는 사라졌다.
   */
  it('모르는 장소가 목적어 자리를 차지하지 않는다', () => {
    const text = helpFromKorean('오늘 망원동에서 라면 먹었어', 'en').suggestions[0].text;
    expect(text).toBe('I ate ramen in [망원동] today.');
  });

  it('모르는 말이 둘이면 각자 제 자리에 들어간다', () => {
    const text = helpFromKorean('어제 망원동에서 물회를 먹었어', 'en').suggestions[0].text;
    expect(text).toBe('I ate [물회] in [망원동] yesterday.');
  });

  it('모르는 장소는 이름으로 적는 법을 알려준다', () => {
    const help = helpFromKorean('오늘 망원동에서 라면 먹었어', 'en');
    expect(help.suggestions[0].unknown).toEqual([{ word: '망원동', romanized: 'Mangwondong' }]);
  });

  it('문장을 못 만들어도 이름 표기는 알려준다', () => {
    const help = helpFromKorean('오늘 망원동에서 그거 했어', 'en');
    expect(help.suggestions).toHaveLength(0);
    expect(help.nameHints).toEqual([{ ko: '망원동', romanized: 'Mangwondong' }]);
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

describe("'명사 + 하다'는 띄어 써도 알아듣는다", () => {
  // 맞춤법은 붙여 쓰는 게 맞지만 실제로는 띄어 쓰는 사람이 훨씬 많다
  it.each([
    ['오늘 운동 했어', 'I worked out today.'],
    ['오늘 공부 했어요', 'I studied today.'],
    ['오늘 청소 했어', 'I cleaned today.'],
    ['어제 산책 했어', 'I took a walk yesterday.'],
    ['오늘 요리 했어', 'I cooked today.'],
  ])('%s → %s', (input, expected) => {
    expect(first(input)).toBe(expected);
  });

  it('붙여 쓴 것과 결과가 같다', () => {
    expect(first('오늘 운동 했어')).toBe(first('오늘 운동했어'));
  });

  it('사이에 낀 부정어를 잃지 않는다', () => {
    expect(first('오늘 운동 안 했어')).toBe("I didn't work out today.");
  });
});

describe('지명은 at이 아니라 in이다', () => {
  /**
   * 검증 단계에서 잡힌 문제다. 지명을 그냥 명사로 넣으면 "I went to Busan"은 맞지만
   * "~에서"가 들어간 순간 "at Busan"이 되어 전부 틀린 문장이 된다.
   */
  it('도시·동네·나라는 in을 쓴다', () => {
    expect(first('어제 부산에서 라면 먹었어')).toBe('I ate ramen in Busan yesterday.');
    expect(first('오늘 강남에서 친구 만났어')).toBe('I met a friend in Gangnam today.');
  });

  it('사전에 없는 장소도 in을 쓴다 (대개 지명이다)', () => {
    expect(first('어제 망원동에서 라면 먹었어')).toBe('I ate ramen in [망원동] yesterday.');
  });

  it('건물·가게는 그대로 at이다', () => {
    expect(first('오늘 카페에서 책 읽었어')).toBe('I read a book at a cafe today.');
  });

  it('가는 곳은 지명이든 가게든 to다', () => {
    expect(first('제주에 갔어')).toBe('I went to Jeju.');
    expect(first('오늘 카페에 갔어')).toBe('I went to a cafe today.');
  });
});

describe('넓힌 사전으로 실제 문장 만들기', () => {
  it.each([
    ['오늘 대구에서 촬영을 했어', 'I had a shoot in Daegu today.'],
    ['오늘 회의 했어', 'I had a meeting today.'],
    ['어제 야근했어', 'I worked late yesterday.'],
    ['오늘 너무 짜증났어', 'I was so annoyed today.'],
    ['오늘 출근 안 했어', "I didn't go to work today."],
    ['주말에 등산 갔어', 'I went hiking over the weekend.'],
    ['저녁에 회식 했어', 'I had a work dinner in the evening.'],
    ['오늘 좀 뿌듯했어', 'I was proud of myself today.'],
    ['오늘 설거지 했어', 'I did the dishes today.'],
    ['오늘 진짜 정신없었어', 'It was so hectic today.'],
    ['오늘 발표를 했어', 'I gave a presentation today.'],
  ])('%s → %s', (input, expected) => {
    expect(first(input)).toBe(expected);
  });

  it("'~을 하다'와 '~하다'와 '~ 하다'가 모두 같다", () => {
    expect(first('오늘 운동을 했어')).toBe('I worked out today.');
    expect(first('오늘 운동 했어')).toBe('I worked out today.');
    expect(first('오늘 운동했어')).toBe('I worked out today.');
  });

  it("'~ 갔어'로 말하는 활동도 알아듣는다", () => {
    expect(first('어제 여행 갔어')).toBe('I went on a trip yesterday.');
    expect(first('주말에 캠핑 갔어')).toBe('I went camping over the weekend.');
  });

  it('미래형에서 go를 두 번 쓰지 않는다', () => {
    expect(first('내일 출장 갈 거야')).toBe("I'm going on a business trip tomorrow.");
  });
});

describe('문장 만들기 선택지', () => {
  /**
   * 사전이 커지면서 한 단계에 칩이 90개까지 늘어난 적이 있다. 고르는 화면이 벽이 되면
   * "고르기만 하면 된다"는 이 기능의 이유가 사라진다.
   */
  it('한 단계의 선택지가 20개를 넘지 않는다', () => {
    for (const frame of buildFrames()) {
      for (const step of frame.steps) {
        expect({ frame: frame.id, step: step.id, count: step.choices.length }).toEqual({
          frame: frame.id,
          step: step.id,
          count: expect.any(Number),
        });
        expect(step.choices.length).toBeLessThanOrEqual(20);
        expect(step.choices.length).toBeGreaterThan(0);
      }
    }
  });

  it('골라 둔 이름이 모두 사전에 있다', () => {
    // 사전에서 표제어가 사라지면 칩이 조용히 없어진다 — 여기서 잡는다
    const counts = Object.entries(BUILDER_CHOICE_NAMES).map(([key, names]) => [key, names.length]);
    const actual: [string, number][] = [
      ['time', buildFrames()[0].steps[0].choices.length],
      ['place', buildFrames()[0].steps[1].choices.length],
      ['person', buildFrames()[0].steps[2].choices.length],
      ['food', buildFrames()[1].steps[1].choices.length],
      ['activity', buildFrames()[2].steps[1].choices.length],
      ['thing', buildFrames()[3].steps[1].choices.length],
      ['meetPerson', buildFrames()[4].steps[1].choices.length],
      ['feeling', buildFrames()[5].steps[1].choices.length],
    ];
    const expected = Object.fromEntries(counts);
    for (const [key, count] of actual) {
      expect({ key, count }).toEqual({ key, count: expected[key] });
    }
  });
});

describe('문장을 끝까지 못 읽으면 만들지 않는다', () => {
  /**
   * 실제로 보고된 사고:
   *   "오늘 여의도 한강 공원을 뛰면서 영상과 사진 촬영을 했어"
   *     → "I had a shoot in [뛰면서] today."
   * 한강·공원·영상·사진을 전부 알아보고도 자리가 찼다는 이유로 버린 뒤,
   * 남은 '뛰면서'를 장소 자리에 끼워 넣은 결과였다.
   */
  it('알아본 말을 버려야 하는 문장은 예시를 내놓지 않는다', () => {
    const help = helpFromKorean('오늘 여의도 한강 공원을 뛰면서 영상과 사진 촬영을 했어', 'en');
    expect(help.suggestions).toHaveLength(0);
    expect(help.cannotReason).toBe('too-complex');
  });

  it('무엇을 읽었는지는 알려준다 (되묻기에 쓴다)', () => {
    const help = helpFromKorean('오늘 여의도 한강 공원을 뛰면서 영상과 사진 촬영을 했어', 'en');
    expect(help.understood).toEqual(expect.arrayContaining(['오늘', '한강', '공원', '사진']));
  });

  it('절이 둘인 문장도 만들지 않는다', () => {
    expect(helpFromKorean('오늘 카페에서 책 읽고 집에 갔어', 'en').suggestions).toHaveLength(0);
    expect(helpFromKorean('밥 먹고 나서 산책했어', 'en').suggestions).toHaveLength(0);
  });

  it('같은 자리에 두 개가 오면 만들지 않는다', () => {
    // 장소가 둘 — 어느 쪽이 맞는지 알 수 없다
    expect(helpFromKorean('카페에서 공원에서 놀았어', 'en').suggestions).toHaveLength(0);
  });

  it('단문은 그대로 잘 만든다 (이 판정이 멀쩡한 문장을 막지 않는다)', () => {
    expect(first('오늘 친구랑 카페 갔어')).toBe('I went to a cafe with a friend today.');
    expect(first('점심에 김치찌개 먹었어')).toBe('I ate kimchi stew at lunch.');
    expect(first('어제 야근했어')).toBe('I worked late yesterday.');
    expect(first('오늘 너무 짜증났어')).toBe('I was so annoyed today.');
    expect(first('주말에 등산 갔어')).toBe('I went hiking over the weekend.');
  });
});
