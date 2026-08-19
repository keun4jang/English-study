import { extractKeyword, pickReply, TOPICS } from '../topics';

describe('대화 사전', () => {
  it('주제마다 영어/일본어 답변이 최소 하나씩 있다', () => {
    for (const topic of TOPICS) {
      expect(topic.en.length).toBeGreaterThan(0);
      expect(topic.ja.length).toBeGreaterThan(0);
    }
  });

  it('사용자가 말한 주제에 맞는 반응을 고른다', () => {
    expect(pickReply('I was so tired today', 'en').reply.toLowerCase()).toMatch(/tired|rest|break/);
    expect(pickReply('I ate delicious pasta', 'en').reply.toLowerCase()).toMatch(/food|eat|have|good|alone/);
    expect(pickReply('I went to the gym', 'en').reply.toLowerCase()).toMatch(/body|feel|often/);
  });

  it('같은 대화에서 같은 답변을 반복하지 않는다', () => {
    const used = new Set<string>();
    const seen: string[] = [];
    for (let i = 0; i < 3; i++) {
      const r = pickReply('I was tired today', 'en', { usedReplies: used, turnIndex: i });
      seen.push(r.reply);
      used.add(r.reply);
    }
    expect(new Set(seen).size).toBe(3);
  });

  it('주제를 못 찾으면 핵심 단어를 인용해 묻는다', () => {
    const r = pickReply('I finished the puzzle', 'en');
    expect(r.reply).toContain('puzzle');
  });

  it('인용할 단어도 없으면 일반 반응으로 넘어간다', () => {
    const r = pickReply('ok', 'en');
    expect(r.reply.length).toBeGreaterThan(0);
    expect(r.ko.length).toBeGreaterThan(0);
  });

  it('일본어 입력에는 일본어로 답한다', () => {
    const r = pickReply('今日は友達と会いました', 'ja');
    expect(/[ぁ-んァ-ン一-龯]/.test(r.reply)).toBe(true);
    expect(r.ko.length).toBeGreaterThan(0);
  });

  it('모든 답변에 한국어 뜻이 있다', () => {
    for (const topic of TOPICS) {
      for (const r of [...topic.en, ...topic.ja]) {
        expect(r.ko.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('답변에 이모지를 쓰지 않는다', () => {
    const emoji = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
    for (const topic of TOPICS) {
      for (const r of [...topic.en, ...topic.ja]) {
        expect(emoji.test(r.reply)).toBe(false);
      }
    }
  });

  it('extractKeyword는 흔한 단어를 걸러낸다', () => {
    expect(extractKeyword('I went to the park')).toBe('park');
    expect(extractKeyword('ok')).toBeNull();
  });
});
