import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { LearningLanguage, SavedExpression } from '@/domain/types';
import { addDays, todayKey } from '@/lib/dates';
import { newId } from '@/lib/id';
import { persistStorage } from './storage';

/** 간단한 간격 반복: 복습할 때마다 간격이 1 → 3 → 7 → 14 → 30일로 늘어난다. */
const REVIEW_INTERVALS = [1, 3, 7, 14, 30];

interface ExpressionsState {
  expressions: SavedExpression[];
  saveExpression: (input: {
    ownerId: string;
    expression: string;
    meaningKo: string;
    example: string;
    language: LearningLanguage;
    sourceDiaryId?: string | null;
  }) => void;
  removeExpression: (id: string) => void;
  toggleFavorite: (id: string) => void;
  /** "알아요" — 다음 복습 간격을 늘린다 */
  markKnown: (id: string) => void;
  /** "다시 볼래요" — 내일 다시 보여준다 */
  markAgain: (id: string) => void;
  wipeAll: () => void;
}

export const useExpressions = create<ExpressionsState>()(
  persist(
    (set, get) => ({
      expressions: [],
      saveExpression: (input) => {
        // 같은 표현 중복 저장 방지
        const exists = get().expressions.some(
          (e) => e.expression === input.expression && e.language === input.language,
        );
        if (exists) return;
        const expression: SavedExpression = {
          id: newId(),
          ownerId: input.ownerId,
          expression: input.expression,
          meaningKo: input.meaningKo,
          example: input.example,
          language: input.language,
          sourceDiaryId: input.sourceDiaryId ?? null,
          isFavorite: false,
          nextReviewDate: addDays(todayKey(), 1),
          reviewCount: 0,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ expressions: [expression, ...s.expressions] }));
      },
      removeExpression: (id) =>
        set((s) => ({ expressions: s.expressions.filter((e) => e.id !== id) })),
      toggleFavorite: (id) =>
        set((s) => ({
          expressions: s.expressions.map((e) =>
            e.id === id ? { ...e, isFavorite: !e.isFavorite } : e,
          ),
        })),
      markKnown: (id) =>
        set((s) => ({
          expressions: s.expressions.map((e) => {
            if (e.id !== id) return e;
            const nextCount = e.reviewCount + 1;
            const interval =
              REVIEW_INTERVALS[Math.min(nextCount, REVIEW_INTERVALS.length - 1)];
            return { ...e, reviewCount: nextCount, nextReviewDate: addDays(todayKey(), interval) };
          }),
        })),
      markAgain: (id) =>
        set((s) => ({
          expressions: s.expressions.map((e) =>
            e.id === id ? { ...e, nextReviewDate: addDays(todayKey(), 1) } : e,
          ),
        })),
      wipeAll: () => set({ expressions: [] }),
    }),
    { name: 'mellow-expressions', storage: persistStorage },
  ),
);
