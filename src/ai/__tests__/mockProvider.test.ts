import { MockAIProvider } from '../mockProvider';
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

describe('MockAIProvider', () => {
  const provider = new MockAIProvider();

  it('과거 시제 오류를 major로 교정', async () => {
    const response = await provider.evaluateAndReply('I go cafe with my friend yesterday.', baseCtx);
    expect(response.correction.severity).toBe('major');
    expect(response.correction.corrected).toContain('went');
    expect(() => aiTurnResponseSchema.parse(response)).not.toThrow();
  });

  it('맞는 문장은 correct로 처리하고 교정을 강요하지 않음', async () => {
    const response = await provider.evaluateAndReply('I had a great day today.', baseCtx);
    expect(response.correction.severity).toBe('correct');
    expect(response.correction.corrected).toBe('I had a great day today.');
  });

  it('assistant는 항상 답변과 한국어 뜻을 제공', async () => {
    const response = await provider.evaluateAndReply('Hello!', baseCtx);
    expect(response.assistant.replyTargetLanguage.length).toBeGreaterThan(0);
    expect(response.assistant.replyKo.length).toBeGreaterThan(0);
  });

  it('최종 일기는 사용자가 말한 문장만 사용 (내용을 지어내지 않음)', async () => {
    const result = await provider.createFinalDiary({
      language: 'en',
      level: 'beginner',
      messages: [
        { role: 'assistant', text: 'How was your day?' },
        { role: 'user', text: 'I went to a cafe.' },
        { role: 'assistant', text: 'Nice! What did you drink?' },
        { role: 'user', text: 'I drank a latte.' },
      ],
      requestId: 'test-request-2',
    });
    expect(result.simpleVersion).toBe('I went to a cafe. I drank a latte.');
    // assistant 문장은 일기에 포함되지 않는다
    expect(result.simpleVersion).not.toContain('How was your day');
    expect(result.titleCandidates.length).toBeGreaterThan(0);
  });

  it('일본어 컨텍스트에서 일본어 답변 제공', async () => {
    const response = await provider.evaluateAndReply('昨日カフェに行きました。', {
      ...baseCtx,
      language: 'ja',
    });
    expect(response.detectedLanguage).toBe('ja');
    expect(response.assistant.replyTargetLanguage.length).toBeGreaterThan(0);
  });
});
