/**
 * 날짜/시간대 유틸.
 * 저장은 UTC ISO timestamp, 달력 표시는 사용자 로컬 날짜(YYYY-MM-DD)를 사용한다.
 */

/** Date → 로컬 기준 YYYY-MM-DD */
export function toLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function todayKey(now: Date = new Date()): string {
  return toLocalDateKey(now);
}

export function isValidDateKey(key: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

export function addDays(key: string, days: number): string {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return toLocalDateKey(date);
}

/** 두 날짜 키의 차이 (a - b, 일 단위) */
export function diffDays(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  const da = Date.UTC(ay, am - 1, ad);
  const db = Date.UTC(by, bm - 1, bd);
  return Math.round((da - db) / 86_400_000);
}

/** 해당 월의 달력 그리드용 정보 */
export function monthInfo(year: number, month: number) {
  const first = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  return {
    /** 0=일요일 */
    firstWeekday: first.getDay(),
    daysInMonth,
  };
}

/**
 * 연속 작성일 계산: 오늘 또는 어제부터 거꾸로 이어진 날 수.
 * (오늘 아직 안 썼어도 어제까지 이어졌으면 streak 유지 — 죄책감 유발 방지)
 */
export function calcStreak(dateKeys: string[], today: string): number {
  const set = new Set(dateKeys);
  let start = today;
  if (!set.has(start)) {
    start = addDays(today, -1);
    if (!set.has(start)) return 0;
  }
  let streak = 0;
  let cursor = start;
  while (set.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** "YYYY-MM-DD" → 한국어 표시 (예: 2026년 8월 18일 화요일) */
export function formatDateKo(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  return `${y}년 ${m}월 ${d}일 ${weekdays[date.getDay()]}요일`;
}
