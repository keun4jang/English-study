import { compareVersions } from '../updates';

describe('compareVersions', () => {
  it('patch 버전 비교', () => {
    expect(compareVersions('0.1.1', '0.1.0')).toBe(1);
    expect(compareVersions('0.1.0', '0.1.1')).toBe(-1);
    expect(compareVersions('0.1.0', '0.1.0')).toBe(0);
  });

  it('minor/major가 patch보다 우선', () => {
    expect(compareVersions('0.2.0', '0.1.9')).toBe(1);
    expect(compareVersions('1.0.0', '0.9.9')).toBe(1);
  });

  it('자릿수가 다른 버전도 비교', () => {
    expect(compareVersions('1.0', '1.0.0')).toBe(0);
    expect(compareVersions('1.0.1', '1.0')).toBe(1);
  });

  it('잘못된 값은 0으로 취급해 안전하게 비교', () => {
    expect(compareVersions('abc', '0.0.1')).toBe(-1);
  });
});
