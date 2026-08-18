import { Platform } from 'react-native';

import { appConfig } from '@/config/appConfig';

/**
 * 앱 내 업데이트 확인.
 *
 * - 배포된 사이트의 version.json(빌드 시 생성)을 읽어 현재 버전과 비교한다.
 * - Web/PWA: 서비스 워커 갱신 + 새로고침으로 재설치 없이 즉시 업데이트된다.
 * - Android APK: version.json의 apkUrl이 있으면 다운로드 안내로 연결된다.
 */

export interface UpdateInfo {
  version: string;
  noteKo?: string;
  apkUrl?: string | null;
}

export interface UpdateCheckResult {
  status: 'update-available' | 'up-to-date' | 'unreachable';
  current: string;
  latest?: UpdateInfo;
}

/** "1.2.3" 형식 비교: a > b → 1, a < b → -1, 같으면 0 */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
}

function versionJsonUrl(): string {
  // Web에서는 같은 사이트의 version.json을 상대 경로로 읽는다 (배포 주소와 무관하게 동작)
  if (Platform.OS === 'web') return `version.json?cb=${Date.now()}`;
  const base = process.env.EXPO_PUBLIC_UPDATE_URL ?? appConfig.defaultUpdateUrl;
  return `${base.replace(/\/$/, '')}/version.json?cb=${Date.now()}`;
}

export async function checkForUpdate(): Promise<UpdateCheckResult> {
  const current = appConfig.version;
  try {
    const res = await fetch(versionJsonUrl(), { cache: 'no-store' });
    if (!res.ok) return { status: 'unreachable', current };
    const info = (await res.json()) as UpdateInfo;
    if (typeof info.version !== 'string') return { status: 'unreachable', current };
    if (compareVersions(info.version, current) > 0) {
      return { status: 'update-available', current, latest: info };
    }
    return { status: 'up-to-date', current, latest: info };
  } catch {
    return { status: 'unreachable', current };
  }
}

/**
 * Web/PWA: 대기 중인 새 서비스 워커로 전환하고 새로고침한다.
 * 재설치 없이 새 버전이 적용된다.
 */
export async function applyWebUpdate(): Promise<void> {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined') return;
  try {
    const sw = (navigator as Navigator & { serviceWorker?: ServiceWorkerContainer }).serviceWorker;
    const reg = await sw?.getRegistration();
    if (reg) {
      await reg.update();
      if (reg.waiting) {
        // 새 SW가 대기 중이면 즉시 활성화 → controllerchange 후 새로고침
        const reloadOnce = () => {
          sw?.removeEventListener('controllerchange', reloadOnce);
          window.location.reload();
        };
        sw?.addEventListener('controllerchange', reloadOnce);
        reg.waiting.postMessage('SKIP_WAITING');
        // 안전장치: 3초 내 전환이 없으면 그냥 새로고침
        setTimeout(() => window.location.reload(), 3000);
        return;
      }
    }
  } catch {
    // 무시하고 새로고침으로 진행
  }
  window.location.reload();
}
