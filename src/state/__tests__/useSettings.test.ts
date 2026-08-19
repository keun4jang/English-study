import { useSettings } from '../useSettings';

/**
 * 저장된 설정 병합 회귀 테스트.
 *
 * zustand persist의 기본 병합은 최상위만 얕게 덮어써서, 예전에 설정을 저장한 사용자는
 * 나중에 추가된 항목이 undefined가 된다. 실제로 홈 화면에 "NaN/"이 찍혔다.
 * 설정 그룹에 항목을 새로 추가할 때 이 테스트가 먼저 깨지도록 해 둔다.
 */

type Merge = (persisted: unknown, current: unknown) => Record<string, unknown>;

const merge = useSettings.persist.getOptions().merge as unknown as Merge;

describe('설정 병합', () => {
  const current = useSettings.getState();

  it('persist에 merge가 설정돼 있다 (기본 얕은 병합이면 NaN 버그가 되돌아온다)', () => {
    expect(typeof merge).toBe('function');
  });

  it('저장된 값이 없으면 기본값을 그대로 쓴다', () => {
    expect(merge(undefined, current).learning).toEqual(current.learning);
  });

  it('예전 사용자의 learning에 없는 항목을 기본값으로 채운다', () => {
    const old = { onboardingCompleted: true, learning: { language: 'ja', level: 'beginner' } };
    const merged = merge(old, current) as { learning: Record<string, unknown> };
    expect(merged.learning.language).toBe('ja');
    expect(merged.learning.dailyGoalSentences).toBe(current.learning.dailyGoalSentences);
    expect(typeof merged.learning.dailyGoalSentences).toBe('number');
  });

  it('모든 설정 그룹이 병합 대상에 포함돼 있다', () => {
    const groups = ['learning', 'voice', 'diary', 'design', 'notifications', 'dev'] as const;
    const merged = merge({ onboardingCompleted: true }, current) as Record<string, unknown>;
    for (const group of groups) {
      expect({ group, value: merged[group] }).toEqual({ group, value: current[group] });
    }
  });

  it('기본 하루 목표는 유한한 양수다 (NaN 방지)', () => {
    const goal = current.learning.dailyGoalSentences;
    expect(Number.isFinite(goal) && goal > 0).toBe(true);
  });
});
