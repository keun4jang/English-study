import { ChatMessage, DiaryEntry } from '@/domain/types';
import { calcStreakGenerous } from '../dates';
import { computeDailyProgress, countSentences } from '../goals';

const TODAY = '2026-08-18';

function msg(role: 'user' | 'assistant', createdAt: string): ChatMessage {
  return {
    id: Math.random().toString(),
    conversationId: 'c1',
    role,
    text: 'hello there',
    translationKo: null,
    correction: null,
    createdAt,
  };
}

function entry(partial: Partial<DiaryEntry>): DiaryEntry {
  return {
    id: Math.random().toString(),
    ownerId: 'u1',
    title: '',
    originalText: '',
    correctedText: null,
    finalText: 'One. Two! Three?',
    translationKo: null,
    localDate: TODAY,
    emotion: 'neutral',
    weather: 'none',
    tags: [],
    photos: [],
    visibility: 'private',
    isFavorite: false,
    language: 'en',
    inputMethod: 'typed',
    conversationId: null,
    status: 'saved',
    createdAt: `${TODAY}T10:00:00.000Z`,
    updatedAt: `${TODAY}T10:00:00.000Z`,
    deletedAt: null,
    ...partial,
  };
}

describe('countSentences', () => {
  it('영어/일본어 문장 부호 기준으로 센다', () => {
    expect(countSentences('I went home. It was fun!')).toBe(2);
    expect(countSentences('今日は楽しかった。友達と会った。')).toBe(2);
  });
  it('부호 없는 텍스트는 1문장', () => {
    expect(countSentences('short note')).toBe(1);
  });
  it('빈 텍스트는 0', () => {
    expect(countSentences('  ')).toBe(0);
  });
});

describe('computeDailyProgress', () => {
  it('오늘 보낸 내 메시지 + 오늘 직접 쓴 일기 문장을 합산', () => {
    const p = computeDailyProgress({
      messages: [
        msg('user', `${TODAY}T09:00:00`),
        msg('assistant', `${TODAY}T09:00:05`),
        msg('user', `${TODAY}T09:01:00`),
        msg('user', '2026-08-17T09:00:00'), // 어제 것은 제외
      ],
      entries: [entry({ finalText: 'One. Two.' })],
      today: TODAY,
      goal: 3,
    });
    expect(p.spoken).toBe(2);
    expect(p.written).toBe(2);
    expect(p.total).toBe(4);
    expect(p.achieved).toBe(true);
  });

  it('AI 대화 일기는 written에 중복 집계하지 않음', () => {
    const p = computeDailyProgress({
      messages: [],
      entries: [entry({ inputMethod: 'ai-chat', finalText: 'One. Two. Three.' })],
      today: TODAY,
      goal: 3,
    });
    expect(p.written).toBe(0);
    expect(p.achieved).toBe(false);
  });

  it('휴지통 일기는 제외', () => {
    const p = computeDailyProgress({
      messages: [],
      entries: [entry({ status: 'trashed' })],
      today: TODAY,
      goal: 1,
    });
    expect(p.total).toBe(0);
  });
});

describe('calcStreakGenerous (쉬어가기)', () => {
  it('하루 쉬어도 이어진다 (7일 구간당 1회)', () => {
    // 16일 빠짐: 17,15,14 기록 → 17 + (16 쉬어감) + 15 + 14 = streak 3, rest 1
    const r = calcStreakGenerous(['2026-08-17', '2026-08-15', '2026-08-14'], TODAY);
    expect(r.streak).toBe(3);
    expect(r.restDaysUsed).toBe(1);
  });

  it('이틀 연속 빠지면 끊긴다', () => {
    const r = calcStreakGenerous(['2026-08-17', '2026-08-13'], TODAY);
    expect(r.streak).toBe(1);
    expect(r.restDaysUsed).toBe(0);
  });

  it('오늘 아직 안 썼어도 어제까지 이어졌으면 유지', () => {
    const r = calcStreakGenerous(['2026-08-17', '2026-08-16'], TODAY);
    expect(r.streak).toBe(2);
  });

  it('막다른 쉬어가기는 소비하지 않는다', () => {
    // 오늘만 기록, 어제·그제 없음 → streak 1, rest 0
    const r = calcStreakGenerous([TODAY], TODAY);
    expect(r.streak).toBe(1);
    expect(r.restDaysUsed).toBe(0);
  });

  it('기록 없으면 0', () => {
    expect(calcStreakGenerous([], TODAY).streak).toBe(0);
  });
});
