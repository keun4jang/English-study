import { KoNoun } from './types';

/**
 * 명사 사전.
 *
 * 영어는 **ASCII로만** 적는다. 번들 폰트(SUIT)에 é 같은 확장 라틴 글자가 없어서,
 * "café"를 쓰면 é 한 글자만 시스템 폰트로 떨어져 굵기가 튄다. 'cafe'로 충분하다.
 *
 * 영어는 **관사까지 포함해서** 적는다. "카페" → "a café"로 두면 "I went to a café",
 * "at a café" 둘 다 자연스럽게 붙는다. 관사를 따로 계산하려 들면 셀 수 있는 명사인지,
 * 특정한 그것인지를 매번 판단해야 해서 틀리기 쉽다.
 *
 * 여기 없는 단어는 지어내지 않는다. 문장에 [단어] 형태로 남기고 사용자에게 알려준다.
 */

const n = (
  ko: string,
  en: string,
  ja: string,
  extra?: Partial<KoNoun>,
): KoNoun => ({ ko, en, ja, ...extra });

/** 시간 표현 — 영어에서는 문장 끝에 붙인다 */
export const TIME_WORDS: KoNoun[] = [
  n('오늘', 'today', '今日'),
  n('어제', 'yesterday', '昨日'),
  n('그제', 'the day before yesterday', 'おととい', { alt: ['그저께'] }),
  n('내일', 'tomorrow', '明日'),
  n('아침', 'in the morning', '朝', { alt: ['아침에'] }),
  n('점심', 'at lunch', '昼', { alt: ['점심에'] }),
  n('오후', 'in the afternoon', '午後', { alt: ['오후에'] }),
  n('저녁', 'in the evening', '夕方', { alt: ['저녁에'] }),
  n('밤', 'at night', '夜', { alt: ['밤에'] }),
  n('새벽', 'early in the morning', '早朝', { alt: ['새벽에'] }),
  n('주말', 'over the weekend', '週末', { alt: ['주말에'] }),
  n('이번 주', 'this week', '今週'),
  n('지난주', 'last week', '先週'),
  n('요즘', 'these days', '最近'),
  n('아까', 'earlier', 'さっき'),
  n('방금', 'just now', 'さっき'),
];

/** 사람 — "with {person}" / "met {person}" 자리에 들어간다 */
export const PEOPLE: KoNoun[] = [
  n('친구', 'a friend', '友だち'),
  n('친구들', 'my friends', '友だち'),
  n('가족', 'my family', '家族'),
  n('엄마', 'my mom', '母', { alt: ['어머니'] }),
  n('아빠', 'my dad', '父', { alt: ['아버지'] }),
  n('부모님', 'my parents', '両親'),
  n('언니', 'my sister', '姉', { alt: ['누나'] }),
  n('오빠', 'my brother', '兄', { alt: ['형'] }),
  n('동생', 'my younger sibling', '弟妹'),
  n('남편', 'my husband', '夫'),
  n('아내', 'my wife', '妻'),
  n('남자친구', 'my boyfriend', '彼氏'),
  n('여자친구', 'my girlfriend', '彼女'),
  n('동료', 'a coworker', '同僚'),
  n('선배', 'a senior colleague', '先輩'),
  n('후배', 'a junior colleague', '後輩'),
  n('상사', 'my boss', '上司', { alt: ['팀장님', '부장님'] }),
  n('선생님', 'my teacher', '先生'),
  n('반려견', 'my dog', '犬', { alt: ['강아지'] }),
  n('고양이', 'my cat', '猫'),
  n('혼자', 'by myself', 'ひとりで'),
];

/** 장소 — "to {place}" / "at {place}" */
export const PLACES: KoNoun[] = [
  n('집', 'home', '家', { bareDestination: true }),
  n('회사', 'work', '会社'),
  n('학교', 'school', '学校'),
  n('사무실', 'the office', 'オフィス'),
  n('카페', 'a cafe', 'カフェ'),
  n('식당', 'a restaurant', 'レストラン'),
  n('공원', 'the park', '公園'),
  n('도서관', 'the library', '図書館'),
  n('병원', 'the hospital', '病院'),
  n('치과', 'the dentist', '歯医者'),
  n('마트', 'the store', 'スーパー', { alt: ['슈퍼'] }),
  n('편의점', 'the convenience store', 'コンビニ'),
  n('시장', 'the market', '市場'),
  n('백화점', 'the department store', 'デパート'),
  n('헬스장', 'the gym', 'ジム', { alt: ['체육관', '짐'] }),
  n('수영장', 'the pool', 'プール'),
  n('영화관', 'the movies', '映画館', { alt: ['극장'] }),
  n('미용실', 'the hair salon', '美容室'),
  n('은행', 'the bank', '銀行'),
  n('우체국', 'the post office', '郵便局'),
  n('바다', 'the beach', '海'),
  n('산', 'the mountains', '山'),
  n('교회', 'church', '教会'),
  n('학원', 'my class', '塾'),
  n('서점', 'the bookstore', '本屋'),
  n('밖', 'outside', '外', { bareDestination: true }),
];

/** 음식·음료 — "ate {food}" / "drank {drink}" */
export const FOODS: KoNoun[] = [
  n('밥', 'a meal', 'ごはん'),
  n('아침밥', 'breakfast', '朝ごはん', { alt: ['아침식사'] }),
  n('점심밥', 'lunch', '昼ごはん', { alt: ['점심식사'] }),
  n('저녁밥', 'dinner', '晩ごはん', { alt: ['저녁식사'] }),
  n('김밥', 'gimbap', 'キンパ'),
  n('김치찌개', 'kimchi stew', 'キムチチゲ'),
  n('된장찌개', 'soybean paste stew', 'テンジャンチゲ'),
  n('라면', 'ramen', 'ラーメン'),
  n('국수', 'noodles', '麺'),
  n('불고기', 'bulgogi', 'プルコギ'),
  n('삼겹살', 'pork belly', 'サムギョプサル'),
  n('치킨', 'fried chicken', 'チキン'),
  n('피자', 'pizza', 'ピザ'),
  n('파스타', 'pasta', 'パスタ'),
  n('햄버거', 'a burger', 'ハンバーガー'),
  n('샌드위치', 'a sandwich', 'サンドイッチ'),
  n('샐러드', 'a salad', 'サラダ'),
  n('빵', 'bread', 'パン'),
  n('케이크', 'cake', 'ケーキ'),
  n('과일', 'fruit', '果物'),
  n('커피', 'coffee', 'コーヒー'),
  n('아메리카노', 'an americano', 'アメリカーノ'),
  n('라떼', 'a latte', 'ラテ'),
  n('차', 'tea', 'お茶'),
  n('맥주', 'beer', 'ビール'),
  n('술', 'a drink', 'お酒'),
  n('물', 'water', '水'),
  n('디저트', 'dessert', 'デザート'),
  n('간식', 'a snack', 'おやつ'),
];

/** 사물·대상 — 사고, 보고, 읽고, 듣는 것 */
export const THINGS: KoNoun[] = [
  n('영화', 'a movie', '映画'),
  n('드라마', 'a drama', 'ドラマ'),
  n('유튜브', 'YouTube', 'YouTube'),
  n('넷플릭스', 'Netflix', 'Netflix'),
  n('책', 'a book', '本'),
  n('뉴스', 'the news', 'ニュース'),
  n('음악', 'music', '音楽'),
  n('노래', 'a song', '歌'),
  n('팟캐스트', 'a podcast', 'ポッドキャスト'),
  n('게임', 'a game', 'ゲーム'),
  n('옷', 'clothes', '服'),
  n('신발', 'shoes', '靴'),
  n('가방', 'a bag', 'かばん'),
  n('선물', 'a present', 'プレゼント'),
  n('사진', 'photos', '写真'),
  n('일기', 'a diary entry', '日記'),
  n('메일', 'emails', 'メール', { alt: ['이메일'] }),
  n('전화', 'a call', '電話'),
  n('숙제', 'my homework', '宿題'),
  n('보고서', 'a report', 'レポート'),
  n('회의', 'a meeting', '会議'),
  n('시험', 'an exam', '試験'),
  n('영어', 'English', '英語'),
  n('일본어', 'Japanese', '日本語'),
  n('커피 한 잔', 'a cup of coffee', 'コーヒー一杯'),
  n('날씨', 'the weather', '天気'),
  n('아무것', 'anything', '何も', { alt: ['아무것도'] }),
  n('산책', 'a walk', '散歩'),
  n('청소', 'the cleaning', '掃除'),
];

/** 검색용 통합 사전 (긴 표제어가 먼저 걸리도록 정렬해 둔다) */
function indexOf(list: KoNoun[]): Map<string, KoNoun> {
  const map = new Map<string, KoNoun>();
  for (const word of list) {
    map.set(word.ko, word);
    for (const alt of word.alt ?? []) map.set(alt, word);
  }
  return map;
}

export const TIME_INDEX = indexOf(TIME_WORDS);
export const PEOPLE_INDEX = indexOf(PEOPLE);
export const PLACE_INDEX = indexOf(PLACES);
export const NOUN_INDEX = indexOf([...FOODS, ...THINGS, ...PLACES, ...PEOPLE]);

/** 모든 표제어를 긴 것부터 (부분 일치로 짧은 단어가 먼저 잡히는 것을 막는다) */
export function sortedKeys(index: Map<string, KoNoun>): string[] {
  return [...index.keys()].sort((a, b) => b.length - a.length);
}
