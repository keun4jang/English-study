import { create } from 'zustand';

import { FinalDiaryResult } from '@/ai/schema';
import { LearningLanguage } from '@/domain/types';

/** 대화 → 최종 일기 화면 간 전달용 임시 상태 (영속 저장 안 함) */
interface FinalizeState {
  result: FinalDiaryResult | null;
  conversationId: string | null;
  language: LearningLanguage;
  originalText: string;
  setResult: (input: {
    result: FinalDiaryResult;
    conversationId: string;
    language: LearningLanguage;
    originalText: string;
  }) => void;
  clear: () => void;
}

export const useFinalize = create<FinalizeState>((set) => ({
  result: null,
  conversationId: null,
  language: 'en',
  originalText: '',
  setResult: ({ result, conversationId, language, originalText }) =>
    set({ result, conversationId, language, originalText }),
  clear: () => set({ result: null, conversationId: null, originalText: '' }),
}));
