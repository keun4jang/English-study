import { CorrectionResult, LearningLanguage } from '@/domain/types';
import { CorrectionRule, RuleChange, RuleKeyExpression } from './types';

/**
 * 내장 교정 엔진 — 규칙을 순서대로 적용해 한 문장의 여러 오류를 함께 고친다.
 * 외부 AI 서비스를 호출하지 않으므로 비용이 발생하지 않고 오프라인에서도 동작한다.
 */

export interface EngineResult {
  corrected: string;
  changes: RuleChange[];
  explanations: string[];
  keyExpressions: RuleKeyExpression[];
  severity: CorrectionResult['severity'];
  /** 적용된 규칙 id (테스트/디버깅용) */
  appliedRuleIds: string[];
}

/** 문장 앞뒤 공백/중복 공백 정리 */
function tidySpacing(text: string, language: LearningLanguage): string {
  if (language === 'ja') return text.trim().replace(/\s{2,}/g, ' ');
  return text.trim().replace(/\s{2,}/g, ' ').replace(/\s+([,.!?])/g, '$1');
}

/**
 * 입력 정리 — 교정으로 세지 않는 표기 보정.
 *
 * 휴대폰 입력이나 음성 인식은 아포스트로피를 자주 흘린다("don t", "I m").
 * 이건 영어 실력 문제가 아니라 입력 문제라서, 교정 카드에 "틀렸다"고 띄우지 않고
 * 조용히 되돌린 뒤 나머지 규칙을 적용한다.
 */
const CONTRACTION_FIXES: [RegExp, string][] = [
  [/\b(do|does|did|is|are|was|were|has|have|had|could|would|should|must|ca|wo|ai)n\s+t\b/gi, "$1n't"],
  [/\bI\s+m\b/g, "I'm"],
  [/\b(it|that|he|she|there|what|who|let)\s+s\b/gi, "$1's"],
  [/\b(I|you|we|they|it|he|she)\s+ll\b/gi, "$1'll"],
  [/\b(I|you|we|they)\s+ve\b/gi, "$1've"],
  [/\b(I|you|we|they|he|she|it)\s+d\b/gi, "$1'd"],
  [/\b(I|you|we|they|he|she|it)\s+re\b/gi, "$1're"],
];

function normalizeInput(text: string, language: LearningLanguage): string {
  if (language !== 'en') return text;
  let out = text;
  for (const [pattern, replacement] of CONTRACTION_FIXES) {
    out = out.replace(pattern, replacement);
  }
  // 혼자 쓰인 소문자 i는 영어에서 항상 대문자다 (표기 관례라 교정으로 세지 않는다)
  out = out.replace(/\bi\b/g, 'I');
  return out;
}

/** 첫 글자 대문자 (영어) */
function capitalizeFirst(text: string): string {
  const i = text.search(/[a-z]/i);
  if (i === -1) return text;
  return text.slice(0, i) + text[i].toUpperCase() + text.slice(i + 1);
}

/** 문장 끝 마침표 보완 (영어/일본어) */
function ensureTerminator(text: string, language: LearningLanguage): string {
  if (!text) return text;
  if (/[.!?。！？…]$/.test(text)) return text;
  return text + (language === 'ja' ? '。' : '.');
}

/** 한 규칙이 한 문장에서 적용될 수 있는 최대 횟수 (무한 반복 방지) */
const MAX_PASSES_PER_RULE = 4;

/**
 * from 위치부터 검색한다. 규칙 패턴에는 g 플래그가 없으므로(테스트로 강제),
 * 앞부분을 잘라 검색한 뒤 인덱스를 되돌려 준다.
 *
 * 규칙 패턴은 대부분 \b나 앞 단어를 함께 보는데, 자른 지점이 단어 중간이면 문맥이
 * 달라진다. 그래서 자를 때는 항상 공백 경계에서 자른다.
 */
function execFrom(pattern: RegExp, text: string, from: number): RegExpExecArray | null {
  if (from <= 0) return pattern.exec(text);
  if (from >= text.length) return null;

  // 단어 중간에서 자르지 않도록 다음 공백까지 밀어 둔다
  let start = from;
  while (start < text.length && !/\s/.test(text[start])) start++;
  if (start >= text.length) return null;

  const match = pattern.exec(text.slice(start));
  if (!match || match.index === undefined) return null;
  match.index += start;
  match.input = text;
  return match;
}

/**
 * $1~$99 캡처 참조를 실제 값으로 바꾼다.
 * - 존재하지만 매치에 참여하지 않은 그룹(선택 그룹)은 빈 문자열
 * - 아예 없는 그룹 번호는 그대로 둔다 (규칙 안의 "$10" 같은 표기를 망가뜨리지 않게)
 */
function expand(replacement: string, match: RegExpMatchArray): string {
  return replacement.replace(/\$(\d{1,2})/g, (whole, digits: string) => {
    const index = Number(digits);
    if (index === 0 || index >= match.length) return whole;
    return match[index] ?? '';
  });
}

export function applyRules(
  input: string,
  language: LearningLanguage,
  rules: CorrectionRule[],
): EngineResult {
  let text = normalizeInput(tidySpacing(input, language), language);
  const changes: RuleChange[] = [];
  const explanations: string[] = [];
  const keyExpressions: RuleKeyExpression[] = [];
  const appliedRuleIds: string[] = [];
  let severity: CorrectionResult['severity'] = 'correct';

  for (const rule of rules) {
    if (rule.language !== language) continue;

    // 같은 오류를 한 일기 안에서 여러 번 반복하는 경우가 흔하다
    // ("I go to school and I go to the park yesterday"). 규칙 하나가 여러 번 적용될 수
    // 있게 하되, 규칙이 자기 출력을 다시 매치해 무한 반복하는 일이 없도록 횟수를 제한한다.
    let searchFrom = 0;
    for (let pass = 0; pass < MAX_PASSES_PER_RULE; pass++) {
      if (rule.skipIf && rule.skipIf.test(text)) break;

      // 규칙마다 새 RegExp를 만들어 lastIndex 상태 공유를 피한다
      const pattern = new RegExp(rule.pattern.source, rule.pattern.flags);
      const match = execFrom(pattern, text, searchFrom);
      if (!match || match.index === undefined) break;

      const replacement = typeof rule.replace === 'string' ? rule.replace : rule.replace(match);
      const before = match[0];
      if (replacement === null) {
        // 이 자리는 건너뛰고 뒤쪽에서 같은 오류를 계속 찾는다
        searchFrom = match.index + Math.max(before.length, 1);
        continue;
      }

      const after = expand(replacement, match);
      if (before === after) {
        searchFrom = match.index + Math.max(before.length, 1);
        continue;
      }

      text = text.slice(0, match.index) + after + text.slice(match.index + before.length);
      // 방금 넣은 결과를 다시 검사하지 않는다 (자기 출력 재매치 방지)
      searchFrom = match.index + after.length;

      changes.push({ from: before.trim(), to: after.trim(), reasonKo: rule.reasonKo });
      if (!explanations.includes(rule.explanationKo)) explanations.push(rule.explanationKo);
      if (
        rule.keyExpression &&
        !keyExpressions.some((k) => k.expression === rule.keyExpression!.expression)
      ) {
        keyExpressions.push(rule.keyExpression);
      }
      if (!appliedRuleIds.includes(rule.id)) appliedRuleIds.push(rule.id);
      if (rule.severity === 'major') severity = 'major';
      else if (severity !== 'major') severity = 'minor';
    }
  }

  // 마무리 다듬기 (대문자/마침표) — 이것만으로는 교정으로 치지 않는다
  if (language === 'en') text = capitalizeFirst(text);
  text = ensureTerminator(text, language);

  return { corrected: text, changes, explanations, keyExpressions, severity, appliedRuleIds };
}

/** 엔진 결과를 앱의 CorrectionResult 형태로 변환 */
export function toCorrectionResult(original: string, result: EngineResult): CorrectionResult {
  return {
    severity: result.severity,
    original,
    corrected: result.corrected,
    explanationKo: result.explanations.join(' '),
    changedParts: result.changes,
    keyExpressions: result.keyExpressions,
    readingJa: null,
  };
}
