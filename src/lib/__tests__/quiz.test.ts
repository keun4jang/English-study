import { SavedExpression } from '@/domain/types';
import { buildQuizQuestion, masteryLevel } from '../quiz';

function expr(id: string, expression: string, meaningKo: string): SavedExpression {
  return {
    id,
    ownerId: 'u1',
    expression,
    meaningKo,
    example: '',
    language: 'en',
    sourceDiaryId: null,
    isFavorite: false,
    nextReviewDate: '2026-08-18',
    reviewCount: 0,
    createdAt: '2026-08-18T00:00:00Z',
  };
}

describe('buildQuizQuestion', () => {
  const all = [
    expr('1', 'go to a café', '카페에 가다'),
    expr('2', 'take a break', '잠깐 쉬다'),
    expr('3', 'run late', '늦어지다'),
    expr('4', 'catch up', '밀린 이야기를 나누다'),
  ];

  it('정답이 항상 보기에 포함된다', () => {
    const q = buildQuizQuestion(all[0], all, () => 0.5);
    expect(q.choices).toContain('카페에 가다');
    expect(q.correctMeaning).toBe('카페에 가다');
  });

  it('보기는 최대 4개, 중복 없음', () => {
    const q = buildQuizQuestion(all[0], all, () => 0.5);
    expect(q.choices.length).toBe(4);
    expect(new Set(q.choices).size).toBe(4);
  });

  it('저장 표현이 부족하면 기본 풀에서 오답을 채운다', () => {
    const only = [all[0]];
    const q = buildQuizQuestion(all[0], only, () => 0.5);
    expect(q.choices.length).toBe(4);
    expect(q.choices).toContain('카페에 가다');
  });

  it('같은 뜻의 다른 표현은 오답으로 쓰지 않는다', () => {
    const dupMeaning = [...all, expr('5', 'visit a coffee shop', '카페에 가다')];
    const q = buildQuizQuestion(all[0], dupMeaning, () => 0.5);
    expect(q.choices.filter((c) => c === '카페에 가다').length).toBe(1);
  });
});

describe('masteryLevel', () => {
  it('복습 횟수에 따라 단계 판정', () => {
    expect(masteryLevel(0)).toBe('new');
    expect(masteryLevel(1)).toBe('learning');
    expect(masteryLevel(2)).toBe('learning');
    expect(masteryLevel(3)).toBe('familiar');
  });
});
