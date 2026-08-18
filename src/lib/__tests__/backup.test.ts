import { DiaryEntry, SavedExpression } from '@/domain/types';
import { buildBackup, parseBackup } from '../backup';

function entry(id: string): DiaryEntry {
  return {
    id,
    ownerId: 'u1',
    title: 'My Day',
    originalText: 'I went home.',
    correctedText: null,
    finalText: 'I went home.',
    translationKo: null,
    localDate: '2026-08-18',
    emotion: 'calm',
    weather: 'none',
    tags: [],
    photos: [],
    visibility: 'private',
    isFavorite: false,
    language: 'en',
    inputMethod: 'typed',
    conversationId: null,
    status: 'saved',
    createdAt: '2026-08-18T10:00:00Z',
    updatedAt: '2026-08-18T10:00:00Z',
    deletedAt: null,
  };
}

function expression(id: string): SavedExpression {
  return {
    id,
    ownerId: 'u1',
    expression: 'go to a café',
    meaningKo: '카페에 가다',
    example: 'I go to a café.',
    language: 'en',
    sourceDiaryId: null,
    isFavorite: false,
    nextReviewDate: '2026-08-19',
    reviewCount: 0,
    createdAt: '2026-08-18T10:00:00Z',
  };
}

const empty = { diaries: [], expressions: [] };

describe('백업 내보내기/가져오기', () => {
  it('내보낸 백업을 그대로 가져올 수 있다', () => {
    const text = buildBackup({
      profile: { id: 'u1' },
      settings: {},
      diaries: [entry('d1'), entry('d2')],
      expressions: [expression('e1')],
    });
    const result = parseBackup(text, empty);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.diaries).toHaveLength(2);
      expect(result.expressions).toHaveLength(1);
      expect(result.diaries[0].finalText).toBe('I went home.');
    }
  });

  it('이미 있는 일기는 건너뛰어 기존 데이터를 덮어쓰지 않는다', () => {
    const text = buildBackup({
      profile: null,
      settings: {},
      diaries: [entry('d1'), entry('d2')],
      expressions: [],
    });
    const result = parseBackup(text, { diaries: [entry('d1')], expressions: [] });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.diaries).toHaveLength(1);
      expect(result.diaries[0].id).toBe('d2');
      expect(result.skipped).toBe(1);
    }
  });

  it('JSON이 아니면 안내 가능한 이유를 반환', () => {
    const result = parseBackup('그냥 텍스트', empty);
    expect(result).toEqual({ ok: false, reason: 'invalid-json' });
  });

  it('다른 앱의 JSON은 백업이 아니라고 판단', () => {
    const result = parseBackup(JSON.stringify({ hello: 'world' }), empty);
    expect(result).toEqual({ ok: false, reason: 'not-a-backup' });
  });

  it('형식은 맞지만 내용이 깨진 백업은 거부', () => {
    const broken = JSON.stringify({
      format: 'mellow-diary-backup',
      version: 1,
      exportedAt: '2026-08-18T10:00:00Z',
      diaries: [{ id: 'x' }],
      expressions: [],
    });
    const result = parseBackup(broken, empty);
    expect(result).toEqual({ ok: false, reason: 'invalid-content' });
  });

  it('빈 백업도 안전하게 처리', () => {
    const text = buildBackup({ profile: null, settings: {}, diaries: [], expressions: [] });
    const result = parseBackup(text, empty);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.diaries).toHaveLength(0);
  });
});
