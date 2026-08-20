import { DiaryEntry } from '@/domain/types';
import { buildMoodTrend, moodGroup } from '../moodTrend';

function entry(id: string, localDate: string, emotion: DiaryEntry['emotion'], hour = 9): DiaryEntry {
  return {
    id, ownerId: 'u1', localDate, title: '', originalText: 't', correctedText: null,
    finalText: 't', translationKo: null, language: 'en', emotion, weather: 'none',
    tags: [], photos: [], visibility: 'private', isFavorite: false, inputMethod: 'typed',
    conversationId: null, status: 'saved',
    createdAt: `${localDate}T${String(hour).padStart(2, '0')}:00:00.000Z`,
    updatedAt: `${localDate}T09:00:00.000Z`, deletedAt: null,
  };
}

describe('감정 묶기', () => {
  it('세 갈래로만 나눈다', () => {
    expect(moodGroup('happy')).toBe('good');
    expect(moodGroup('grateful')).toBe('good');
    expect(moodGroup('neutral')).toBe('neutral');
    expect(moodGroup('tired')).toBe('hard');
    expect(moodGroup('angry')).toBe('hard');
  });
});

describe('감정 흐름', () => {
  it('요청한 날 수만큼 자리를 만든다 (기록 없는 날 포함)', () => {
    const trend = buildMoodTrend([], 30, '2026-08-19');
    expect(trend.days).toHaveLength(30);
    expect(trend.days.every((d) => d.group === null)).toBe(true);
    expect(trend.recorded).toBe(0);
  });

  it('오래된 날부터 정렬한다', () => {
    const trend = buildMoodTrend([], 3, '2026-08-19');
    expect(trend.days.map((d) => d.date)).toEqual(['2026-08-17', '2026-08-18', '2026-08-19']);
  });

  it('갈래별로 센다', () => {
    const trend = buildMoodTrend(
      [entry('a', '2026-08-19', 'happy'), entry('b', '2026-08-18', 'tired'), entry('c', '2026-08-17', 'neutral')],
      30,
      '2026-08-19',
    );
    expect(trend.counts).toEqual({ good: 1, neutral: 1, hard: 1 });
    expect(trend.recorded).toBe(3);
  });

  it('하루에 여러 개면 마지막에 쓴 것을 그날 감정으로 본다', () => {
    const trend = buildMoodTrend(
      [entry('아침', '2026-08-19', 'tired', 8), entry('밤', '2026-08-19', 'happy', 22)],
      7,
      '2026-08-19',
    );
    expect(trend.counts).toEqual({ good: 1, neutral: 0, hard: 0 });
  });

  it('기간 밖의 일기는 세지 않는다', () => {
    const trend = buildMoodTrend([entry('a', '2026-07-01', 'happy')], 7, '2026-08-19');
    expect(trend.recorded).toBe(0);
  });

  it('가장 자주 고른 감정을 알려준다', () => {
    const trend = buildMoodTrend(
      [entry('a', '2026-08-19', 'tired'), entry('b', '2026-08-18', 'tired'), entry('c', '2026-08-17', 'happy')],
      30,
      '2026-08-19',
    );
    expect(trend.topEmotion).toBe('tired');
  });
});
