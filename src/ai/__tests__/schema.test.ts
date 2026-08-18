import { aiTurnResponseSchema, fallbackTurnResponse, finalDiarySchema } from '../schema';

const validTurn = {
  detectedLanguage: 'en',
  transcript: 'I go cafe with my friend yesterday.',
  correction: {
    severity: 'major',
    original: 'I go cafe with my friend yesterday.',
    corrected: 'I went to a café with my friend yesterday.',
    explanationKo: '어제 일이라 go를 went로 바꿔요.',
    changedParts: [{ from: 'go', to: 'went', reasonKo: '과거 시제' }],
    keyExpressions: [
      { expression: 'go to a café', meaningKo: '카페에 가다', example: 'I often go to a café.' },
    ],
  },
  assistant: {
    replyTargetLanguage: 'That sounds nice!',
    replyKo: '좋았겠네요!',
    followUpQuestion: 'What did you talk about?',
    emotion: 'warm',
  },
  safety: { blocked: false, reason: null },
};

describe('aiTurnResponseSchema', () => {
  it('유효한 응답 통과', () => {
    expect(() => aiTurnResponseSchema.parse(validTurn)).not.toThrow();
  });

  it('severity가 잘못되면 거부', () => {
    const invalid = { ...validTurn, correction: { ...validTurn.correction, severity: 'huge' } };
    expect(() => aiTurnResponseSchema.parse(invalid)).toThrow();
  });

  it('필수 필드 누락 시 거부', () => {
    const { assistant: _assistant, ...withoutAssistant } = validTurn;
    expect(() => aiTurnResponseSchema.parse(withoutAssistant)).toThrow();
  });

  it('changedParts 기본값은 빈 배열', () => {
    const noChanged = {
      ...validTurn,
      correction: { ...validTurn.correction, changedParts: undefined, keyExpressions: undefined },
    };
    const parsed = aiTurnResponseSchema.parse(noChanged);
    expect(parsed.correction.changedParts).toEqual([]);
    expect(parsed.correction.keyExpressions).toEqual([]);
  });
});

describe('fallbackTurnResponse', () => {
  it('사용자 입력을 유지하며 스키마를 통과하는 fallback 생성', () => {
    const fallback = fallbackTurnResponse('My input text', 'en');
    expect(() => aiTurnResponseSchema.parse(fallback)).not.toThrow();
    expect(fallback.transcript).toBe('My input text');
    expect(fallback.correction.severity).toBe('correct');
  });
});

describe('finalDiarySchema', () => {
  it('유효한 최종 일기 응답 통과', () => {
    const valid = {
      titleCandidates: ['My Day'],
      simpleVersion: 'I went to a cafe.',
      naturalVersion: 'I went to a café with my friend.',
      translationKo: '친구와 카페에 갔다.',
      encouragementKo: '멋져요!',
    };
    const parsed = finalDiarySchema.parse(valid);
    expect(parsed.keyExpressions).toEqual([]);
    expect(parsed.practiceSentences).toEqual([]);
  });

  it('제목 후보는 최대 3개', () => {
    const invalid = {
      titleCandidates: ['a', 'b', 'c', 'd'],
      simpleVersion: 'x',
      naturalVersion: 'y',
      translationKo: 'z',
      encouragementKo: 'w',
    };
    expect(() => finalDiarySchema.parse(invalid)).toThrow();
  });
});
