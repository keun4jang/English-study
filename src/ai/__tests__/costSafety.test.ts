/// <reference types="node" />
/* eslint-disable @typescript-eslint/no-require-imports -- 환경변수를 바꿔 모듈을 다시 불러와야 해서 동적 require를 쓴다 */
import fs from 'fs';
import path from 'path';

/**
 * 비용 안전장치 — 이 앱은 영구 무료(0원)여야 한다.
 *
 * 유료 경로(외부 AI API)가 실수로 기본값이 되거나 배포 파이프라인에서 켜지는 것을
 * 막는다. 이 테스트가 깨지면 "언젠가 과금되어 앱이 멈추는" 상태로 바뀐 것이다.
 */

const ENV_KEYS = [
  'EXPO_PUBLIC_AI_ENABLED',
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_ANON_KEY',
] as const;

function withEnv(overrides: Partial<Record<(typeof ENV_KEYS)[number], string>>, fn: () => void) {
  const saved: Record<string, string | undefined> = {};
  for (const key of ENV_KEYS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
  Object.assign(process.env, overrides);
  try {
    jest.resetModules();
    fn();
  } finally {
    for (const key of ENV_KEYS) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
    jest.resetModules();
  }
}

describe('비용 안전장치', () => {
  it('기본 상태에서는 외부 AI가 꺼져 있다', () => {
    withEnv({}, () => {
      const { isRemoteAiEnabled } = require('@/config/appConfig');
      expect(isRemoteAiEnabled()).toBe(false);
    });
  });

  it('기본 상태에서는 내장 AI가 선택된다', () => {
    withEnv({}, () => {
      const { getAIProvider } = require('../index');
      expect(getAIProvider().name).toBe('builtin');
    });
  });

  it('플래그만 켜도 Supabase 구성이 없으면 유료 경로로 가지 않는다', () => {
    withEnv({ EXPO_PUBLIC_AI_ENABLED: 'true' }, () => {
      const { isRemoteAiEnabled } = require('@/config/appConfig');
      expect(isRemoteAiEnabled()).toBe(false);
    });
  });

  it('Supabase만 구성해도 플래그 없이는 유료 경로로 가지 않는다', () => {
    withEnv(
      {
        EXPO_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
        EXPO_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
      },
      () => {
        const { isRemoteAiEnabled } = require('@/config/appConfig');
        expect(isRemoteAiEnabled()).toBe(false);
      },
    );
  });

  it("플래그가 'true' 문자열이 아니면 켜지지 않는다", () => {
    withEnv(
      {
        EXPO_PUBLIC_AI_ENABLED: '1',
        EXPO_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
        EXPO_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
      },
      () => {
        const { isRemoteAiEnabled } = require('@/config/appConfig');
        expect(isRemoteAiEnabled()).toBe(false);
      },
    );
  });

  it('배포 워크플로가 유료 AI 환경변수를 설정하지 않는다', () => {
    const dir = path.join(process.cwd(), '.github', 'workflows');
    const files = fs.readdirSync(dir).filter((f: string) => f.endsWith('.yml') || f.endsWith('.yaml'));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const yaml = fs.readFileSync(path.join(dir, file), 'utf8');
      expect(yaml).not.toMatch(/EXPO_PUBLIC_AI_ENABLED\s*:/);
      expect(yaml).not.toMatch(/ANTHROPIC_API_KEY/);
    }
  });

  it('클라이언트 코드에 Anthropic API 키가 들어가지 않는다', () => {
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, item.name);
        if (item.isDirectory()) walk(full);
        else if (/\.(ts|tsx)$/.test(item.name)) files.push(full);
      }
    };
    walk(path.join(process.cwd(), 'src'));
    for (const file of files) {
      const code = fs.readFileSync(file, 'utf8');
      // 실제 키 형태(sk-ant-...)가 소스에 있으면 안 된다
      expect(code).not.toMatch(/sk-ant-[A-Za-z0-9_-]{10,}/);
      // 클라이언트에서 Anthropic으로 직접 호출하면 안 된다
      expect(code).not.toMatch(/https:\/\/api\.anthropic\.com/);
    }
  });
});
