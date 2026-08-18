#!/usr/bin/env node
/**
 * 간단한 부하 테스트 — **허가된 로컬/테스트 환경 전용**.
 * 프로덕션이나 제3자 서버에 실행하지 마세요.
 *
 * 사용법:
 *   node scripts/load-test.js --base http://127.0.0.1:54321 --anon <anon-key> [--n 50] [--c 5]
 *
 * 시나리오:
 *   1. 일기 목록 조회 (limit 20, 최신순 — pagination 경로)
 *   2. 일기 저장 (INSERT) — RLS로 인증 없으면 거부되는지도 확인
 *   3. 공유 목록 조회
 *   4. AI 요청 연타 → 429(rate limit) 동작 확인
 */

const args = process.argv.slice(2);
const getArg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};

const BASE = getArg('base', '');
const ANON = getArg('anon', '');
const N = Number(getArg('n', 30));
const CONCURRENCY = Number(getArg('c', 5));

if (!BASE || !ANON) {
  console.error('사용법: node scripts/load-test.js --base <url> --anon <key>');
  console.error('⚠️ 자신이 소유한 로컬/테스트 환경에만 실행하세요.');
  process.exit(1);
}
if (!/localhost|127\.0\.0\.1|\.local/.test(BASE)) {
  console.error('⚠️ 안전장치: 로컬 주소가 아닙니다. 프로덕션 대상 부하 테스트는 금지됩니다.');
  console.error('   정말 자신의 테스트 서버라면 이 검사를 코드에서 직접 수정하세요.');
  process.exit(1);
}

const headers = { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' };

async function timed(fn) {
  const start = Date.now();
  try {
    const res = await fn();
    return { ms: Date.now() - start, status: res.status };
  } catch {
    return { ms: Date.now() - start, status: 0 };
  }
}

async function runScenario(name, fn) {
  const results = [];
  let index = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (index < N) {
        index++;
        results.push(await timed(fn));
      }
    }),
  );
  const times = results.map((r) => r.ms).sort((a, b) => a - b);
  const p = (q) => times[Math.min(times.length - 1, Math.floor(times.length * q))];
  const byStatus = {};
  for (const r of results) byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
  console.log(
    `${name.padEnd(28)} n=${results.length} p50=${p(0.5)}ms p95=${p(0.95)}ms status=${JSON.stringify(byStatus)}`,
  );
}

(async () => {
  console.log(`대상: ${BASE} (요청 ${N}개 × 시나리오, 동시성 ${CONCURRENCY})\n`);

  await runScenario('일기 목록 조회', () =>
    fetch(`${BASE}/rest/v1/diary_entries?select=id,title,local_date&order=local_date.desc&limit=20`, { headers }),
  );

  await runScenario('일기 저장 (RLS 검증)', () =>
    fetch(`${BASE}/rest/v1/diary_entries`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        final_text: 'load test entry',
        local_date: new Date().toISOString().slice(0, 10),
        language_code: 'en',
      }),
    }),
  );

  await runScenario('공유 목록 조회', () =>
    fetch(`${BASE}/rest/v1/diary_shares?select=entry_id&limit=20`, { headers }),
  );

  await runScenario('AI 요청 (rate limit 확인)', () =>
    fetch(`${BASE}/functions/v1/ai-chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ action: 'evaluateAndReply', payload: { userText: 'hi', ctx: {} } }),
    }),
  );

  console.log('\n해석: 익명 키로 INSERT는 401/403(RLS 거부)이 정상입니다.');
  console.log('AI 요청은 AI_ENABLED=false면 503, 한도 초과면 429가 정상입니다.');
})();
