import fs from 'fs';
import path from 'path';

/**
 * 손글씨 폰트(Gaegu) 서브셋 커버리지 회귀 테스트.
 *
 * 용량 때문에 Gaegu는 **앱 소스에 실제로 등장하는 한글 음절만** 남긴 서브셋을 싣는다
 * (scripts/subset-hand-font.py). 그래서 새 문구를 쓰면서 서브셋에 없던 글자를 쓰면,
 * 브라우저가 그 한 글자만 SUIT로 떨어뜨려 한 단어 안에서 글씨체가 섞인다.
 * "왠지 한 글자만 이상해 보인다"는 형태라 눈으로는 놓치기 쉬워서 테스트로 잡는다.
 *
 * 실패하면:
 *   pip install fonttools brotli
 *   python3 scripts/subset-hand-font.py <Gaegu 원본 ttf 폴더>
 * 를 돌려 public/fonts/gaegu-*.woff2 와 scripts/gaegu-charset.txt 를 다시 만든다.
 */

const ROOT = path.join(__dirname, '..', '..', '..');

function collectHangul(dir: string, out: Set<string>): void {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectHangul(full, out);
      continue;
    }
    if (!/\.tsx?$/.test(entry.name)) continue;
    for (const ch of fs.readFileSync(full, 'utf8')) {
      if (ch >= '가' && ch <= '힣') out.add(ch);
    }
  }
}

describe('손글씨 폰트 서브셋', () => {
  const charset = new Set(
    fs.readFileSync(path.join(ROOT, 'scripts', 'gaegu-charset.txt'), 'utf8'),
  );

  it('앱 소스의 모든 한글이 서브셋에 들어 있다', () => {
    const used = new Set<string>();
    collectHangul(path.join(ROOT, 'src'), used);

    const missing = [...used].filter((ch) => !charset.has(ch)).sort();
    expect({ 빠진글자: missing.join(''), 개수: missing.length }).toEqual({
      빠진글자: '',
      개수: 0,
    });
  });

  it('서브셋에 숫자·영문·기본 문장부호가 들어 있다', () => {
    for (const ch of '0123456789ABCXYZabcxyz().,?!·—…%') {
      expect(charset.has(ch)).toBe(true);
    }
  });

  it('폰트 파일이 실제로 존재하고 서브셋 크기를 유지한다', () => {
    for (const name of ['gaegu-regular.woff2', 'gaegu-bold.woff2']) {
      const file = path.join(ROOT, 'public', 'fonts', name);
      expect(fs.existsSync(file)).toBe(true);
      // 원본 전체는 Regular 290KB / Bold 485KB다. 서브셋을 안 거친 파일이 들어오면 여기서 걸린다.
      expect(fs.statSync(file).size).toBeLessThan(200 * 1024);
    }
  });
});
