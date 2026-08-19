#!/usr/bin/env python3
"""
손글씨 폰트(Gaegu) 서브셋 생성.

Gaegu 전체는 woff2로 만들어도 Regular 290KB / Bold 485KB다. 손으로 쓴 느낌을 주는
'양념'용 폰트에 775KB를 쓰는 건 과하다. 그래서 **앱 소스에 실제로 등장하는 한글 음절**만
남긴다 (2026-08 기준 714자 → Regular 39KB / Bold 92KB).

중요: 이 폰트는 **고정 문구에만** 쓴다. 사용자가 입력한 닉네임·일기 본문에는 쓰지 않는다.
서브셋에 없는 글자는 브라우저가 한 글자만 SUIT로 떨어뜨려서 한 단어 안에서 글씨체가
섞여 보이기 때문이다. (그래서 src/theme/__tests__/handFontCharset.test.ts 가 소스의
한글이 전부 서브셋 안에 있는지 감시한다.)

사용법:
    pip install fonttools brotli
    # Gaegu-Regular.ttf / Gaegu-Bold.ttf 를 google/fonts에서 받아 같은 폴더에 두고
    python3 scripts/subset-hand-font.py <원본폴더>

라이선스: SIL OFL 1.1. Gaegu는 Reserved Font Name을 선언하지 않아 서브셋 후에도
패밀리명을 그대로 쓸 수 있다. (public/fonts/LICENSE-Gaegu.txt)
"""
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "fonts"

# 한글 외에 함께 남길 글자 — 숫자·영문·문장부호는 고정 문구에 섞여 나온다
EXTRA = set(chr(c) for c in range(0x20, 0x7F)) | set("·—–…‘’“”※©℃°→←↑↓♥★☆")


def app_hangul() -> set:
    chars = set()
    for path in (ROOT / "src").rglob("*"):
        if path.suffix in (".ts", ".tsx"):
            for ch in path.read_text(encoding="utf-8"):
                if "가" <= ch <= "힣":
                    chars.add(ch)
    return chars


def main() -> int:
    src_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.cwd()
    text = "".join(sorted(app_hangul() | EXTRA))
    charset = ROOT / "scripts" / "gaegu-charset.txt"
    charset.write_text(text, encoding="utf-8")

    for src_name, out_name in (("Gaegu-Regular.ttf", "gaegu-regular.woff2"),
                               ("Gaegu-Bold.ttf", "gaegu-bold.woff2")):
        src = src_dir / src_name
        if not src.exists():
            print(f"원본이 없습니다: {src}")
            return 1
        subprocess.run([
            "pyftsubset", str(src),
            f"--text-file={charset}",
            "--flavor=woff2",
            "--layout-features=*",
            "--no-hinting",
            f"--output-file={OUT / out_name}",
        ], check=True)
        print(f"{out_name}: {(OUT / out_name).stat().st_size:,} bytes")
    print(f"글자 수: {len(text)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
