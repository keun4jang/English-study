import { addDays, calcStreak, diffDays, isValidDateKey, monthInfo, toLocalDateKey } from '../dates';

describe('toLocalDateKey', () => {
  it('로컬 날짜를 YYYY-MM-DD로 변환', () => {
    expect(toLocalDateKey(new Date(2026, 7, 18))).toBe('2026-08-18');
    expect(toLocalDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('isValidDateKey', () => {
  it('유효한 날짜만 통과', () => {
    expect(isValidDateKey('2026-08-18')).toBe(true);
    expect(isValidDateKey('2026-02-30')).toBe(false);
    expect(isValidDateKey('not-a-date')).toBe(false);
  });
});

describe('addDays / diffDays', () => {
  it('월 경계를 넘는 계산', () => {
    expect(addDays('2026-08-31', 1)).toBe('2026-09-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('날짜 차이 계산', () => {
    expect(diffDays('2026-08-18', '2026-08-15')).toBe(3);
    expect(diffDays('2026-08-15', '2026-08-18')).toBe(-3);
  });
});

describe('monthInfo', () => {
  it('2026년 2월은 28일', () => {
    expect(monthInfo(2026, 2).daysInMonth).toBe(28);
  });
  it('2028년 2월은 윤년으로 29일', () => {
    expect(monthInfo(2028, 2).daysInMonth).toBe(29);
  });
});

describe('calcStreak', () => {
  it('오늘 포함 연속 작성일 계산', () => {
    expect(calcStreak(['2026-08-18', '2026-08-17', '2026-08-16'], '2026-08-18')).toBe(3);
  });

  it('오늘 아직 안 썼어도 어제까지 이어졌으면 streak 유지', () => {
    expect(calcStreak(['2026-08-17', '2026-08-16'], '2026-08-18')).toBe(2);
  });

  it('이틀 이상 비면 0', () => {
    expect(calcStreak(['2026-08-15'], '2026-08-18')).toBe(0);
  });

  it('기록 없으면 0', () => {
    expect(calcStreak([], '2026-08-18')).toBe(0);
  });
});
