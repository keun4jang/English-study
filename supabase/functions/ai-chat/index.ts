// Mellow Diary — AI Edge Function (Deno / Supabase Edge Functions)
//
// 역할:
// - Anthropic API 키를 서버에만 보관하고 클라이언트 요청을 대리 호출한다.
// - 사용자 인증(Supabase JWT), 사용량 제한, idempotency, 입력 길이 제한을 서버에서 재검증한다.
// - 응답은 구조화 JSON으로 반환하며 클라이언트 Zod 스키마와 동일한 형태를 지킨다.
//
// 배포:
//   supabase functions deploy ai-chat
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...  (클라이언트에 절대 노출 금지)
//
// 환경변수 (Edge Function Secrets):
//   ANTHROPIC_API_KEY        — 필수 (없으면 503으로 명확히 실패)
//   AI_ENABLED               — 'true'일 때만 동작 (비용 안전장치)
//   DAILY_AI_TURN_LIMIT      — 기본 20
//   DAILY_DIARY_GENERATION_LIMIT — 기본 3
//   MAX_AI_INPUT_CHARACTERS  — 기본 2000
//   MAX_AI_OUTPUT_TOKENS     — 기본 1024
//   AI_MODEL                 — 기본 'claude-haiku-4-5-20251001' (비용 절약형)

import { createClient } from 'npm:@supabase/supabase-js@2';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';
const AI_ENABLED = Deno.env.get('AI_ENABLED') === 'true';
const DAILY_AI_TURN_LIMIT = Number(Deno.env.get('DAILY_AI_TURN_LIMIT') ?? 20);
const DAILY_DIARY_GENERATION_LIMIT = Number(Deno.env.get('DAILY_DIARY_GENERATION_LIMIT') ?? 3);
const MAX_INPUT_CHARS = Number(Deno.env.get('MAX_AI_INPUT_CHARACTERS') ?? 2000);
const MAX_OUTPUT_TOKENS = Number(Deno.env.get('MAX_AI_OUTPUT_TOKENS') ?? 1024);
const AI_MODEL = Deno.env.get('AI_MODEL') ?? 'claude-haiku-4-5-20251001';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

function buildSystemPrompt(language: string, level: string, intensity: string): string {
  const langName = language === 'ja' ? 'Japanese' : 'English';
  return [
    `You are a warm, empathetic diary friend helping a Korean user practice ${langName}.`,
    `User level: ${level}. Correction intensity: ${intensity}.`,
    'Rules:',
    '- Ask at most ONE follow-up question per turn, related to what the user said.',
    '- Keep replies short and friendly. Never lecture.',
    '- NEVER invent facts the user did not say. If unsure, ask or omit.',
    '- Correct mistakes kindly. severity: "correct" (no changes), "minor" (small naturalness), "major" (affects meaning).',
    '- Explanations must be in simple Korean.',
    '- If content is unsafe or sensitive, respond gently and set safety.blocked appropriately.',
    'Respond ONLY with JSON matching the provided schema. No prose outside JSON.',
  ].join('\n');
}

const TURN_SCHEMA_HINT = `{
  "detectedLanguage": "en|ja|ko|other",
  "transcript": string,
  "correction": {
    "severity": "correct|minor|major",
    "original": string, "corrected": string, "explanationKo": string,
    "changedParts": [{"from": string, "to": string, "reasonKo": string}],
    "keyExpressions": [{"expression": string, "meaningKo": string, "example": string}],
    "readingJa": string | null
  },
  "assistant": {"replyTargetLanguage": string, "replyKo": string, "followUpQuestion": string | null, "emotion": string},
  "safety": {"blocked": boolean, "reason": string | null}
}`;

const DIARY_SCHEMA_HINT = `{
  "titleCandidates": [string (max 3)],
  "simpleVersion": string, "naturalVersion": string, "translationKo": string,
  "keyExpressions": [{"expression": string, "meaningKo": string, "example": string}],
  "commonMistakes": [string], "practiceSentences": [string (max 3)], "encouragementKo": string
}`;

async function callAnthropic(system: string, userContent: string): Promise<unknown> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: AI_MODEL,
      max_tokens: MAX_OUTPUT_TOKENS,
      system,
      messages: [{ role: 'user', content: userContent }],
    }),
  });
  if (!res.ok) throw new Error(`anthropic:${res.status}`);
  const data = await res.json();
  const text: string = data?.content?.[0]?.text ?? '';
  // JSON 블록 추출 (모델이 앞뒤 여백을 붙이는 경우 대비)
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('parse-failed');
  return JSON.parse(text.slice(start, end + 1));
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method-not-allowed' }, 405);
  if (!AI_ENABLED || !ANTHROPIC_API_KEY) {
    return json({ error: 'ai-disabled' }, 503);
  }

  // --- 인증 (Supabase JWT) ---
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace('Bearer ', '');
  const { data: userData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !userData.user) return json({ error: 'unauthorized' }, 401);
  const userId = userData.user.id;

  let body: { action?: string; payload?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'bad-request' }, 400);
  }
  const action = body.action ?? '';
  const payload = body.payload ?? {};

  // --- idempotency: 동일 requestId 중복 처리 방지 ---
  const ctx = (payload.ctx ?? {}) as Record<string, unknown>;
  const requestId = typeof ctx.requestId === 'string' ? ctx.requestId : null;
  if (requestId) {
    const { error: dupError } = await supabase
      .from('ai_request_log')
      .insert({ request_id: requestId, user_id: userId, action });
    if (dupError) return json({ error: 'duplicate-request' }, 409);
  }

  // --- 사용량 제한 (서버 측 재검증) ---
  const today = new Date().toISOString().slice(0, 10);
  const { data: usage } = await supabase
    .from('usage_daily')
    .select('ai_turns, diary_generations')
    .eq('user_id', userId)
    .eq('usage_date', today)
    .maybeSingle();
  const aiTurns = usage?.ai_turns ?? 0;
  const diaryGens = usage?.diary_generations ?? 0;

  try {
    if (action === 'evaluateAndReply') {
      if (aiTurns >= DAILY_AI_TURN_LIMIT) return json({ error: 'limit-exceeded' }, 429);
      const userText = String(payload.userText ?? '').slice(0, MAX_INPUT_CHARS);
      if (!userText.trim()) return json({ error: 'empty-input' }, 400);
      const language = ctx.language === 'ja' ? 'ja' : 'en';
      const recent = Array.isArray(ctx.recentMessages) ? ctx.recentMessages.slice(-8) : [];

      const system = buildSystemPrompt(
        language,
        String(ctx.level ?? 'beginner'),
        String(ctx.intensity ?? 'balanced'),
      );
      const content = [
        `Recent conversation (JSON): ${JSON.stringify(recent)}`,
        `User's new utterance: ${JSON.stringify(userText)}`,
        `Respond with JSON only, schema: ${TURN_SCHEMA_HINT}`,
      ].join('\n');
      const result = await callAnthropic(system, content);

      await supabase.from('usage_daily').upsert({
        user_id: userId,
        usage_date: today,
        ai_turns: aiTurns + 1,
        diary_generations: diaryGens,
        estimated_input_chars: userText.length,
      });
      return json(result);
    }

    if (action === 'createFinalDiary') {
      if (diaryGens >= DAILY_DIARY_GENERATION_LIMIT) return json({ error: 'limit-exceeded' }, 429);
      const language = ctx.language === 'ja' ? 'ja' : 'en';
      const messages = Array.isArray(ctx.messages) ? ctx.messages.slice(-40) : [];
      const system = buildSystemPrompt(language, String(ctx.level ?? 'beginner'), 'balanced');
      const content = [
        `Full conversation (JSON): ${JSON.stringify(messages)}`,
        'Create the final diary. Use ONLY facts the user actually said — never invent details.',
        'Keep the user\'s tone. simpleVersion = easier vocabulary, naturalVersion = more natural/rich.',
        `Respond with JSON only, schema: ${DIARY_SCHEMA_HINT}`,
      ].join('\n');
      const result = await callAnthropic(system, content);

      await supabase.from('usage_daily').upsert({
        user_id: userId,
        usage_date: today,
        ai_turns: aiTurns,
        diary_generations: diaryGens + 1,
        estimated_input_chars: 0,
      });
      return json(result);
    }

    if (action === 'translateDiary') {
      const text = String(payload.text ?? '').slice(0, MAX_INPUT_CHARS);
      const result = await callAnthropic(
        'Translate the diary text to natural Korean. Respond with JSON only: {"translation": string}',
        text,
      );
      return json(result);
    }

    if (action === 'generateTitle') {
      const text = String(payload.text ?? '').slice(0, MAX_INPUT_CHARS);
      const result = await callAnthropic(
        'Suggest up to 3 short diary titles in the diary\'s language. JSON only: {"titles": [string]}',
        text,
      );
      return json(result);
    }

    return json({ error: 'unknown-action' }, 400);
  } catch (e) {
    // 오류 세부 정보(키/스택)는 클라이언트에 노출하지 않는다
    console.error('ai-chat error:', e instanceof Error ? e.message : 'unknown');
    return json({ error: 'ai-request-failed' }, 502);
  }
});
