import { DiaryEntry } from '@/domain/types';
import { buildShareText } from '../shareDiary';

function makeEntry(patch: Partial<DiaryEntry> = {}): DiaryEntry {
  return {
    id: 'e1',
    ownerId: 'u1',
    title: '',
    originalText: 'I go to park yesterday.',
    correctedText: 'I went to the park yesterday.',
    finalText: 'I went to the park yesterday.',
    translationKo: '어제 공원에 갔어요.',
    localDate: '2026-08-19',
    emotion: 'happy',
    weather: 'none',
    tags: [],
    photos: [],
    visibility: 'private',
    isFavorite: false,
    language: 'en',
    inputMethod: 'typed',
    conversationId: null,
    status: 'saved',
    createdAt: '2026-08-19T00:00:00.000Z',
    updatedAt: '2026-08-19T00:00:00.000Z',
    deletedAt: null,
    ...patch,
  };
}

describe('buildShareText', () => {
  it('일기 본문과 날짜를 포함한다', () => {
    const text = buildShareText(makeEntry(), { includeTranslation: false });
    expect(text).toContain('I went to the park yesterday.');
    expect(text).toContain('2026');
  });

  it('제목이 있으면 맨 위에 넣는다', () => {
    const text = buildShareText(makeEntry({ title: 'A quiet walk' }), {
      includeTranslation: false,
    });
    expect(text.split('\n')[0]).toBe('A quiet walk');
  });

  it('제목이 비어 있으면 빈 줄을 만들지 않는다', () => {
    const text = buildShareText(makeEntry({ title: '   ' }), { includeTranslation: false });
    expect(text.split('\n')[0]).not.toBe('');
  });

  it('includeTranslation=false면 한국어 뜻을 넣지 않는다', () => {
    const text = buildShareText(makeEntry(), { includeTranslation: false });
    expect(text).not.toContain('어제 공원에');
  });

  it('includeTranslation=true면 한국어 뜻을 함께 넣는다', () => {
    const text = buildShareText(makeEntry(), { includeTranslation: true });
    expect(text).toContain('어제 공원에 갔어요.');
  });

  it('번역이 없으면 includeTranslation=true여도 안전하다', () => {
    const text = buildShareText(makeEntry({ translationKo: null }), { includeTranslation: true });
    expect(text.trim().endsWith('yesterday.')).toBe(true);
  });

  it('사진 정보는 공유 텍스트에 포함하지 않는다', () => {
    const text = buildShareText(
      makeEntry({
        photos: [
          { id: 'p1', uri: 'file:///secret.jpg', isCover: true, createdAt: '2026-08-19T00:00:00.000Z' },
        ],
      }),
      { includeTranslation: true },
    );
    expect(text).not.toContain('secret.jpg');
  });
});
