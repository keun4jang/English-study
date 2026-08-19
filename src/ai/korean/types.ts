import { LearningLanguage } from '@/domain/types';

/**
 * 한글 도우미 타입.
 *
 * "한국어로 말하면 영어 예시를 보여주고, 그걸 읽어서 일기를 쓴다"를 위한 모듈이다.
 * 외부 번역 API를 부르지 않는다(비용 0원·오프라인). 대신 사전과 문장 틀로 만든다.
 * 그래서 **모든 문장을 번역할 수는 없고**, 못 만들면 못 만든다고 정직하게 말한다.
 */

/** 사전에 등록된 명사 (장소·사람·음식·사물) */
export interface KoNoun {
  ko: string;
  /** 같은 뜻의 다른 표기 (예: 얘기 ↔ 이야기) */
  alt?: string[];
  /** 영어 명사구 — 관사까지 포함해 적는다 ("a café", "work", "the gym") */
  en: string;
  ja: string;
  /**
   * "집에 갔어" → "I went home" 처럼 to를 붙이면 안 되는 장소.
   * (회사는 "went to work"라서 여기 해당하지 않는다)
   */
  bareDestination?: boolean;
  /**
   * "~에서"를 옮길 때 쓰는 전치사. 기본은 at.
   *
   * 도시·지역·나라는 **in**을 쓴다. "at Busan"은 틀리고 "in Busan"이 맞다. 건물이나
   * 가게처럼 점으로 찍히는 장소만 at이다. 이 구분을 빼먹으면 지명을 사전에 넣는 순간
   * 전부 틀린 문장이 된다.
   */
  preposition?: 'at' | 'in';
}

export type PredicateSubject = 'i' | 'it';

/** 동사 (갔어 / 먹었어 / 만났어 …) */
export interface KoVerb {
  id: string;
  ko: string;
  /** 과거형 어간 — 여기에 어미(어/어요/다/음…)가 붙는다 ("갔" → 갔어/갔어요/갔다) */
  pastStem: string;
  /** 현재형 표면형 (어간에서 규칙적으로 만들기 어려워 직접 적는다) */
  presentForms: string[];
  /** 미래형 표면형 앞부분 ("갈 거" → 갈 거야/갈 거예요) */
  futureStems: string[];
  en: { past: string; present: string; base: string };
  ja: { past: string; present: string };
  /**
   * 문장을 어떻게 조립할지.
   * - go: I went **to** {place}
   * - meet: I met {person}
   * - transitive: I {동사} {목적어}
   * - intransitive: I {동사}
   */
  frame: 'go' | 'meet' | 'transitive' | 'intransitive';
}

/** 형용사·상태 (피곤해 / 좋았어 / 더웠어 …) */
export interface KoAdjective {
  ko: string;
  /** 매칭할 표면형들 (피곤해, 피곤했어, 피곤하다 …) */
  forms: string[];
  en: string;
  ja: string;
  /** "I was tired" 인지 "It was hot" 인지 */
  subject: PredicateSubject;
}

export type Tense = 'past' | 'present' | 'future';

/** 한국어 문장에서 뽑아낸 조각들 */
export interface KoParse {
  /** 원문 */
  source: string;
  time: KoNoun | null;
  person: KoNoun | null;
  place: KoNoun | null;
  object: KoNoun | null;
  verb: KoVerb | null;
  adjective: KoAdjective | null;
  tense: Tense;
  negated: boolean;
  /** '너무·진짜' 같은 정도 부사가 있었는지 (영어의 so) */
  intensified: boolean;
  /** 사전에 없어서 뜻을 모르는 단어 (문장에 [단어]로 남는다) */
  unknown: KoUnknown[];
}

/**
 * 사전에 없는 단어.
 *
 * **역할(role)을 반드시 함께 들고 다닌다.** 예전에는 문자열만 모아 두고 필요할 때
 * 앞에서부터 꺼내 썼는데, "오늘 대구에서 촬영을 했어"에서 장소(대구)가 목적어 자리로
 * 들어가고 진짜 목적어(촬영)는 통째로 사라져 "I did [대구에서] today."가 나왔다.
 * 조사가 알려주는 역할을 버린 것이 원인이었다.
 */
export interface KoUnknown {
  /** 조사를 뗀 말 (대구에서 → 대구) */
  word: string;
  role: 'place' | 'object' | 'person' | 'unknown';
}

/** 한 문장에 대한 도움 */
export interface KoSuggestion {
  /** 배울 언어로 만든 예시 문장 */
  text: string;
  /** 문장에 [단어]로 남은 말들 — 사용자가 채워야 한다 */
  unknown: {
    word: string;
    /**
     * 지역·가게·사람 이름이면 소리 나는 대로 적은 형태 (대구 → Daegu).
     * 문장에 몰래 넣지 않고 제안만 한다 — 이름이 아닐 수도 있기 때문이다.
     */
    romanized: string | null;
  }[];
}

export interface KoHelp {
  language: LearningLanguage;
  /** 만들어 낸 예시 문장들 (최대 3개, 없으면 빈 배열) */
  suggestions: KoSuggestion[];
  /**
   * 예시를 못 만들었을 때 true. 화면은 이때 '문장 만들기'로 안내한다.
   * (그럴듯한 가짜 번역을 지어내지 않는다)
   */
  needsBuilder: boolean;
  /** 문장 전체는 못 만들었어도 아는 단어는 알려준다 */
  words: { ko: string; target: string }[];
  /**
   * 사전에 없지만 **이름으로 보이는 말** (장소·사람 자리에 온 모르는 말).
   *
   * 지역·가게·사람 이름은 사전을 아무리 키워도 다 담을 수 없고, 애초에 번역이 아니라
   * 소리 나는 대로 적는 게 정답이다. 문장을 못 만들었을 때도 이것만은 알려줄 수 있다.
   */
  nameHints: { ko: string; romanized: string }[];
}
