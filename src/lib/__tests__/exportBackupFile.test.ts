/**
 * @jest-environment jsdom
 */
import { TextDecoder, TextEncoder } from 'util';

// jsdom에 없는 것들을 채운다 (File 생성과 Blob이 이걸 쓴다)
Object.assign(globalThis, { TextEncoder, TextDecoder });

// 이 모듈은 웹에서만 동작한다. jest-expo의 기본 환경은 네이티브라서 웹인 척 해 줘야
// 실제로 브라우저에서 도는 코드 경로를 검사할 수 있다.
jest.mock('react-native', () => ({
  Platform: { OS: 'web', select: (options: Record<string, unknown>) => options.web ?? options.default },
}));

import { exportBackupFile } from '../exportFile';

/**
 * 실제로 보고된 증상: "백업 파일 내보내기를 눌러도 아무 반응이 없다".
 *
 * 원인은 navigator.share가 던지는 NotAllowedError를 "사용자가 취소함"으로 분류한 것이었다.
 * 취소로 보면 아무 메시지도 안 뜨고 다운로드 대안으로도 안 내려가서 버튼이 죽은 것처럼 보인다.
 * AbortError(사용자가 시트를 닫음)와 그 외 실패는 완전히 다르게 다뤄야 한다.
 */

type ShareFn = (data: { files?: File[]; title?: string }) => Promise<void>;

function stubNavigator(options: {
  canShare?: boolean;
  share?: ShareFn;
}): void {
  Object.assign(navigator, {
    canShare: options.canShare === undefined ? undefined : () => options.canShare,
    share: options.share,
  });
}

function stubDownload(works: boolean): { clicked: string[] } {
  const clicked: string[] = [];
  const url = globalThis.URL as unknown as Record<string, unknown>;
  url.revokeObjectURL = () => undefined;
  url.createObjectURL = works
    ? () => 'blob:fake'
    : () => {
        throw new Error('nope');
      };

  const realCreate = document.createElement.bind(document);
  jest
    .spyOn(document, 'createElement')
    .mockImplementation(((tag: string) => {
      const element = realCreate(tag);
      if (tag === 'a') {
        (element as HTMLAnchorElement).click = () => clicked.push((element as HTMLAnchorElement).download);
      }
      return element;
    }) as typeof document.createElement);
  return { clicked };
}

const input = { text: '{"a":1}', fileName: 'D-log-backup-2026-08-20.txt' };

afterEach(() => {
  jest.restoreAllMocks();
  Object.assign(navigator, { canShare: undefined, share: undefined });
});

describe('백업 파일 내보내기', () => {
  it('공유가 되면 공유로 보낸다', async () => {
    const shared: { name?: string; type?: string }[] = [];
    stubNavigator({
      canShare: true,
      share: async (data) => {
        shared.push({ name: data.files?.[0].name, type: data.files?.[0].type });
      },
    });
    await expect(exportBackupFile(input)).resolves.toEqual({ ok: true, via: 'share' });
    expect(shared[0].name).toBe('D-log-backup-2026-08-20.txt');
    // 크롬 허용목록에 있는 형식이어야 공유가 거부되지 않는다
    expect(shared[0].type).toBe('text/plain');
  });

  it('사용자가 공유 시트를 닫으면(AbortError) 취소로 두고 다운로드하지 않는다', async () => {
    const { clicked } = stubDownload(true);
    stubNavigator({
      canShare: true,
      share: async () => {
        const error = new Error('user aborted');
        error.name = 'AbortError';
        throw error;
      },
    });
    await expect(exportBackupFile(input)).resolves.toEqual({ ok: false, reason: 'cancelled' });
    // 원치 않는 파일이 저장되면 안 된다
    expect(clicked).toEqual([]);
  });

  it('공유를 열지 못하면(NotAllowedError) 취소로 삼키지 않고 다운로드로 내려간다', async () => {
    const { clicked } = stubDownload(true);
    stubNavigator({
      canShare: true,
      share: async () => {
        const error = new Error('no user activation');
        error.name = 'NotAllowedError';
        throw error;
      },
    });
    await expect(exportBackupFile(input)).resolves.toEqual({ ok: true, via: 'download' });
    expect(clicked).toEqual(['D-log-backup-2026-08-20.txt']);
  });

  it('알 수 없는 오류에도 다운로드로 내려간다', async () => {
    const { clicked } = stubDownload(true);
    stubNavigator({
      canShare: true,
      share: async () => {
        throw new Error('boom');
      },
    });
    await expect(exportBackupFile(input)).resolves.toEqual({ ok: true, via: 'download' });
    expect(clicked).toHaveLength(1);
  });

  it('공유 기능이 아예 없으면 바로 다운로드한다', async () => {
    const { clicked } = stubDownload(true);
    stubNavigator({});
    await expect(exportBackupFile(input)).resolves.toEqual({ ok: true, via: 'download' });
    expect(clicked).toHaveLength(1);
  });

  it('둘 다 안 되면 실패를 숨기지 않는다 (화면이 안내할 수 있도록)', async () => {
    stubDownload(false);
    stubNavigator({});
    const result = await exportBackupFile(input);
    expect(result.ok).toBe(false);
    expect(result).not.toEqual({ ok: false, reason: 'cancelled' });
  });
});
