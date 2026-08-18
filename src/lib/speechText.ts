/**
 * TTS 재생용 텍스트 정제 — 이모지/기호가 음성으로 읽히지 않게 제거한다.
 * (예: "Hi! 😊" → "Hi!" — 안 그러면 "smiling face..."까지 읽는다)
 *
 * Hermes(네이티브) 호환을 위해 \p{Emoji} 대신 명시적 코드포인트 범위를 사용한다.
 */

const EMOJI_PATTERN = new RegExp(
  [
    '[\u{1F000}-\u{1FAFF}]', // 이모티콘, 픽토그램, 교통, 보조 기호 등 (🀀–🫿)
    '[\u{1F1E6}-\u{1F1FF}]', // 국기용 지역 표시 문자
    '[☀-➿]', // 기타 기호, 딩뱃 (☀–➿)
    '[⬀-⯿]', // 별(⭐) 등 기타 기호
    '[←-⇿]', // 화살표 (텍스트로 읽을 필요 없음)
    '[⌀-⏿]', // 기술 기호 (⌚⏰ 등)
    '[︎️]', // variation selectors
    '‍', // zero-width joiner (조합 이모지)
    '⃣', // combining keycap
    '[™©®]', // ™ © ®
    '[〰〽㊗㊙]', // 〰〽㊗㊙
  ].join('|'),
  'gu',
);

/** 이모지/기호 제거 + 공백 정리. 결과가 비면 빈 문자열 반환 (재생 생략용). */
export function sanitizeForSpeech(text: string): string {
  return text
    .replace(EMOJI_PATTERN, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
