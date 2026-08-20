import { backupFileName } from '../exportFile';

describe('백업 파일 이름', () => {
  it('날짜가 들어가서 목록에서 알아볼 수 있다', () => {
    expect(backupFileName(new Date(2026, 7, 20))).toBe('D-log-backup-2026-08-20.json');
  });

  it('한 자리 월·일에 0을 채운다 (파일 목록에서 날짜순 정렬이 깨지지 않게)', () => {
    expect(backupFileName(new Date(2026, 0, 5))).toBe('D-log-backup-2026-01-05.json');
  });

  it('.json 확장자를 붙인다 — 가져오기에서 파일을 찾을 때 기준이 된다', () => {
    expect(backupFileName()).toMatch(/\.json$/);
  });

  it('ASCII만 쓴다', () => {
    // 한글이 들어가면 크롬이 a[download]를 무시하고 확장자 없는 'download'로 저장한다.
    // 실제로 겪은 문제라서 여기서 막는다.
    expect(backupFileName(new Date(2026, 7, 20))).toMatch(/^[\x20-\x7E]+$/);
  });

  it('파일 이름이 D-log로 시작한다 (파일 앱에서 이름순으로 모이도록)', () => {
    expect(backupFileName()).toMatch(/^D-log-backup-/);
  });
});
