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
}

/**
 * 공유에 쓸 파일 형식.
 *
 * **.txt / text/plain 이어야 한다.** Chromium은 공유할 수 있는 파일의 확장자와 MIME을
 * 각각 허용목록으로 검사하고 둘 중 하나라도 목록에 없으면 거부하는데, `.json`과
 * `application/json`은 양쪽 목록 모두에 없다. 그래서 처음에 만든 .json 백업은
 * 안드로이드 크롬에서 **한 번도 공유된 적이 없었다** — NotAllowedError로 거부됐고,
 * 그게 "버튼을 눌러도 아무 반응이 없다"의 진짜 원인이었다.
 *
 * canShare()는 MIME을 검사하지 않고 files가 비었는지만 본다. 즉 canShare가 true라고
 * 공유가 되는 게 아니다. 그래서 안전한 형식을 우리가 직접 정해서 쓴다.
 */
const SHARE_MIME = 'text/plain';

/** 파일 하나를 만든다. 웹이 아니면 null */
function makeFile(text: string, fileName: string, mimeType: string): File | null {
  if (Platform.OS !== 'web' || typeof File === 'undefined') return null;
  return new File([text], fileName, { type: mimeType });
}

/**
 * 아이폰 홈 화면 앱인지.
 *
 * 여기서는 a[download]를 절대 쓰면 안 된다. 다운로드를 걸면 "Open in …" 시스템 화면에
 * 갇혀서 앱을 강제 종료해야만 빠져나온다(WebKit 버그). 공유가 실패하면 다운로드로 내려가는
 * 게 보통이지만, 이 조합에서만은 내려가는 것이 더 나쁘다.
 */
function isIosStandalone(): boolean {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined' || typeof window === 'undefined') {
    return false;
  }
  const ua = navigator.userAgent ?? '';
  const isApple =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && (navigator.maxTouchPoints ?? 0) > 1);
  if (!isApple) return false;
  // 아이폰 설치형 웹앱은 display-mode가 standalone이 아니라 fullscreen으로 잡히는 경우가 있어 둘 다 본다
  const standalone =
    (navigator as { standalone?: boolean }).standalone === true ||
    window.matchMedia?.('(display-mode: standalone), (display-mode: fullscreen)').matches === true;
  return standalone;
}

/**
 * 공유 시트로 넘긴다.
 *
 * **비동기 작업을 먼저 하면 안 된다.** navigator.share는 사용자 제스처 안에서 불려야 하는데,
 * 앞에서 await를 하면 제스처가 끊겨서 iOS가 거부한다. 그래서 파일 만들기까지는 전부 동기로
 * 끝내고 share를 첫 await로 둔다.
 */
function trySharePlan(text: string, fileName: string): (() => Promise<ExportOutcome>) | null {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined') return null;
  const share = navigator.share?.bind(navigator);
  const canShare = navigator.canShare?.bind(navigator);
  if (!share || !canShare) return null;

  const file = makeFile(text, fileName, SHARE_MIME);
  if (!file) return null;
  try {
    if (!canShare({ files: [file] })) return null;
  } catch {
    return null;
  }

  return async () => {
    try {
      // files 외에 title/text/url을 함께 넘기지 않는다. 아이폰 공유 시트가 title을 별도
      // 항목으로 끼워 넣으면서 파일 대상이 깨지는 경우가 있고, 얻는 것은 거의 없다.
      await share({ files: [file] });
      return { ok: true, via: 'share' };
    } catch (error) {
      const name = error instanceof Error ? error.name : '알 수 없음';
      /*
       * **AbortError만 취소다.**
       *
       * 처음에는 NotAllowedError도 취소로 묶었는데, 그건 완전히 다른 뜻이다 — 사용자 제스처가
       * 유효하지 않거나 권한이 없어서 공유 시트를 **열지도 못한** 상태다. 이걸 취소로 처리하면
       * 조용히 넘어가면서 다운로드 대안으로도 안 내려가서, 버튼을 눌러도 아무 일도 일어나지
       * 않는다. 실제로 그 증상이 보고됐다.
       */
      if (name === 'AbortError') return { ok: false, reason: 'cancelled' };
      return { ok: false, reason: 'failed', message: name };
    }
  };
}

/** 파일로 내려받는다 (공유가 안 되는 환경의 대안) */
function tryDownload(text: string, fileName: string): ExportOutcome {
  if (Platform.OS !== 'web' || typeof document === 'undefined' || typeof URL?.createObjectURL !== 'function') {
    return { ok: false, reason: 'unsupported' };
  }
  try {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
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
export async function exportBackupFile({ text, fileName }: ExportInput): Promise<ExportOutcome> {
  const sharePlan = trySharePlan(text, fileName);
  if (sharePlan) {
    const result = await sharePlan();
    // 사용자가 직접 닫은 것만 그대로 알린다. 다운로드로 몰래 넘어가면 원치 않은 파일을 받게 된다.
    if (result.ok || result.reason === 'cancelled') return result;
    // 그 밖의 실패는 전부 다운로드로 내려간다 — 여기서 멈추면 버튼이 죽은 것처럼 보인다.
  }

  // 아이폰 홈 화면 앱에서는 다운로드가 앱을 빠져나가지 못하게 만든다 — 시도조차 하지 않는다
  if (isIosStandalone()) return { ok: false, reason: 'unsupported' };

  // 공유도 다운로드도 안 되는 기기가 있다. 그럴 땐 그렇다고 말해야 클립보드로라도 저장한다.
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
  if (shareSupport === null) shareSupport = trySharePlan('{}', 'probe.txt') !== null;
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
 *
 * 확장자가 .json이 아니라 .txt인 이유는 SHARE_MIME 설명 참고 — 크롬이 .json 공유를 거부한다.
 * 내용은 그대로 JSON이고, 가져오기는 확장자가 아니라 내용을 보고 판별한다.
 */
export function backupFileName(now: Date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  return `D-log-backup-${stamp}.txt`;
}
