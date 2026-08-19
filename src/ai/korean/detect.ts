/**
 * 한글 입력 감지.
 *
 * 이게 없으면 한국어로 쓴 문장이 영어 문장으로 취급돼서 "잘 썼어요"로 표시되고,
 * 그대로 영어 일기에 저장된다. 조용히 일어나서 나중에야 알게 되는 문제라 입구에서 막는다.
 */

const HANGUL = /[가-힣ㄱ-ㅎㅏ-ㅣ]/g;
/** 글자 수를 셀 때 기준이 되는 문자 (숫자·기호·공백은 제외) */
const LETTER = /[가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z぀-ヿ一-鿿]/g;

/** 글자 중 한글 비율 (0~1). 글자가 하나도 없으면 0 */
export function hangulRatio(text: string): number {
  const letters = text.match(LETTER)?.length ?? 0;
  if (letters === 0) return 0;
  return (text.match(HANGUL)?.length ?? 0) / letters;
}

/**
 * 배울 언어로 쓰지 않고 한국어로 쓴 문장인지.
 *
 * 비율로 판단하는 이유: "오늘 cafe 갔어"처럼 섞여 들어오는 경우가 흔하고,
 * 반대로 영어 문장에 한글 고유명사 하나가 섞였다고 한국어로 볼 수는 없다.
 * 0.3은 "한 단어만 한글" 정도는 통과시키고 문장 전체가 한글이면 잡는 선이다.
 */
export function isKoreanInput(text: string): boolean {
  return hangulRatio(text) >= 0.3;
}
