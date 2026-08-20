import { helpFromKorean } from '../index';
import { parseKorean } from '../parse';

const show = (s: string) => {
  const p = parseKorean(s);
  const h = helpFromKorean(s, 'en');
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({
    src: s,
    time: p.time?.ko ?? null,
    person: p.person?.ko ?? null,
    place: p.place?.ko ?? null,
    object: p.object?.ko ?? null,
    verb: p.verb?.id ?? null,
    doVerb: (p as any).doVerb?.ko ?? null,
    adj: p.adjective?.ko ?? null,
    tense: p.tense,
    unknown: p.unknown,
    dropped: p.dropped,
    unhandled: p.unhandled,
    sugg: h.suggestions.map((x) => x.text),
    reason: h.cannotReason,
    words: h.words,
  }));
};

it('scratch', () => {
  [
    '오늘 여의도 한강 공원을 뛰면서 영상과 사진 촬영을 했어',
    '오늘 카페에서 책 읽고 집에 갔어',
    '밥 먹고 나서 산책했어',
    '카페에서 공원에서 놀았어',
    '오늘 새로 산 신발이 마음에 들어',
    '오늘 그거 했어',
    '오늘 망원동에서 그거 했어',
    '어제 팀장님이랑 회의하고 야근했어',
    '오늘 아침에 일어나서 운동했어',
    '오늘 하루종일 집에서 뒹굴거렸어',
    '주말에 친구랑 홍대에서 술 마시고 노래방 갔어',
    '오늘 회사에서 발표 준비하느라 정신없었어',
    '점심에 김치찌개 먹었어',
    '오늘 기분이 좀 이상해',
    '아 몰라 그냥 짜증나',
    '오늘 여의도 한강 공원에서 뛰었어',
    '영상이랑 사진 촬영했어',
  ].forEach(show);
});
