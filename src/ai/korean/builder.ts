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

const choices = (list: KoNoun[]): BuilderChoice[] => list.map((w) => ({ ko: w.ko, value: w.ko }));

const TIME_CHOICES = choices(TIME_WORDS.filter((w) => ['오늘', '어제', '아침', '점심', '저녁', '밤', '주말'].includes(w.ko)));
const PERSON_CHOICES = choices(PEOPLE.filter((w) => ['혼자', '친구', '가족', '엄마', '아빠', '동료', '남자친구', '여자친구'].includes(w.ko)));

export const BUILDER_FRAMES: BuilderFrame[] = [
  {
    id: 'went',
    titleKo: '어디에 갔어요',
    shapeKo: '오늘 친구랑 카페에 갔어요',
    steps: [
      { id: 'time', labelKo: '언제요?', choices: TIME_CHOICES },
      { id: 'place', labelKo: '어디에 갔어요?', choices: choices(PLACES) },
      { id: 'person', labelKo: '누구랑 갔어요?', choices: PERSON_CHOICES, optional: true },
    ],
  },
  {
    id: 'ate',
    titleKo: '무엇을 먹었어요',
    shapeKo: '점심에 김치찌개를 먹었어요',
    steps: [
      { id: 'time', labelKo: '언제요?', choices: TIME_CHOICES },
      { id: 'object', labelKo: '무엇을 먹었어요?', choices: choices(FOODS) },
      { id: 'person', labelKo: '누구랑 먹었어요?', choices: PERSON_CHOICES, optional: true },
    ],
  },
  {
    id: 'did',
    titleKo: '무엇을 했어요',
    shapeKo: '오늘 운동했어요',
    steps: [
      { id: 'time', labelKo: '언제요?', choices: TIME_CHOICES },
      {
        id: 'activity',
        labelKo: '무엇을 했어요?',
        choices: DO_VERBS.filter((v) => v.ko !== '얘기').map((v) => ({ ko: `${v.ko}하기`, value: v.ko })),
      },
      { id: 'place', labelKo: '어디에서요?', choices: choices(PLACES), optional: true },
    ],
  },
  {
    id: 'watched',
    titleKo: '무엇을 보고 들었어요',
    shapeKo: '저녁에 영화를 봤어요',
    steps: [
      { id: 'time', labelKo: '언제요?', choices: TIME_CHOICES },
      { id: 'object', labelKo: '무엇을 봤어요?', choices: choices(THINGS) },
    ],
  },
  {
    id: 'met',
    titleKo: '누구를 만났어요',
    shapeKo: '오늘 친구를 만났어요',
    steps: [
      { id: 'time', labelKo: '언제요?', choices: TIME_CHOICES },
      { id: 'person', labelKo: '누구를 만났어요?', choices: choices(PEOPLE.filter((p) => p.ko !== '혼자')) },
      { id: 'place', labelKo: '어디에서요?', choices: choices(PLACES), optional: true },
    ],
  },
  {
    id: 'felt',
    titleKo: '오늘 기분이 어땠어요',
    shapeKo: '오늘 좀 피곤했어요',
    steps: [
      { id: 'time', labelKo: '언제요?', choices: TIME_CHOICES },
      {
        id: 'feeling',
        labelKo: '어땠어요?',
        choices: ADJECTIVES.map((a) => ({ ko: a.forms[0], value: a.ko })),
      },
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
