import { LearningLanguage } from '@/domain/types';

/**
 * 내장 교정 엔진의 규칙 타입.
 *
 * 이 엔진은 외부 AI 서비스 없이 기기 안에서만 동작한다 (비용 0원, 오프라인 가능).
 * 규칙은 순서대로 적용되며, 한 문장에서 여러 규칙이 함께 적용될 수 있다.
 */

export interface RuleChange {
  from: string;
  to: string;
  reasonKo: string;
}

export interface RuleKeyExpression {
  expression: string;
  meaningKo: string;
  example: string;
}

export interface CorrectionRule {
  /** 규칙 식별자 (테스트/디버깅용) */
  id: string;
  language: LearningLanguage;
  /** major: 의미 전달에 영향 / minor: 자연스러움 개선 */
  severity: 'minor' | 'major';
  /** 문장에서 찾을 패턴 */
  pattern: RegExp;
  /**
   * 치환 결과. 문자열이면 그대로, 함수면 매치 그룹으로 계산한다.
   * null을 반환하면 이 매치는 건너뛴다(오탐 방지용 조건부 규칙).
   */
  replace: string | ((match: RegExpMatchArray) => string | null);
  /** 한국어 설명 (짧고 친절하게, 비난 없이) */
  explanationKo: string;
  /** 변경 사유 (교정 카드의 diff 표시에 사용) */
  reasonKo: string;
  /** 이 규칙이 걸렸을 때 함께 알려줄 핵심 표현 */
  keyExpression?: RuleKeyExpression;
  /** 이 패턴이 있어도 규칙을 적용하지 않는다 (오탐 방지) */
  skipIf?: RegExp;
}
