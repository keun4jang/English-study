import { romanize } from '../romanize';

describe('로마자 표기', () => {
  it.each([
    ['대구', 'Daegu'],
    ['서울', 'Seoul'],
    ['부산', 'Busan'],
    ['인천', 'Incheon'],
    ['광주', 'Gwangju'],
    ['대전', 'Daejeon'],
    ['제주', 'Jeju'],
    ['강남', 'Gangnam'],
    ['홍대', 'Hongdae'],
    ['명동', 'Myeongdong'],
    ['수원', 'Suwon'],
    ['춘천', 'Chuncheon'],
  ])('%s → %s', (input, expected) => {
    expect(romanize(input)).toBe(expected);
  });

  it('받침이 다음 글자로 넘어간다 (연음)', () => {
    expect(romanize('종로')).toBe('Jongro');
    expect(romanize('한강')).toBe('Hangang');
  });

  it('한글이 아니면 그대로 둔다', () => {
    expect(romanize('CGV')).toBe('CGV');
  });

  it('빈 문자열은 빈 문자열이다', () => {
    expect(romanize('')).toBe('');
  });
});
