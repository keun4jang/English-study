import { DiaryEntry } from '@/domain/types';

/**
 * 그날의 기억 (Day One의 "On This Day").
 *
 * 일기 앱에서 제일 오래 남는 기능이다. 쓰는 이유가 "쌓는 것"에서 "다시 읽는 것"으로
 * 바뀌는 순간이 있는데, 그 순간을 만드는 게 이 카드다.
 *
 * 다만 1년을 채운 사람만 볼 수 있으면 대부분의 사용자에게는 영원히 빈 기능이다.
 * 그래서 **1·3·6개월 전 오늘**도 함께 본다. 시작한 지 한 달만 지나도 뭔가 뜬다.
 *
 * 전부 기기 안 계산이다 — 서버도, 알림도, 외부 호출도 없다.
 */

export interface Memory {
  entry: DiaryEntry;
  /** "1년 전 오늘" 같은 라벨 */
  labelKo: string;
  /** 오래된 것부터 정렬할 때 쓰는 값 (개월 수) */
  monthsAgo: number;
}

interface Ymd {
  year: number;
  month: number;
  day: number;
}

function parse(key: string): Ymd | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

function format({ year, month, day }: Ymd): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * n개월 전 같은 날짜. 그런 날짜가 없으면 null.
 *
 * 3월 31일의 1개월 전은 2월 31일인데, 이런 날은 없다. 2월 28일로 당기면 "한 달 전 오늘"이
 * 아니라 그냥 다른 날이라 거짓말이 된다. 그래서 맞춰 주지 않고 없다고 한다.
 */
export function monthsBefore(key: string, months: number): string | null {
  const date = parse(key);
  if (!date) return null;
  const total = date.year * 12 + (date.month - 1) - months;
  const year = Math.floor(total / 12);
  const month = (total % 12) + 1;
  const daysInMonth = new Date(year, month, 0).getDate();
  if (date.day > daysInMonth) return null;
  return format({ year, month, day: date.day });
}

/** 몇 개월 전을 볼지 — 1년 단위를 먼저 보고, 없으면 짧은 주기도 본다 */
const LOOKBACK_MONTHS = [12, 24, 36, 48, 60, 6, 3, 1];

function labelFor(months: number): string {
  if (months >= 12 && months % 12 === 0) return `${months / 12}년 전 오늘`;
  return `${months}개월 전 오늘`;
}

/**
 * 오늘 보여줄 기억.
 *
 * 같은 날에 여러 개가 있으면 그중 하나만 고른다 — 카드를 여러 장 띄우면 홈이 과거로
 * 뒤덮인다. 여러 시점이 걸리면 **가장 오래된 것**을 고른다. 오래될수록 다시 읽는 값이 크다.
 */
export function findMemory(
  entries: DiaryEntry[],
  today: string,
  limit = 2,
): Memory[] {
  const byDate = new Map<string, DiaryEntry[]>();
  for (const entry of entries) {
    const list = byDate.get(entry.localDate);
    if (list) list.push(entry);
    else byDate.set(entry.localDate, [entry]);
  }

  const found: Memory[] = [];
  const usedIds = new Set<string>();
  for (const months of [...LOOKBACK_MONTHS].sort((a, b) => b - a)) {
    const key = monthsBefore(today, months);
    if (!key) continue;
    const candidates = byDate.get(key);
    if (!candidates?.length) continue;
    // 그날 여러 개를 썼다면 첫 번째 것만 (카드 한 장에 하나)
    const entry = candidates.find((e) => !usedIds.has(e.id));
    if (!entry) continue;
    usedIds.add(entry.id);
    found.push({ entry, labelKo: labelFor(months), monthsAgo: months });
    if (found.length >= limit) break;
  }
  return found;
}
