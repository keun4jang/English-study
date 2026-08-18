import { SavedExpression } from '@/domain/types';

/**
 * 단어장 퀴즈 (말해보카의 뜻 맞히기에서 착안).
 * 저장한 다른 표현들의 뜻을 오답 보기로 사용한다.
 */

/** 오답 보기가 부족할 때 쓰는 기본 뜻 풀 */
const FALLBACK_MEANINGS = [
  '산책하러 가다',
  '약속을 미루다',
  '기대하고 있다',
  '한숨 돌리다',
  '자리를 잡다',
  '말을 꺼내다',
];

export interface QuizQuestion {
  expressionId: string;
  expression: string;
  correctMeaning: string;
  /** 정답 포함 최대 4개, 섞여 있음 */
  choices: string[];
}

export function buildQuizQuestion(
  target: SavedExpression,
  all: SavedExpression[],
  random: () => number = Math.random,
): QuizQuestion {
  const distractorPool = all
    .filter((e) => e.id !== target.id && e.meaningKo && e.meaningKo !== target.meaningKo)
    .map((e) => e.meaningKo);
  const unique = [...new Set(distractorPool)];

  // 부족하면 기본 풀에서 채운다 (정답과 겹치지 않게)
  const fallback = FALLBACK_MEANINGS.filter(
    (m) => m !== target.meaningKo && !unique.includes(m),
  );
  const distractors = [...unique, ...fallback].slice(0, 3);

  const choices = [target.meaningKo, ...distractors];
  // Fisher–Yates 셔플
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }
  return {
    expressionId: target.id,
    expression: target.expression,
    correctMeaning: target.meaningKo,
    choices,
  };
}

export type MasteryLevel = 'new' | 'learning' | 'familiar';

/** 표현 숙련 단계 (복습 횟수 기반 — 측정 가능한 값만 사용) */
export function masteryLevel(reviewCount: number): MasteryLevel {
  if (reviewCount === 0) return 'new';
  if (reviewCount < 3) return 'learning';
  return 'familiar';
}

export const MASTERY_LABELS: Record<MasteryLevel, string> = {
  new: '새 표현',
  learning: '익히는 중',
  familiar: '익숙함',
};
