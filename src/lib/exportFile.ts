import { Platform } from 'react-native';

/**
 * 백업 파일을 기기 밖으로 내보낸다.
 *
 * 구글 드라이브 연동을 직접 만들지 않는다. 그러려면 OAuth 클라이언트와 구글 클라우드
 * 프로젝트가 필요하고, 그건 "새 API 키를 만들지 않는다 / 나중에 비용이 생길 구조를 만들지
 * 않는다"는 이 앱의 규칙과 정면으로 부딪힌다. 무엇보다 그렇게 만들면 드라이브 하나만 된다.
 *
 * 대신 **폰이 이미 가진 공유 기능에 파일을 넘긴다.** 공유 시트에는 드라이브도, Gmail도,
 * 카카오톡도, 파일 앱도 이미 들어 있다. 우리는 파일 하나만 잘 만들면 된다.
 */

export type ExportOutcome =
  | { ok: true; via: 'share' | 'download' }
  /** 사용자가 공유 시트를 그냥 닫았다 — 실패가 아니다 */
  | { ok: false; reason: 'cancelled' }
  | { ok: false; reason: 'unsupported' }
  | { ok: false; reason: 'failed'; message: string };

interface ExportInput {
  text: string;
  fileName: string;
  /** 공유 시트에 보일 제목 */
  title: string;
}

/** 파일 하나를 만든다. 웹이 아니면 null */
function makeFile(text: string, fileName: string, mimeType: string): File | null {
  if (Platform.OS !== 'web' || typeof File === 'undefined') return null;
  return new File([text], fileName, { type: mimeType });
}

/**
 * 공유 시트로 넘긴다.
 *
 * **비동기 작업을 먼저 하면 안 된다.** navigator.share는 사용자 제스처 안에서 불려야 하는데,
 * 앞에서 await를 하면 제스처가 끊겨서 iOS가 거부한다. 그래서 파일 만들기까지는 전부 동기로
 * 끝내고 share를 첫 await로 둔다.
 */
function trySharePlan(text: string, fileName: string, title: string): (() => Promise<ExportOutcome>) | null {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined') return null;
  const share = navigator.share?.bind(navigator);
  const canShare = navigator.canShare?.bind(navigator);
  if (!share || !canShare) return null;

  // JSON을 못 받는 기기가 있어서 text/plain으로도 시도해 본다.
  // 확장자는 그대로 .json으로 둔다 — 받는 쪽(드라이브·메일)은 확장자를 보고, 우리 가져오기도
  // 확장자로 찾기 쉬워진다.
  const candidates = [
    makeFile(text, fileName, 'application/json'),
    makeFile(text, fileName, 'text/plain'),
  ].filter((file): file is File => file !== null);

  const file = candidates.find((candidate) => {
    try {
      return canShare({ files: [candidate] });
    } catch {
      return false;
    }
  });
  if (!file) return null;

  return async () => {
    try {
      await share({ files: [file], title });
      return { ok: true, via: 'share' };
    } catch (error) {
      // 공유 시트를 닫은 것은 실패가 아니다. 에러처럼 보여주면 사용자가 뭔가 잘못한 줄 안다.
      if (error instanceof Error && (error.name === 'AbortError' || error.name === 'NotAllowedError')) {
        return { ok: false, reason: 'cancelled' };
      }
      return { ok: false, reason: 'failed', message: error instanceof Error ? error.message : '알 수 없는 오류' };
    }
  };
}

/** 파일로 내려받는다 (공유가 안 되는 환경의 대안) */
function tryDownload(text: string, fileName: string): ExportOutcome {
  if (Platform.OS !== 'web' || typeof document === 'undefined' || typeof URL?.createObjectURL !== 'function') {
    return { ok: false, reason: 'unsupported' };
  }
  try {
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    // 화면에 붙이지 않으면 일부 브라우저가 클릭을 무시한다
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    // 바로 revoke하면 다운로드가 시작되기 전에 URL이 사라지는 기기가 있다
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return { ok: true, via: 'download' };
  } catch (error) {
    return { ok: false, reason: 'failed', message: error instanceof Error ? error.message : '알 수 없는 오류' };
  }
}

/**
 * 공유 → 다운로드 순으로 시도한다.
 *
 * 공유가 우선인 이유: 다운로드는 파일을 '다운로드 폴더'에 떨어뜨릴 뿐이고, 그걸 드라이브에
 * 올리거나 메일에 붙이는 건 사용자가 따로 해야 한다. 공유 시트는 그 자리에서 끝난다.
 */
export async function exportBackupFile({ text, fileName, title }: ExportInput): Promise<ExportOutcome> {
  const sharePlan = trySharePlan(text, fileName, title);
  if (sharePlan) {
    const result = await sharePlan();
    // 취소는 그대로 알린다. 다운로드로 몰래 넘어가면 사용자가 원치 않은 파일을 받게 된다.
    if (result.ok || result.reason === 'cancelled') return result;
  }
  return tryDownload(text, fileName);
}

/**
 * 이 기기에서 공유 시트를 쓸 수 있는지 (버튼 문구를 정하는 데 쓴다).
 *
 * 기기 능력이라 앱이 도는 동안 바뀌지 않는다. 렌더마다 File을 새로 만들 이유가 없어서
 * 한 번만 재고 기억해 둔다.
 */
let shareSupport: boolean | null = null;

export function canShareFiles(): boolean {
  if (shareSupport === null) shareSupport = trySharePlan('{}', 'probe.json', 'probe') !== null;
  return shareSupport;
}

/**
 * 백업 파일 이름.
 *
 * **ASCII만 쓴다.** 한글을 넣으면 크롬이 a[download] 속성을 통째로 무시하고 확장자도 없는
 * `download`라는 이름으로 저장한다. 나중에 파일 목록에서 찾을 수도, 가져오기에서 알아볼 수도
 * 없게 된다. 직접 확인한 동작이다 — "D-log-백업-2026-08-20.json"은 "download"가 됐고,
 * "D-log-backup-2026-08-20.json"은 그대로 나왔다.
 *
 * 날짜를 앞이 아니라 뒤에 두는 이유는 파일 앱에서 이름순 정렬을 하면 D-log 백업끼리 모이고
 * 그 안에서 날짜순이 되기 때문이다.
 */
export function backupFileName(now: Date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  return `D-log-backup-${stamp}.json`;
}
