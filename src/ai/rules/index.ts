import { LearningLanguage } from '@/domain/types';

import { EN_AGREEMENT_RULES } from './en-agreement';
import { EN_ARTICLE_RULES } from './en-articles';
import { EN_COMMON_RULES } from './en-common';
import { EN_NATURAL_RULES } from './en-natural';
import { EN_PREPOSITION_RULES } from './en-preposition';
import { EN_TENSE_RULES } from './en-tense';
import { JA_RULES } from './ja-basics';
import { CorrectionRule } from './types';

export { applyRules, toCorrectionResult } from './engine';
export type { EngineResult } from './engine';
export type { CorrectionRule, RuleChange, RuleKeyExpression } from './types';

/**
 * 내장 교정 엔진의 전체 규칙.
 *
 * 적용 순서가 결과를 좌우한다. 문장의 뼈대(시제 → 수 일치 → 관사 → 전치사)를 먼저
 * 바로잡은 뒤, 마지막에 자연스러움을 다듬는다. 자연스러움 규칙이 먼저 돌면 아직
 * 고쳐지지 않은 형태를 보고 잘못 매치될 수 있다.
 */
export const EN_RULES: CorrectionRule[] = [
  ...EN_TENSE_RULES,
  ...EN_AGREEMENT_RULES,
  ...EN_ARTICLE_RULES,
  ...EN_PREPOSITION_RULES,
  ...EN_COMMON_RULES,
  ...EN_NATURAL_RULES,
];

export const ALL_RULES: CorrectionRule[] = [...EN_RULES, ...JA_RULES];

export {
  EN_AGREEMENT_RULES,
  EN_ARTICLE_RULES,
  EN_COMMON_RULES,
  EN_NATURAL_RULES,
  EN_PREPOSITION_RULES,
  EN_TENSE_RULES,
  JA_RULES,
};

/** 언어에 해당하는 규칙만 (엔진도 걸러내지만 미리 좁혀 두면 빠르다) */
export function rulesFor(language: LearningLanguage): CorrectionRule[] {
  return language === 'ja' ? JA_RULES : EN_RULES;
}
