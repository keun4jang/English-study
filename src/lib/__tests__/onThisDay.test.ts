import { DiaryEntry } from '@/domain/types';
import { findMemory, monthsBefore } from '../onThisDay';

function entry(id: string, localDate: string): DiaryEntry {
  return {
    id,
    ownerId: 'u1',
    localDate,
    title: `일기 ${id}`,
    originalText: 'text',
    correctedText: null,
    finalText: 'text',
    translationKo: null,
    language: 'en',
    emotion: 'neutral',
    weather: 'none',
    tags: [],
    photos: [],
    visibility: 'private',
    isFavorite: false,
    inputMethod: 'typed',
    conversationId: null,
    status: 'saved',
    createdAt: `${localDate}T09:00:00.000Z`,
    updatedAt: `${localDate}T09:00:00.000Z`,
    deletedAt: null,
  };
}

describe('n개월 전 같은 날', () => {
  it('평범한 경우', () => {
    expect(monthsBefore('2026-08-19', 12)).toBe('2025-08-19');
    expect(monthsBefore('2026-08-19', 6)).toBe('2026-02-19');
    expect(monthsBefore('2026-01-15', 1)).toBe('2025-12-15');
    expect(monthsBefore('2026-08-19', 24)).toBe('2024-08-19');
  });

  it('그런 날짜가 없으면 없다고 한다 (2월 31일로 당기지 않는다)', () => {
    expect(monthsBefore('2026-03-31', 1)).toBeNull();
    expect(monthsBefore('2026-03-30', 1)).toBeNull();
    // 윤년이면 2월 29일은 있다
    expect(monthsBefore('2024-03-29', 1)).toBe('2024-02-29');
    expect(monthsBefore('2026-03-29', 1)).toBeNull();
  });

  it('잘못된 날짜 문자열은 null', () => {
    expect(monthsBefore('아무거나', 12)).toBeNull();
  });
});

describe('그날의 기억', () => {
  it('1년 전 오늘 쓴 일기를 찾는다', () => {
    const memories = findMemory([entry('a', '2025-08-19'), entry('b', '2026-01-02')], '2026-08-19');
    expect(memories).toHaveLength(1);
    expect(memories[0].entry.id).toBe('a');
    expect(memories[0].labelKo).toBe('1년 전 오늘');
  });

  it('1년을 안 채웠어도 몇 개월 전은 보여준다', () => {
    const memories = findMemory([entry('a', '2026-02-19')], '2026-08-19');
    expect(memories[0].labelKo).toBe('6개월 전 오늘');
  });

  it('오래된 것을 먼저 보여준다', () => {
    const memories = findMemory(
      [entry('recent', '2026-07-19'), entry('old', '2024-08-19')],
      '2026-08-19',
    );
    expect(memories[0].labelKo).toBe('2년 전 오늘');
    expect(memories[0].entry.id).toBe('old');
  });

  it('한 번에 두 개까지만 보여준다 (홈이 과거로 뒤덮이지 않게)', () => {
    const memories = findMemory(
      [entry('a', '2025-08-19'), entry('b', '2024-08-19'), entry('c', '2026-02-19')],
      '2026-08-19',
    );
    expect(memories).toHaveLength(2);
  });

  it('같은 날 여러 개를 썼어도 한 시점에서 하나만 고른다', () => {
    const memories = findMemory(
      [entry('a1', '2025-08-19'), entry('a2', '2025-08-19')],
      '2026-08-19',
      2,
    );
    expect(memories).toHaveLength(1);
  });

  it('없으면 빈 배열', () => {
    expect(findMemory([entry('a', '2026-08-18')], '2026-08-19')).toEqual([]);
  });
});
