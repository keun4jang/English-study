import { hangulRatio, isKoreanInput } from '../detect';

describe('한글 입력 감지', () => {
  it('한국어 문장을 잡는다', () => {
    for (const text of ['오늘 친구랑 카페 갔어', '너무 피곤해', '점심에 김치찌개 먹었어요']) {
      expect(isKoreanInput(text)).toBe(true);
    }
  });

  it('영어·일본어 문장은 통과시킨다', () => {
    for (const text of ['I went to a cafe today', 'It was so tiring', '今日は疲れました']) {
      expect(isKoreanInput(text)).toBe(false);
    }
  });

  it('영어 문장에 한글 고유명사 하나가 섞인 정도는 통과시킨다', () => {
    expect(isKoreanInput('I ate 김밥 for lunch today with my friend')).toBe(false);
  });

  it('한국어에 영어 단어가 섞여도 잡는다', () => {
    expect(isKoreanInput('오늘 cafe 갔어')).toBe(true);
  });

  it('글자가 없으면 0이다 (숫자·이모지만 있는 입력)', () => {
    expect(hangulRatio('123 😊 !!')).toBe(0);
    expect(isKoreanInput('123 😊 !!')).toBe(false);
  });
});
