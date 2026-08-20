import { LearningLanguage } from '@/domain/types';
import { composeSuggestions } from './compose';
import { KoNoun, KoParse, KoSuggestion } from './types';
import { ADJECTIVES, DO_VERBS, VERBS } from './verbs';
import { FOODS, PEOPLE, PLACES, THINGS, TIME_WORDS } from './words';

/**
 * 문장 만들기.
 *
 * 사전이 문장을 못 알아들었을 때 쓰는 두 번째 길이다. 번역하는 대신 **틀을 주고 고르게**
 * 한다. 고르는 것만으로 문장이 되니 막히는 순간이 없고, 같은 틀을 반복해서 쓰다 보면
 * 그 문형이 손에 붙는다.
 *
 * 조립은 사전 경로와 똑같은 compose를 쓴다. 두 길이 다른 영어를 내놓으면 사용자는
 * 어느 쪽이 맞는지 알 수 없게 된다.
 */

export interface BuilderChoice {
  /** 화면에 보이는 한국어 */
  ko: string;
  /** 이 선택이 가리키는 사전 표제어 */
  value: string;
}

export interface BuilderStep {
  id: 'time' | 'person' | 'place' | 'object' | 'activity' | 'feeling';
  labelKo: string;
  choices: BuilderChoice[];
  /** 건너뛸 수 있는 단계 */
  optional?: boolean;
}

export interface BuilderFrame {
  id: string;
  /** 목록에 보이는 이름 */
  titleKo: string;
  /** 이 틀이 만드는 문장의 모양 */
  shapeKo: string;
  steps: BuilderStep[];
}

export type BuilderSelection = Partial<Record<BuilderStep['id'], string>>;

/**
 * 문장 만들기에 띄울 선택지.
 *
 * 사전 전체를 그대로 뿌리지 않는다. 사전이 커지면서 한 단계에 칩이 90개까지 늘어난 적이
 * 있는데, 고르는 화면이 벽이 되면 "고르기만 하면 된다"는 이 기능의 이유가 사라진다.
 * 자주 쓰는 것만 손으로 골라 두고, 나머지는 한국어로 직접 써서 사전 경로로 처리한다.
 *
 * 여기 적은 이름이 사전에서 사라지면 칩이 조용히 없어지므로 테스트가 감시한다.
 */
function pick(list: KoNoun[], names: string[]): BuilderChoice[] {
  return names
    .map((name) => list.find((word) => word.ko === name))
    .filter((word): word is KoNoun => Boolean(word))
    .map((word) => ({ ko: word.ko, value: word.ko }));
}

export const BUILDER_CHOICE_NAMES = {
  time: ['오늘', '어제', '아침', '점심', '저녁', '밤', '주말'],
  person: ['혼자', '친구', '가족', '엄마', '아빠', '동생', '남자친구', '여자친구', '동료'],
  meetPerson: ['친구', '가족', '엄마', '아빠', '동생', '남자친구', '여자친구', '동료', '선배', '손님', '팀원들', '사장님'],
  place: ['집', '회사', '학교', '카페', '식당', '마트', '편의점', '병원', '공원', '헬스장', '영화관', '도서관', '미용실', '백화점'],
  food: ['밥', '김밥', '김치찌개', '라면', '치킨', '피자', '파스타', '햄버거', '샌드위치', '삼겹살', '커피', '맥주', '빵', '케이크', '과일', '간식'],
  thing: ['영화', '드라마', '유튜브', '넷플릭스', '책', '뉴스', '음악', '노래', '게임', '사진', '팟캐스트'],
  activity: ['운동', '공부', '일', '요리', '청소', '산책', '쇼핑', '빨래', '설거지', '회의', '야근', '출근', '알바', '샤워', '여행', '등산'],
  feeling: ['피곤하다', '행복하다', '힘들다', '좋다', '재미있다', '바쁘다', '짜증나다', '뿌듯하다', '우울하다', '신나다', '졸리다', '걱정되다', '속상하다', '설레다', '정신없다'],
} as const;

const TIME_CHOICES = pick(TIME_WORDS, [...BUILDER_CHOICE_NAMES.time]);
const PERSON_CHOICES = pick(PEOPLE, [...BUILDER_CHOICE_NAMES.person]);
const MEET_PERSON_CHOICES = pick(PEOPLE, [...BUILDER_CHOICE_NAMES.meetPerson]);
const PLACE_CHOICES = pick(PLACES, [...BUILDER_CHOICE_NAMES.place]);
const FOOD_CHOICES = pick(FOODS, [...BUILDER_CHOICE_NAMES.food]);
const THING_CHOICES = pick(THINGS, [...BUILDER_CHOICE_NAMES.thing]);
const ACTIVITY_CHOICES: BuilderChoice[] = [...BUILDER_CHOICE_NAMES.activity]
  .filter((name) => DO_VERBS.some((verb) => verb.ko === name))
  .map((name) => ({ ko: `${name}하기`, value: name }));
const FEELING_CHOICES: BuilderChoice[] = [...BUILDER_CHOICE_NAMES.feeling]
  .map((name) => ADJECTIVES.find((item) => item.ko === name))
  .filter((item): item is (typeof ADJECTIVES)[number] => Boolean(item))
  .map((item) => ({ ko: item.forms[0], value: item.ko }));

export const BUILDER_FRAMES: BuilderFrame[] = [
  {
    id: 'went',
    titleKo: '어디에 갔어요',
    shapeKo: '오늘 친구랑 카페에 갔어요',
    steps: [
      { id: 'time', labelKo: '언제요?', choices: TIME_CHOICES },
      { id: 'place', labelKo: '어디에 갔어요?', choices: PLACE_CHOICES },
      { id: 'person', labelKo: '누구랑 갔어요?', choices: PERSON_CHOICES, optional: true },
    ],
  },
  {
    id: 'ate',
    titleKo: '무엇을 먹었어요',
    shapeKo: '점심에 김치찌개를 먹었어요',
    steps: [
      { id: 'time', labelKo: '언제요?', choices: TIME_CHOICES },
      { id: 'object', labelKo: '무엇을 먹었어요?', choices: FOOD_CHOICES },
      { id: 'person', labelKo: '누구랑 먹었어요?', choices: PERSON_CHOICES, optional: true },
    ],
  },
  {
    id: 'did',
    titleKo: '무엇을 했어요',
    shapeKo: '오늘 운동했어요',
    steps: [
      { id: 'time', labelKo: '언제요?', choices: TIME_CHOICES },
      { id: 'activity', labelKo: '무엇을 했어요?', choices: ACTIVITY_CHOICES },
      { id: 'place', labelKo: '어디에서요?', choices: PLACE_CHOICES, optional: true },
    ],
  },
  {
    id: 'watched',
    titleKo: '무엇을 보고 들었어요',
    shapeKo: '저녁에 영화를 봤어요',
    steps: [
      { id: 'time', labelKo: '언제요?', choices: TIME_CHOICES },
      { id: 'object', labelKo: '무엇을 봤어요?', choices: THING_CHOICES },
    ],
  },
  {
    id: 'met',
    titleKo: '누구를 만났어요',
    shapeKo: '오늘 친구를 만났어요',
    steps: [
      { id: 'time', labelKo: '언제요?', choices: TIME_CHOICES },
      { id: 'person', labelKo: '누구를 만났어요?', choices: MEET_PERSON_CHOICES },
      { id: 'place', labelKo: '어디에서요?', choices: PLACE_CHOICES, optional: true },
    ],
  },
  {
    id: 'felt',
    titleKo: '오늘 기분이 어땠어요',
    shapeKo: '오늘 좀 피곤했어요',
    steps: [
      { id: 'time', labelKo: '언제요?', choices: TIME_CHOICES },
      { id: 'feeling', labelKo: '어땠어요?', choices: FEELING_CHOICES },
    ],
  },
];

const find = (list: KoNoun[], ko?: string): KoNoun | null =>
  (ko ? list.find((w) => w.ko === ko) : undefined) ?? null;

/** 각 틀이 쓰는 동사 */
const FRAME_VERB: Record<string, string> = {
  went: 'go',
  ate: 'eat',
  watched: 'watch',
  met: 'meet',
};

export function composeFromFrame(
  frameId: string,
  selection: BuilderSelection,
  language: LearningLanguage,
): KoSuggestion[] {
  const frame = BUILDER_FRAMES.find((f) => f.id === frameId);
  if (!frame) return [];

  const parse: KoParse = {
    source: '',
    time: find(TIME_WORDS, selection.time),
    person: find(PEOPLE, selection.person),
    place: find(PLACES, selection.place),
    object: find([...FOODS, ...THINGS], selection.object),
    verb: null,
    adjective: null,
    tense: 'past',
    negated: false,
    intensified: false,
    unknown: [],
    // 칩을 골라 만든 문장은 우리가 만든 조각뿐이라 버려지거나 못 읽은 부분이 없다
    dropped: [],
    unhandled: [],
  };

  if (frameId === 'felt') {
    parse.adjective = ADJECTIVES.find((a) => a.ko === selection.feeling) ?? null;
    if (!parse.adjective) return [];
  } else if (frameId === 'did') {
    const doVerb = DO_VERBS.find((v) => v.ko === selection.activity);
    if (!doVerb) return [];
    (parse as KoParse & { doVerb?: typeof doVerb }).doVerb = doVerb;
  } else {
    const verbId = FRAME_VERB[frameId];
    parse.verb = VERBS.find((v) => v.id === verbId) ?? null;
    if (!parse.verb) return [];
  }

  return composeSuggestions(parse, language);
}

export function buildFrames(): BuilderFrame[] {
  return BUILDER_FRAMES;
}
