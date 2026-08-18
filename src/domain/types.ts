/** 학습 언어 */
export type LearningLanguage = 'en' | 'ja';
/** BCP 47 코드 매핑 */
export const LEARNING_LANGUAGE_TAGS: Record<LearningLanguage, string> = {
  en: 'en-US',
  ja: 'ja-JP',
};

export type UserLevel = 'beginner-zero' | 'beginner' | 'intermediate' | 'advanced';
export type LearningGoal = 'daily' | 'travel' | 'work' | 'study-abroad' | 'hobby';
export type CorrectionIntensity = 'gentle' | 'balanced' | 'thorough';
export type CorrectionTiming = 'every-turn' | 'major-only' | 'after-conversation';
export type SpeechRate = 'slow' | 'normal' | 'fast';
export type JapanesePoliteness = 'polite' | 'casual';

export type Emotion =
  | 'happy'
  | 'calm'
  | 'excited'
  | 'grateful'
  | 'tired'
  | 'sad'
  | 'anxious'
  | 'angry'
  | 'neutral';

export type Weather = 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'windy' | 'none';

export type Visibility = 'private' | 'selected-friends' | 'all-friends' | 'link';

export type DiaryInputMethod = 'typed' | 'voice' | 'mixed' | 'ai-chat' | 'photo' | 'prompt';

export type DiaryStatus = 'draft' | 'saved' | 'trashed' | 'archived';

export interface DiaryPhoto {
  id: string;
  /** 로컬 URI 또는 스토리지 경로 */
  uri: string;
  isCover: boolean;
  createdAt: string;
}

export interface DiaryEntry {
  id: string;
  ownerId: string;
  title: string;
  /** 사용자가 처음 쓴 원문 */
  originalText: string;
  /** AI 교정문 (있는 경우) */
  correctedText: string | null;
  /** 최종 저장문 (사용자가 승인한 텍스트) */
  finalText: string;
  /** 한국어 뜻 */
  translationKo: string | null;
  /** 사용자 로컬 날짜 (YYYY-MM-DD) — 달력 표시 기준 */
  localDate: string;
  emotion: Emotion;
  weather: Weather;
  tags: string[];
  photos: DiaryPhoto[];
  visibility: Visibility;
  isFavorite: boolean;
  language: LearningLanguage;
  inputMethod: DiaryInputMethod;
  /** 연결된 AI 대화 ID */
  conversationId: string | null;
  status: DiaryStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export type CorrectionSeverity = 'correct' | 'minor' | 'major';

export interface KeyExpression {
  expression: string;
  meaningKo: string;
  example: string;
}

export interface CorrectionResult {
  severity: CorrectionSeverity;
  original: string;
  corrected: string;
  explanationKo: string;
  changedParts: { from: string; to: string; reasonKo: string }[];
  keyExpressions: KeyExpression[];
  /** 일본어용 읽기 도움 (히라가나) */
  readingJa?: string | null;
}

export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: ChatRole;
  text: string;
  /** assistant 메시지의 한국어 뜻 */
  translationKo: string | null;
  correction: CorrectionResult | null;
  createdAt: string;
}

export interface Conversation {
  id: string;
  ownerId: string;
  language: LearningLanguage;
  localDate: string;
  status: 'active' | 'finished';
  createdAt: string;
}

export interface SavedExpression {
  id: string;
  ownerId: string;
  expression: string;
  meaningKo: string;
  example: string;
  language: LearningLanguage;
  sourceDiaryId: string | null;
  isFavorite: boolean;
  /** 간단한 간격 반복: 다음 복습 예정일 (YYYY-MM-DD) */
  nextReviewDate: string;
  reviewCount: number;
  createdAt: string;
}

export interface PracticeAttempt {
  id: string;
  targetSentence: string;
  recognizedText: string;
  similarity: number;
  passed: boolean;
  createdAt: string;
}

export interface DailyUsage {
  /** YYYY-MM-DD */
  date: string;
  aiTurns: number;
  diaryGenerations: number;
}

export interface UserProfile {
  id: string;
  nickname: string;
  /** 친구 코드 (공유용) */
  friendCode: string;
  createdAt: string;
}
