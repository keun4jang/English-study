import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { DiaryEntry, DiaryPhoto, Emotion, LearningLanguage, Visibility } from '@/domain/types';
import { todayKey } from '@/lib/dates';
import { newId } from '@/lib/id';
import { persistStorage } from './storage';

/**
 * 일기 저장소 (Phase 1: 로컬 영속).
 * Phase 2에서 Supabase 동기화가 추가되어도 화면 코드는 이 스토어 인터페이스만 사용한다.
 */

export interface DraftState {
  text: string;
  title: string;
  emotion: Emotion;
  tags: string[];
  updatedAt: string;
}

interface DiaryState {
  entries: DiaryEntry[];
  /** 작성 중 임시 저장 (앱 종료 후 복구) */
  draft: DraftState | null;
  createEntry: (
    input: Partial<DiaryEntry> & {
      ownerId: string;
      finalText: string;
      language: LearningLanguage;
    },
  ) => DiaryEntry;
  updateEntry: (id: string, patch: Partial<DiaryEntry>) => void;
  /** 휴지통으로 이동 (soft delete) */
  trashEntry: (id: string) => void;
  restoreEntry: (id: string) => void;
  /** 휴지통에서 영구 삭제 */
  deleteForever: (id: string) => void;
  toggleFavorite: (id: string) => void;
  addPhoto: (entryId: string, photo: DiaryPhoto) => void;
  removePhoto: (entryId: string, photoId: string) => void;
  saveDraft: (draft: DraftState) => void;
  clearDraft: () => void;
  /** 휴지통 보관 기간이 지난 항목 정리 */
  purgeExpiredTrash: (retentionDays: number) => void;
  /** 백업에서 일기 추가 (기존 항목은 유지) */
  importEntries: (entries: DiaryEntry[]) => void;
  /** 계정 삭제 시 전체 데이터 제거 */
  wipeAll: () => void;
}

export const useDiary = create<DiaryState>()(
  persist(
    (set, get) => ({
      entries: [],
      draft: null,
      createEntry: (input) => {
        const now = new Date().toISOString();
        const entry: DiaryEntry = {
          id: input.id ?? newId(),
          ownerId: input.ownerId,
          title: input.title ?? '',
          originalText: input.originalText ?? input.finalText,
          correctedText: input.correctedText ?? null,
          finalText: input.finalText,
          translationKo: input.translationKo ?? null,
          localDate: input.localDate ?? todayKey(),
          emotion: input.emotion ?? 'neutral',
          weather: input.weather ?? 'none',
          tags: input.tags ?? [],
          photos: input.photos ?? [],
          visibility: (input.visibility as Visibility) ?? 'private',
          isFavorite: input.isFavorite ?? false,
          language: input.language,
          inputMethod: input.inputMethod ?? 'typed',
          conversationId: input.conversationId ?? null,
          status: 'saved',
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        };
        set((s) => ({ entries: [entry, ...s.entries] }));
        return entry;
      },
      updateEntry: (id, patch) =>
        set((s) => ({
          entries: s.entries.map((e) =>
            e.id === id ? { ...e, ...patch, updatedAt: new Date().toISOString() } : e,
          ),
        })),
      trashEntry: (id) =>
        set((s) => ({
          entries: s.entries.map((e) =>
            e.id === id
              ? { ...e, status: 'trashed' as const, deletedAt: new Date().toISOString() }
              : e,
          ),
        })),
      restoreEntry: (id) =>
        set((s) => ({
          entries: s.entries.map((e) =>
            e.id === id ? { ...e, status: 'saved' as const, deletedAt: null } : e,
          ),
        })),
      deleteForever: (id) => set((s) => ({ entries: s.entries.filter((e) => e.id !== id) })),
      toggleFavorite: (id) =>
        set((s) => ({
          entries: s.entries.map((e) => (e.id === id ? { ...e, isFavorite: !e.isFavorite } : e)),
        })),
      addPhoto: (entryId, photo) =>
        set((s) => ({
          entries: s.entries.map((e) =>
            e.id === entryId ? { ...e, photos: [...e.photos, photo] } : e,
          ),
        })),
      removePhoto: (entryId, photoId) =>
        set((s) => ({
          entries: s.entries.map((e) =>
            e.id === entryId ? { ...e, photos: e.photos.filter((p) => p.id !== photoId) } : e,
          ),
        })),
      saveDraft: (draft) => set({ draft }),
      clearDraft: () => set({ draft: null }),
      purgeExpiredTrash: (retentionDays) => {
        const cutoff = Date.now() - retentionDays * 86_400_000;
        set((s) => ({
          entries: s.entries.filter(
            (e) =>
              e.status !== 'trashed' || !e.deletedAt || new Date(e.deletedAt).getTime() > cutoff,
          ),
        }));
      },
      importEntries: (incoming) =>
        set((s) => ({
          entries: [...incoming, ...s.entries].sort((a, b) =>
            b.localDate.localeCompare(a.localDate),
          ),
        })),
      wipeAll: () => set({ entries: [], draft: null }),
    }),
    // 앱 이름이 Mellow Diary → D-log로 바뀌었지만 이 키는 그대로 둔다.
    // 바꾸는 순간 이미 저장된 사용자 데이터를 못 찾아 전부 사라진다. 화면에 나오지 않는 값이다.
    { name: 'mellow-diary', storage: persistStorage },
  ),
);

/** 저장된(휴지통 제외) 일기만 */
export function selectActiveEntries(entries: DiaryEntry[]): DiaryEntry[] {
  return entries.filter((e) => e.status === 'saved');
}

export function selectEntriesByDate(entries: DiaryEntry[], dateKey: string): DiaryEntry[] {
  return selectActiveEntries(entries).filter((e) => e.localDate === dateKey);
}
