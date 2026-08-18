import { checkAiTurnAllowed, checkDiaryGenerationAllowed, emptyUsage, getUsageLimits } from '../usageLimits';

describe('getUsageLimits', () => {
  it('환경변수가 없으면 안전한 기본값 사용', () => {
    const limits = getUsageLimits();
    expect(limits.dailyAiTurns).toBe(20);
    expect(limits.dailyDiaryGenerations).toBe(3);
    expect(limits.maxInputChars).toBe(2000);
    expect(limits.maxDiaryChars).toBe(20000);
    expect(limits.maxPhotosPerDiary).toBe(3);
  });
});

describe('checkAiTurnAllowed', () => {
  it('한도 내에서는 허용', () => {
    expect(checkAiTurnAllowed(emptyUsage('2026-08-18'), 'hello').allowed).toBe(true);
  });

  it('일일 턴 한도 초과 시 차단', () => {
    const usage = { date: '2026-08-18', aiTurns: 20, diaryGenerations: 0 };
    const result = checkAiTurnAllowed(usage, 'hello');
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.reason).toBe('ai-turn-limit');
  });

  it('입력 글자 수 초과 시 차단', () => {
    const result = checkAiTurnAllowed(emptyUsage('2026-08-18'), 'a'.repeat(2001));
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.reason).toBe('input-too-long');
  });
});

describe('checkDiaryGenerationAllowed', () => {
  it('일기 생성 한도 초과 시 차단', () => {
    const usage = { date: '2026-08-18', aiTurns: 0, diaryGenerations: 3 };
    const result = checkDiaryGenerationAllowed(usage);
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.reason).toBe('diary-generation-limit');
  });
});
