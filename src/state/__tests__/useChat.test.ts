import { useChat } from '../useChat';

describe('대화 삭제', () => {
  beforeEach(() => useChat.getState().wipeAll());

  const seed = () => {
    const a = useChat.getState().startConversation('u1', 'en');
    useChat.getState().addMessage({ conversationId: a.id, role: 'assistant', text: 'Hi!' });
    useChat.getState().addMessage({ conversationId: a.id, role: 'user', text: 'I went to a cafe.' });
    const b = useChat.getState().startConversation('u1', 'en');
    useChat.getState().addMessage({ conversationId: b.id, role: 'user', text: 'Other talk.' });
    return { a, b };
  };

  it('대화와 그 안의 메시지를 함께 지운다', () => {
    const { a } = seed();
    useChat.getState().deleteConversation(a.id);
    expect(useChat.getState().conversations.some((c) => c.id === a.id)).toBe(false);
    expect(useChat.getState().messages.some((m) => m.conversationId === a.id)).toBe(false);
  });

  it('다른 대화는 건드리지 않는다', () => {
    const { a, b } = seed();
    useChat.getState().deleteConversation(a.id);
    expect(useChat.getState().conversations.map((c) => c.id)).toEqual([b.id]);
    expect(useChat.getState().messages).toHaveLength(1);
    expect(useChat.getState().messages[0].conversationId).toBe(b.id);
  });

  it('없는 id로 지워도 아무 일도 일어나지 않는다', () => {
    seed();
    const before = useChat.getState().messages.length;
    useChat.getState().deleteConversation('없는-id');
    expect(useChat.getState().messages).toHaveLength(before);
    expect(useChat.getState().conversations).toHaveLength(2);
  });

  it('지운 대화는 "이어서 하기" 후보에서 사라진다', () => {
    const { a, b } = seed();
    const resumable = () =>
      useChat
        .getState()
        .conversations.filter(
          (c) =>
            c.status === 'active' &&
            useChat.getState().messages.some((m) => m.conversationId === c.id && m.role === 'user'),
        )
        .map((c) => c.id);

    expect(resumable()).toEqual(expect.arrayContaining([a.id, b.id]));
    useChat.getState().deleteConversation(a.id);
    expect(resumable()).toEqual([b.id]);
  });

  it('대화마다 id가 다르다 (같으면 하나를 지울 때 다른 것까지 지워진다)', () => {
    const { a, b } = seed();
    expect(a.id).not.toBe(b.id);
    expect(a.id).toBeTruthy();
  });
});
