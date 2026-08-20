import { hashPin, isValidPin, makeSalt, safeEqual } from '../appLock';

describe('PIN 해시', () => {
  it('같은 PIN·같은 소금이면 같은 해시', async () => {
    const salt = makeSalt();
    expect(await hashPin('1234', salt)).toBe(await hashPin('1234', salt));
  });

  it('소금이 다르면 해시가 다르다 (같은 PIN이라도)', async () => {
    expect(await hashPin('1234', makeSalt())).not.toBe(await hashPin('1234', makeSalt()));
  });

  it('PIN이 다르면 해시가 다르다', async () => {
    const salt = makeSalt();
    expect(await hashPin('1234', salt)).not.toBe(await hashPin('1235', salt));
  });

  it('해시에서 PIN을 읽을 수 없다', async () => {
    const hash = await hashPin('1234', makeSalt());
    expect(hash).not.toContain('1234');
  });

  it('소금은 매번 다르다', () => {
    expect(makeSalt()).not.toBe(makeSalt());
  });
});

describe('시간이 일정한 비교', () => {
  it('같으면 true', () => {
    expect(safeEqual('abc', 'abc')).toBe(true);
  });
  it('다르면 false', () => {
    expect(safeEqual('abc', 'abd')).toBe(false);
    expect(safeEqual('abc', 'ab')).toBe(false);
    expect(safeEqual('', 'a')).toBe(false);
  });
});

describe('PIN 형식', () => {
  it('숫자 4자리만 받는다', () => {
    expect(isValidPin('1234')).toBe(true);
    expect(isValidPin('123')).toBe(false);
    expect(isValidPin('12345')).toBe(false);
    expect(isValidPin('12a4')).toBe(false);
    expect(isValidPin('')).toBe(false);
  });
});
