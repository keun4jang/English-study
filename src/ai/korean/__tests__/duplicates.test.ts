import { FOODS, PEOPLE, PLACES, REGIONS, THINGS, TIME_WORDS } from '../words';
import { ADJECTIVES, DO_VERBS, VERBS } from '../verbs';

/**
 * 사전에 같은 표제어가 두 번 들어가면 뒤엣것은 영원히 안 쓰인다.
 * 고쳐야 할 때 눈에 안 보이는 쪽을 고치게 돼서, 고쳤는데 화면이 안 바뀐다.
 */
describe('사전 중복', () => {
  it('명사 표제어와 별칭이 겹치지 않는다', () => {
    const seen = new Map<string, string>();
    const duplicates: string[] = [];
    for (const [group, list] of Object.entries({ TIME_WORDS, PEOPLE, PLACES, REGIONS, FOODS, THINGS })) {
      for (const word of list) {
        for (const key of [word.ko, ...(word.alt ?? [])]) {
          const previous = seen.get(key);
          if (previous) duplicates.push(`${key} (${previous} ↔ ${group})`);
          else seen.set(key, group);
        }
      }
    }
    expect(duplicates).toEqual([]);
  });

  it('동사·형용사 표제어가 겹치지 않는다', () => {
    const verbs = VERBS.map((v) => v.ko);
    expect(new Set(verbs).size).toBe(verbs.length);
    const doVerbs = DO_VERBS.map((v) => v.ko);
    expect(new Set(doVerbs).size).toBe(doVerbs.length);
    const adjectives = ADJECTIVES.map((a) => a.ko);
    expect(new Set(adjectives).size).toBe(adjectives.length);
  });
});
