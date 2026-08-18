import { sanitizeForSpeech } from '../speechText';

describe('sanitizeForSpeech', () => {
  it('문장 끝 이모지 제거', () => {
    expect(sanitizeForSpeech('Hi! How was your day today? 😊')).toBe(
      'Hi! How was your day today?',
    );
  });

  it('조합 이모지(ZWJ)와 스킨톤도 제거', () => {
    expect(sanitizeForSpeech('Good job 👍🏻 team 👨‍👩‍👧')).toBe('Good job team');
  });

  it('중간에 낀 이모지 제거 후 공백 정리', () => {
    expect(sanitizeForSpeech('That 🎉 sounds nice!')).toBe('That sounds nice!');
  });

  it('일본어 문장 + 이모지', () => {
    expect(sanitizeForSpeech('こんにちは！今日はどんな一日でしたか？😊')).toBe(
      'こんにちは！今日はどんな一日でしたか？',
    );
  });

  it('국기 이모지 제거', () => {
    expect(sanitizeForSpeech('🇺🇸 English diary')).toBe('English diary');
  });

  it('별/하트 등 기호 제거', () => {
    expect(sanitizeForSpeech('⭐ Great! ❤️')).toBe('Great!');
  });

  it('이모지만 있으면 빈 문자열 (재생 생략)', () => {
    expect(sanitizeForSpeech('😊🎉')).toBe('');
  });

  it('일반 문장은 그대로 유지 (구두점, 아포스트로피 포함)', () => {
    expect(sanitizeForSpeech("I went to a café. It's really fun!")).toBe(
      "I went to a café. It's really fun!",
    );
  });
});
