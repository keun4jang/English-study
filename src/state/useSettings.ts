import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import {
  CorrectionIntensity,
  CorrectionTiming,
  JapanesePoliteness,
  LearningGoal,
  LearningLanguage,
  SpeechRate,
  UserLevel,
  Visibility,
} from '@/domain/types';
import { persistStorage } from './storage';

export interface LearningSettings {
  language: LearningLanguage;
  level: UserLevel;
  goal: LearningGoal;
  correctionIntensity: CorrectionIntensity;
  correctionTiming: CorrectionTiming;
  japanesePoliteness: JapanesePoliteness;
  japaneseReadingHelp: boolean;
  /** 재말하기 유사도 기준 (0~1) */
  similarityThreshold: number;
  maxRetryCount: number;
  /** 하루 목표 문장 수 (부담 없는 기본값 3) */
  dailyGoalSentences: number;
}

export interface VoiceSettings {
  speechRate: SpeechRate;
  pitch: number;
  autoPlayAiReply: boolean;
  voiceId: string | null;
  /** 음성 원본 저장 여부 — 기본값 저장 안 함 (개인정보 보호) */
  storeVoiceRecordings: boolean;
}

export interface DiarySettings {
  defaultVisibility: Visibility;
  showKoreanTranslation: boolean;
  autoSaveIntervalSec: number;
  /** 휴지통 자동 삭제 기간 (일) */
  trashRetentionDays: number;
}

export interface DesignSettings {
  themeMode: 'light' | 'dark' | 'system';
  fontScale: 'small' | 'normal' | 'large';
  reduceMotion: boolean;
  hapticsEnabled: boolean;
  calendarStartsOnMonday: boolean;
}

export interface NotificationSettings {
  writingReminderEnabled: boolean;
  reminderTime: string; // "HH:mm"
  reminderDays: number[]; // 0=일 ~ 6=토
}

export interface DevSettings {
  /** Mock AI 강제 사용 (관리자/개발용) */
  forceMockAi: boolean;
  showDetailedErrors: boolean;
}

interface SettingsState {
  onboardingCompleted: boolean;
  learning: LearningSettings;
  voice: VoiceSettings;
  diary: DiarySettings;
  design: DesignSettings;
  notifications: NotificationSettings;
  dev: DevSettings;
  completeOnboarding: (partial: Partial<LearningSettings>) => void;
  updateLearning: (partial: Partial<LearningSettings>) => void;
  updateVoice: (partial: Partial<VoiceSettings>) => void;
  updateDiary: (partial: Partial<DiarySettings>) => void;
  updateDesign: (partial: Partial<DesignSettings>) => void;
  updateNotifications: (partial: Partial<NotificationSettings>) => void;
  updateDev: (partial: Partial<DevSettings>) => void;
  resetAll: () => void;
}

const defaults = {
  onboardingCompleted: false,
  learning: {
    language: 'en' as LearningLanguage,
    level: 'beginner' as UserLevel,
    goal: 'daily' as LearningGoal,
    correctionIntensity: 'balanced' as CorrectionIntensity,
    correctionTiming: 'every-turn' as CorrectionTiming,
    japanesePoliteness: 'polite' as JapanesePoliteness,
    japaneseReadingHelp: true,
    similarityThreshold: 0.75,
    maxRetryCount: 3,
    dailyGoalSentences: 3,
  },
  voice: {
    speechRate: 'normal' as SpeechRate,
    pitch: 1.0,
    autoPlayAiReply: true,
    voiceId: null,
    storeVoiceRecordings: false,
  },
  diary: {
    defaultVisibility: 'private' as Visibility,
    showKoreanTranslation: true,
    autoSaveIntervalSec: 5,
    trashRetentionDays: 30,
  },
  design: {
    themeMode: 'system' as const,
    fontScale: 'normal' as const,
    reduceMotion: false,
    hapticsEnabled: true,
    calendarStartsOnMonday: false,
  },
  notifications: {
    writingReminderEnabled: false,
    reminderTime: '21:00',
    reminderDays: [0, 1, 2, 3, 4, 5, 6],
  },
  dev: {
    forceMockAi: false,
    showDetailedErrors: false,
  },
};

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaults,
      completeOnboarding: (partial) =>
        set((s) => ({ onboardingCompleted: true, learning: { ...s.learning, ...partial } })),
      updateLearning: (partial) => set((s) => ({ learning: { ...s.learning, ...partial } })),
      updateVoice: (partial) => set((s) => ({ voice: { ...s.voice, ...partial } })),
      updateDiary: (partial) => set((s) => ({ diary: { ...s.diary, ...partial } })),
      updateDesign: (partial) => set((s) => ({ design: { ...s.design, ...partial } })),
      updateNotifications: (partial) =>
        set((s) => ({ notifications: { ...s.notifications, ...partial } })),
      updateDev: (partial) => set((s) => ({ dev: { ...s.dev, ...partial } })),
      resetAll: () => set({ ...defaults }),
    }),
    {
      // 앱 이름이 Mellow Diary → D-log로 바뀌었지만 이 키는 그대로 둔다.
      // 바꾸는 순간 이미 저장된 사용자 데이터를 못 찾아 전부 사라진다. 화면에 나오지 않는 값이다.
      name: 'mellow-settings',
      storage: persistStorage,
      /**
       * 저장된 설정과 기본값을 **그룹 안쪽까지** 합친다.
       *
       * zustand persist의 기본 병합은 최상위만 얕게 덮어쓴다. 그래서 예전에 설정을 저장한
       * 사용자는 learning 객체가 통째로 옛날 것으로 바뀌면서, 나중에 추가된 항목이
       * undefined가 된다. 실제로 dailyGoalSentences가 없어져 홈 화면에 "NaN/"이 찍혔다.
       *
       * 항목을 새로 추가할 때마다 마이그레이션을 쓰는 대신, 기본값을 항상 바닥에 깔아 둔다.
       */
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<SettingsState>;
        return {
          ...current,
          ...saved,
          learning: { ...current.learning, ...saved.learning },
          voice: { ...current.voice, ...saved.voice },
          diary: { ...current.diary, ...saved.diary },
          design: { ...current.design, ...saved.design },
          notifications: { ...current.notifications, ...saved.notifications },
          dev: { ...current.dev, ...saved.dev },
        };
      },
    },
  ),
);
