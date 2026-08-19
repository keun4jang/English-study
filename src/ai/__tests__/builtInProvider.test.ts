import { BuiltInAIProvider } from '../builtInProvider';
import { AiTurnContext } from '../provider';
import { aiTurnResponseSchema } from '../schema';

const baseCtx: AiTurnContext = {
  language: 'en',
  level: 'beginner',
  intensity: 'balanced',
  recentMessages: [],
  conversationSummary: null,
  requestId: 'test-request-1',
};

describe('BuiltInAIProvider', () => {
  const provider = new BuiltInAIProvider();

  it('내장 AI로 식별된다', () => {
    expect(provider.name).toBe('builtin');
  });

  it('과거 시제 오류를 major로 교정한다', async () => {
    const res = await provider.evaluateAndReply('I go to the park yesterday.', baseCtx);
    expect(res.correction.severity).toBe('major');
    expect(res.correction.corrected).toContain('went');
    expect(res.correction.explanationKo.length).toBeGreaterThan(0);
  });

  it('맞는 문장은 교정하지 않는다', async () => {
    const res = await provider.evaluateAndReply('I went to the park yesterday.', baseCtx);
    expect(res.correction.severity).toBe('correct');
    expect(res.correction.changedParts).toEqual([]);
  });

  it('응답이 스키마를 만족한다', async () => {
    const res = await provider.evaluateAndReply('I am so tired today.', baseCtx);
    expect(() => aiTurnResponseSchema.parse(res)).not.toThrow();
  });

  it('사용자가 말한 주제에 맞는 답을 고른다', async () => {
    const res = await provider.evaluateAndReply('I am so tired today.', baseCtx);
    expect(res.assistant.replyTargetLanguage.toLowerCase()).toMatch(/tir|rest|sleep|drain/);
  });

  it('이미 한 답변은 다시 쓰지 않는다', async () => {
    const first = await provider.evaluateAndReply('I am so tired today.', baseCtx);
    const second = await provider.evaluateAndReply('I am still tired.', {
      ...baseCtx,
      recentMessages: [
        { role: 'user', text: 'I am so tired today.' },
        { role: 'assistant', text: first.assistant.replyTargetLanguage },
      ],
    });
    expect(second.assistant.replyTargetLanguage).not.toBe(first.assistant.replyTargetLanguage);
  });

  it('일본어도 교정과 답변을 돌려준다', async () => {
    const res = await provider.evaluateAndReply('今日は疲れました。', {
      ...baseCtx,
      language: 'ja',
    });
    expect(res.detectedLanguage).toBe('ja');
    expect(res.assistant.replyTargetLanguage.length).toBeGreaterThan(0);
  });

  it('일기는 사용자가 말한 문장만으로 만든다', async () => {
    const result = await provider.createFinalDiary({
      language: 'en',
      messages: [
        { role: 'user', text: 'I go to the park yesterday.', correctedText: 'I went to the park yesterday.' },
        { role: 'assistant', text: 'That sounds nice!', correctedText: null },
      ],
      level: 'beginner',
      requestId: 'r1',
    });
    expect(result.simpleVersion).toBe('I go to the park yesterday.');
    expect(result.naturalVersion).toBe('I went to the park yesterday.');
    expect(result.practiceSentences).toEqual(['I went to the park yesterday.']);
    expect(result.titleCandidates.length).toBeGreaterThan(0);
  });

  it('없는 번역을 지어내지 않는다', async () => {
    const result = await provider.createFinalDiary({
      language: 'en',
      messages: [{ role: 'user', text: 'Today was calm.', correctedText: null }],
      level: 'beginner',
      requestId: 'r2',
    });
    expect(result.translationKo).toBe('');
    expect(await provider.translateDiary('Today was calm.', 'en')).toBe('');
  });
});
