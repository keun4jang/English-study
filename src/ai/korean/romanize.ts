/**
 * 국어의 로마자 표기법(Revised Romanization) — 이름을 위한 최소 구현.
 *
 * 왜 필요한가: 일기에는 사전에 없을 수밖에 없는 말이 계속 나온다. 지역 이름, 동네,
 * 단골 가게, 친구 이름. 이런 건 번역하는 게 아니라 **소리 나는 대로 적는 것**이 정답이라
 * 사전을 아무리 키워도 해결되지 않는다. 대구 → Daegu.
 *
 * 다만 이걸 문장 안에 몰래 끼워 넣지는 않는다. "놀이터"를 Noriteo로 바꿔 놓으면
 * 사용자는 그게 번역인 줄 안다. 그래서 **문장에는 [놀이터]로 두고, 옆에 "이름이라면
 * Noriteo처럼 적어요"라고 제안만** 한다. 판단은 사용자가 한다.
 *
 * 표준의 음운 변화 규칙(자음 동화 등)은 넣지 않았다. 이름 표기에는 연음만으로 충분하고,
 * 동화까지 흉내 내면 오히려 틀리는 경우가 생긴다.
 */

const INITIALS = [
  'g', 'kk', 'n', 'd', 'tt', 'r', 'm', 'b', 'pp', 's', 'ss', '', 'j', 'jj', 'ch', 'k', 't', 'p', 'h',
];

const MEDIALS = [
  'a', 'ae', 'ya', 'yae', 'eo', 'e', 'yeo', 'ye', 'o', 'wa', 'wae', 'oe', 'yo',
  'u', 'wo', 'we', 'wi', 'yu', 'eu', 'ui', 'i',
];

/** 받침의 소리 (다음 글자가 자음일 때) */
const FINALS = [
  '', 'k', 'k', 'k', 'n', 'n', 'n', 't', 'l', 'k', 'm', 'p', 't', 't', 'p', 'l',
  'm', 'p', 'p', 't', 't', 'ng', 't', 't', 'k', 't', 'p', 't',
];

/** 받침이 다음 글자의 첫소리로 넘어갈 때(연음)의 소리 — 초성 자리에서의 값 */
const FINAL_AS_ONSET = [
  '', 'g', 'kk', 'ks', 'n', 'nj', 'nh', 'd', 'r', 'lg', 'lm', 'lb', 'ls', 'lt', 'lp', 'lh',
  'm', 'b', 'ps', 's', 'ss', 'ng', 'j', 'ch', 'k', 't', 'p', 'h',
];

interface Syllable {
  initial: number;
  medial: number;
  final: number;
}

function decompose(ch: string): Syllable | null {
  const code = ch.charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) return null;
  return {
    initial: Math.floor(code / 588),
    medial: Math.floor((code % 588) / 28),
    final: code % 28,
  };
}

/**
 * 한글 낱말을 로마자로 적는다. 한글이 아닌 글자는 그대로 둔다.
 * 첫 글자는 이름처럼 대문자로 만든다.
 */
export function romanize(word: string): string {
  const syllables = [...word].map((ch) => ({ ch, parsed: decompose(ch) }));
  let out = '';

  for (let i = 0; i < syllables.length; i += 1) {
    const { ch, parsed } = syllables[i];
    if (!parsed) {
      out += ch;
      continue;
    }
    const next = syllables[i + 1]?.parsed ?? null;

    out += INITIALS[parsed.initial];
    out += MEDIALS[parsed.medial];

    if (parsed.final === 0) continue;
    // 다음 글자가 'ㅇ'으로 시작하면 받침이 그쪽 첫소리로 넘어간다 (연음)
    // 예: 강남 → Gangnam, 홍대 → Hongdae, 목요일 → mogyoil
    if (next && next.initial === 11) {
      out += FINAL_AS_ONSET[parsed.final];
    } else {
      out += FINALS[parsed.final];
    }
  }

  return out ? `${out.charAt(0).toUpperCase()}${out.slice(1)}` : out;
}
