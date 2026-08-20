import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { ChatMessage, Conversation, CorrectionResult, LearningLanguage } from '@/domain/types';
import { todayKey } from '@/lib/dates';
import { newId } from '@/lib/id';
import { persistStorage } from './storage';

interface ChatState {
  conversations: Conversation[];
  messages: ChatMessage[];
  startConversation: (ownerId: string, language: LearningLanguage) => Conversation;
  addMessage: (input: {
    conversationId: string;
    role: 'user' | 'assistant';
    text: string;
    translationKo?: string | null;
    correction?: CorrectionResult | null;
  }) => ChatMessage;
  /** "교정문 적용" 시 사용자 메시지 텍스트를 교정문으로 교체 */
  updateMessageText: (id: string, text: string) => void;
  finishConversation: (id: string) => void;
  /**
   * 대화를 통째로 지운다 (대화 + 그 안의 메시지 전부).
   *
   * 이미 일기로 만든 대화를 지워도 **일기는 남는다.** 일기는 별도 저장소에 있고
   * conversationId만 가리키고 있을 뿐이라, 그 연결이 끊겨도 일기 본문은 그대로다.
   */
  deleteConversation: (id: string) => void;
  /** 사용자 발화가 없는 빈 active 대화 정리 (인사만 남은 대화의 무한 누적 방지) */
  pruneEmptyConversations: () => void;
  wipeAll: () => void;
}

export const useChat = create<ChatState>()(
  persist(
    (set) => ({
      conversations: [],
      messages: [],
      startConversation: (ownerId, language) => {
        const conversation: Conversation = {
          id: newId(),
          ownerId,
          language,
          localDate: todayKey(),
          status: 'active',
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ conversations: [conversation, ...s.conversations] }));
        return conversation;
      },
      addMessage: (input) => {
        const message: ChatMessage = {
          id: newId(),
          conversationId: input.conversationId,
          role: input.role,
          text: input.text,
          translationKo: input.translationKo ?? null,
          correction: input.correction ?? null,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ messages: [...s.messages, message] }));
        return message;
      },
      updateMessageText: (id, text) =>
        set((s) => ({
          messages: s.messages.map((m) => (m.id === id ? { ...m, text } : m)),
        })),
      finishConversation: (id) =>
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === id ? { ...c, status: 'finished' as const } : c,
          ),
        })),
      deleteConversation: (id) =>
        set((s) => ({
          conversations: s.conversations.filter((c) => c.id !== id),
          // 메시지를 같이 지우지 않으면 대화만 사라지고 메시지가 영영 남는다
          messages: s.messages.filter((m) => m.conversationId !== id),
        })),
      pruneEmptyConversations: () =>
        set((s) => {
          const emptyIds = new Set(
            s.conversations
              .filter(
                (c) =>
                  c.status === 'active' &&
                  !s.messages.some((m) => m.conversationId === c.id && m.role === 'user'),
              )
              .map((c) => c.id),
          );
          if (emptyIds.size === 0) return s;
          return {
            conversations: s.conversations.filter((c) => !emptyIds.has(c.id)),
            messages: s.messages.filter((m) => !emptyIds.has(m.conversationId)),
          };
        }),
      wipeAll: () => set({ conversations: [], messages: [] }),
    }),
    // 앱 이름이 Mellow Diary → D-log로 바뀌었지만 이 키는 그대로 둔다.
    // 바꾸는 순간 이미 저장된 사용자 데이터를 못 찾아 전부 사라진다. 화면에 나오지 않는 값이다.
    { name: 'mellow-chat', storage: persistStorage },
  ),
);
