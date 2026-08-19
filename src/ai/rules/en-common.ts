import { CorrectionRule } from './types';

/**
 * 한국어 사용자가 자주 만드는 영어 오류 중, 위의 시제/수 일치/관사/전치사 규칙이
 * 잡지 않는 것들. 모두 "패턴이 확실한 것"만 넣는다.
 *
 * 안전 원칙: 동사 목록을 화이트리스트로 관리해 엉뚱한 단어를 동사로 오해하지 않는다.
 */

/** to부정사/동명사 규칙에서 다룰 일반 동사 (원형) */
const COMMON_VERBS = [
  'go', 'come', 'eat', 'drink', 'see', 'watch', 'read', 'write', 'buy', 'make',
  'take', 'get', 'meet', 'visit', 'travel', 'study', 'learn', 'sleep', 'play',
  'start', 'finish', 'cook', 'walk', 'run', 'swim', 'talk', 'speak', 'call',
  'help', 'live', 'work', 'stay', 'leave', 'move', 'rest', 'relax', 'listen',
  'try', 'change', 'clean', 'draw', 'sing', 'dance', 'ride', 'sit', 'stand',
  'wait', 'practice', 'exercise', 'swim', 'shop', 'stop', 'plan', 'save',
];

const VERB_ALT = [...new Set(COMMON_VERBS)].join('|');

/** 자음+모음+자음으로 끝나 -ing에서 자음을 겹치는 동사들 */
const DOUBLE_CONSONANT = new Set(['run', 'swim', 'sit', 'get', 'stop', 'shop', 'plan', 'jog', 'begin', 'put']);

function toGerund(verb: string): string {
  const lower = verb.toLowerCase();
  if (DOUBLE_CONSONANT.has(lower)) return `${lower}${lower.slice(-1)}ing`;
  if (lower.endsWith('ie')) return `${lower.slice(0, -2)}ying`;
  if (lower.endsWith('e') && !lower.endsWith('ee') && !lower.endsWith('oe')) {
    return `${lower.slice(0, -1)}ing`;
  }
  return `${lower}ing`;
}

export const EN_COMMON_RULES: CorrectionRule[] = [
  {
    id: 'en-common-want-to-infinitive',
    language: 'en',
    severity: 'major',
    // want/need/decide 류 뒤에는 반드시 to가 온다
    pattern: new RegExp(
      String.raw`\b(want|wants|wanted|need|needs|needed|decide|decides|decided|plan|plans|planned|hope|hopes|hoped|promise|promises|promised|agree|agrees|agreed|learn|learns|learned|wish|wishes|wished|expect|expects|expected|forget|forgets|forgot|refuse|refuses|refused)\s+(${VERB_ALT})\b`,
      'i',
    ),
    replace: (m) => `${m[1]} to ${m[2]}`,
    explanationKo: 'want, need, decide 같은 동사 뒤에는 to가 필요해요. "I want to go home"처럼요.',
    reasonKo: 'to부정사 빠짐',
    keyExpression: {
      expression: 'want to + 동사원형',
      meaningKo: '~하고 싶다',
      example: 'I want to go home early today.',
    },
  },
  {
    id: 'en-common-gerund-after-enjoy',
    language: 'en',
    severity: 'major',
    // enjoy/finish/keep 류 뒤에는 to가 아니라 -ing가 온다
    pattern: new RegExp(
      String.raw`\b(enjoy|enjoys|enjoyed|finish|finishes|finished|keep|keeps|kept|avoid|avoids|avoided|mind|minds|practice|practices|practiced|suggest|suggests|suggested|quit|quits|consider|considers|considered|imagine|imagines|imagined)\s+to\s+(${VERB_ALT})\b`,
      'i',
    ),
    replace: (m) => `${m[1]} ${toGerund(m[2])}`,
    explanationKo: 'enjoy, finish, keep 뒤에는 to가 아니라 -ing를 써요. "I enjoy reading books"처럼요.',
    reasonKo: '동명사(-ing)를 쓰는 동사',
    keyExpression: {
      expression: 'enjoy + -ing',
      meaningKo: '~하는 것을 즐기다',
      example: 'I enjoy reading books before bed.',
    },
  },
  {
    id: 'en-common-make-a-mistake',
    language: 'en',
    severity: 'minor',
    pattern: /\b(did|do|does|doing)\s+(a|an|the|my|his|her|some|another)\s+(mistake|mistakes)\b/i,
    replace: (m) => {
      const map: Record<string, string> = {
        did: 'made',
        do: 'make',
        does: 'makes',
        doing: 'making',
      };
      return `${map[m[1].toLowerCase()] ?? 'made'} ${m[2]} ${m[3]}`;
    },
    explanationKo: '실수는 do가 아니라 make와 함께 써요. "I made a mistake"가 자연스러워요.',
    reasonKo: 'make a mistake 관용 표현',
    keyExpression: {
      expression: 'make a mistake',
      meaningKo: '실수하다',
      example: 'I made a small mistake at work today.',
    },
  },
  {
    id: 'en-common-interested-in',
    language: 'en',
    // "interested to know"는 맞는 표현이라 to는 건드리지 않는다
    severity: 'minor',
    pattern: /\binterested\s+(on|about|with|for)\b/i,
    replace: 'interested in',
    explanationKo: '관심이 있다고 할 때는 interested in을 써요.',
    reasonKo: 'interested in 고정 표현',
    keyExpression: {
      expression: 'be interested in',
      meaningKo: '~에 관심이 있다',
      example: 'I am interested in learning Japanese.',
    },
  },
  {
    id: 'en-common-every-day',
    language: 'en',
    severity: 'minor',
    pattern: /\bevery\s+days\b/i,
    replace: 'every day',
    explanationKo: 'every 뒤에는 단수를 써요. "every day"가 맞아요.',
    reasonKo: 'every + 단수 명사',
  },
  {
    id: 'en-common-language-capital',
    language: 'en',
    severity: 'minor',
    // 언어·나라 이름은 문장 중간에서도 항상 대문자로 시작한다
    pattern:
      /\b(english|japanese|korean|chinese|spanish|french|german|italian|russian|vietnamese|thai|korea|japan)\b/,
    replace: (m) => m[1].charAt(0).toUpperCase() + m[1].slice(1),
    explanationKo: '언어와 나라 이름은 문장 중간에서도 첫 글자를 대문자로 써요.',
    reasonKo: '고유명사 대문자',
  },
];
