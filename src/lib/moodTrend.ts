import { DiaryEntry, Emotion } from '@/domain/types';
import { addDays, todayKey } from '@/lib/dates';

/**
 * 감정 흐름 (Daylio의 기분 그래프에서 착안).
 *
 * 감정은 이미 일기마다 저장하고 있는데 어디서도 되돌려 보여주지 않았다. 넣기만 하고
 * 꺼내 보지 못하는 데이터는 사용자 입장에서 없는 것과 같다.
 *
 * 감정에 점수를 매기는 건 조심스럽다. "기쁨 5점, 속상함 1점"으로 줄 세우면 점수를 올리는
 * 게임이 되고, 그건 일기가 아니다. 그래서 **좋음/보통/힘듦 세 갈래로만** 나누고,
 * 평균이나 점수 대신 **어떤 날이 얼마나 있었는지**를 보여준다.
 */

export type MoodGroup = 'good' | 'neutral' | 'hard';

const GROUPS: Record<Emotion, MoodGroup> = {
  happy: 'good',
  excited: 'good',
  grateful: 'good',
  calm: 'good',
  neutral: 'neutral',
  tired: 'hard',
  sad: 'hard',
  anxious: 'hard',
  angry: 'hard',
};

export const MOOD_LABELS: Record<MoodGroup, string> = {
  good: '좋았던 날',
  neutral: '평범한 날',
  hard: '힘들었던 날',
};

export function moodGroup(emotion: Emotion): MoodGroup {
  return GROUPS[emotion] ?? 'neutral';
}

export interface MoodDay {
  date: string;
  /** 그날 쓴 일기가 없으면 null */
  group: MoodGroup | null;
}

export interface MoodTrend {
  /** 오래된 날부터 */
  days: MoodDay[];
  counts: Record<MoodGroup, number>;
  /** 기록이 있는 날 수 */
  recorded: number;
  /** 가장 자주 고른 감정 (기록이 없으면 null) */
  topEmotion: Emotion | null;
}

/**
 * 최근 n일의 감정 흐름.
 *
 * 하루에 여러 개를 썼으면 **마지막에 쓴 것**을 그날의 감정으로 본다. 하루의 끝에 남긴
 * 감정이 그날에 대한 최종 판단에 가깝다.
 */
export function buildMoodTrend(entries: DiaryEntry[], days = 30, today = todayKey()): MoodTrend {
  const latestOfDay = new Map<string, DiaryEntry>();
  for (const entry of entries) {
    const current = latestOfDay.get(entry.localDate);
    if (!current || entry.createdAt > current.createdAt) latestOfDay.set(entry.localDate, entry);
  }

  const window: MoodDay[] = [];
  const counts: Record<MoodGroup, number> = { good: 0, neutral: 0, hard: 0 };
  const emotionTally = new Map<Emotion, number>();

  for (let i = days - 1; i >= 0; i -= 1) {
    const date = addDays(today, -i);
    const entry = latestOfDay.get(date);
    if (!entry) {
      window.push({ date, group: null });
      continue;
    }
    const group = moodGroup(entry.emotion);
    counts[group] += 1;
    emotionTally.set(entry.emotion, (emotionTally.get(entry.emotion) ?? 0) + 1);
    window.push({ date, group });
  }

  let topEmotion: Emotion | null = null;
  let topCount = 0;
  for (const [emotion, count] of emotionTally) {
    if (count > topCount) {
      topCount = count;
      topEmotion = emotion;
    }
  }

  return {
    days: window,
    counts,
    recorded: counts.good + counts.neutral + counts.hard,
    topEmotion,
  };
}
