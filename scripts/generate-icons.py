#!/usr/bin/env python3
"""D-log 앱 아이콘 생성기.

아이콘을 이미지 파일이 아니라 코드로 관리한다. 색이나 형태를 바꾸고 싶으면 이 파일만
고치고 다시 돌리면 모든 크기·플랫폼용 파일이 한 번에 다시 만들어진다.

    python3 scripts/generate-icons.py

디자인: 편지 + 펜촉 — "말한 하루가 한 통의 편지가 된다"
색: 앱 테마 토큰(src/theme/tokens.ts)의 연보라 + 크림에서 가져온다.

외부 서비스나 유료 폰트를 쓰지 않는다 (Pillow만 사용).
"""

import math
import os

from PIL import Image, ImageDraw

# --- 색 (src/theme/tokens.ts와 맞춘다) -------------------------------------
PURPLE_TOP = (126, 106, 171)     # #7E6AAB
PURPLE_BOTTOM = (87, 66, 124)    # #57427C
PURPLE_DEEP = (78, 59, 113)      # #4E3B71 — 펜촉
CREAM = (255, 249, 245)          # #FFF9F5 — 편지
FLAP = (228, 216, 242)           # #E4D8F2 — 편지 덮개

# 실제로 그리는 배율. 크게 그린 뒤 줄여서 계단 현상을 없앤다.
SUPERSAMPLE = 4

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _lerp(a, b, t):
    return tuple(round(x + (y - x) * t) for x, y in zip(a, b))


def gradient(size):
    """세로 그라데이션 배경."""
    image = Image.new('RGB', (size, size))
    draw = ImageDraw.Draw(image)
    for y in range(size):
        draw.line([(0, y), (size, y)], fill=_lerp(PURPLE_TOP, PURPLE_BOTTOM, y / max(size - 1, 1)))
    return image


def _rotate(point, origin, radians):
    px, py = point[0] - origin[0], point[1] - origin[1]
    cos, sin = math.cos(radians), math.sin(radians)
    return (origin[0] + px * cos - py * sin, origin[1] + px * sin + py * cos)


def draw_artwork(draw, box, mono=False):
    """편지 + 펜촉을 그린다. box는 (left, top, size) — 정사각 영역."""
    left, top, size = box
    u = size / 1000.0  # 1000 기준 좌표를 실제 크기로

    def pt(x, y):
        return (left + x * u, top + y * u)

    # 단색 아이콘은 흰 실루엣 하나뿐이라, 색으로 나누던 부분을 전부 '파내기'로 바꾼다
    # (그러지 않으면 편지와 펜촉이 한 덩어리 흰 얼룩으로 뭉친다)
    cut = (0, 0, 0, 0)
    letter = CREAM if not mono else (255, 255, 255, 255)
    flap = FLAP if not mono else cut
    nib = PURPLE_DEEP if not mono else (255, 255, 255, 255)
    halo = CREAM if not mono else cut
    line = PURPLE_DEEP if not mono else cut
    detail = letter if not mono else cut

    # --- 편지 ---------------------------------------------------------------
    draw.rounded_rectangle([pt(60, 300), pt(660, 760)], radius=40 * u, fill=letter)

    # 덮개: 위 양쪽 모서리에서 가운데 아래로 내려오는 V
    if not mono:
        draw.polygon([pt(60, 312), pt(360, 556), pt(660, 312)], fill=flap)
    draw.line([pt(62, 306), pt(360, 550), pt(658, 306)], fill=line, width=int(26 * u), joint='curve')

    # --- 펜촉 ---------------------------------------------------------------
    # 오른쪽 위에서 내려와 편지의 오른쪽 아래를 가로지른다
    base = pt(866, 244)
    tip = pt(612, 636)
    axis = (tip[0] - base[0], tip[1] - base[1])
    length = math.hypot(*axis)
    d = (axis[0] / length, axis[1] / length)
    perp = (-d[1], d[0])
    half_w = 76 * u
    shoulder = 0.56 * length

    def along(distance, offset=0.0):
        return (
            base[0] + d[0] * distance + perp[0] * offset,
            base[1] + d[1] * distance + perp[1] * offset,
        )

    nib_shape = [
        along(0, half_w),
        along(shoulder, half_w),
        tip,
        along(shoulder, -half_w),
        along(0, -half_w),
    ]

    # 테두리를 먼저 깔아 편지 위에서도 펜촉이 분리돼 보이게 한다
    draw.line(nib_shape + [nib_shape[0]], fill=halo, width=int(46 * u), joint='curve')
    draw.ellipse(
        [base[0] - half_w, base[1] - half_w, base[0] + half_w, base[1] + half_w],
        fill=halo,
        outline=halo,
        width=int(23 * u),
    )
    draw.polygon(nib_shape, fill=nib)
    draw.ellipse(
        [base[0] - half_w, base[1] - half_w, base[0] + half_w, base[1] + half_w],
        fill=nib,
    )

    # 숨구멍과 갈라진 틈 — 배경색이 아니라 크림으로 그려 어디서든 또렷하다
    vent = along(0.44 * length)
    hole = 40 * u
    draw.ellipse([vent[0] - hole, vent[1] - hole, vent[0] + hole, vent[1] + hole], fill=detail)
    slit = 13 * u
    draw.polygon(
        [
            along(0.44 * length, slit),
            along(0.99 * length, slit * 0.15),
            along(0.99 * length, -slit * 0.15),
            along(0.44 * length, -slit),
        ],
        fill=detail,
    )


def artwork_layer(size, mono=False):
    """그림만 있는 투명 레이어를 만들어 실제 내용에 딱 맞게 잘라 준다.

    좌표를 손으로 맞추다 보면 여백이 한쪽으로 쏠리기 쉬워서, 그린 뒤 실제 픽셀 경계로
    잘라내 중앙에 놓는다.
    """
    layer = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    draw_artwork(draw, (0, 0, size), mono=mono)
    bbox = layer.getbbox()
    return layer.crop(bbox) if bbox else layer


def render(size, *, background=True, scale=0.72, mono=False, rounded=False):
    """아이콘 한 장을 만든다.

    rounded=True면 모서리를 직접 깎는다. 스플래시처럼 OS가 마스크를 씌워 주지 않는
    자리에서 각진 사각형이 그대로 보이는 것을 막는다.
    """
    big = size * SUPERSAMPLE
    if background and not mono:
        image = gradient(big).convert('RGBA')
    else:
        image = Image.new('RGBA', (big, big), (0, 0, 0, 0))

    art = artwork_layer(big, mono=mono)
    target = big * scale
    ratio = min(target / art.width, target / art.height)
    art = art.resize((max(1, round(art.width * ratio)), max(1, round(art.height * ratio))), Image.LANCZOS)
    image.alpha_composite(art, ((big - art.width) // 2, (big - art.height) // 2))

    if rounded:
        mask = Image.new('L', (big, big), 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, big - 1, big - 1], radius=big * 0.22, fill=255)
        image.putalpha(mask)

    return image.resize((size, size), Image.LANCZOS)


def save(image, *path_parts):
    target = os.path.join(ROOT, *path_parts)
    os.makedirs(os.path.dirname(target), exist_ok=True)
    image.save(target)
    print(f'  {os.path.relpath(target, ROOT)}  ({image.width}×{image.height})')


def main():
    print('D-log 아이콘 생성')

    # 앱 아이콘 (iOS / 일반) — OS가 모서리를 깎으므로 꽉 채운다
    save(render(1024), 'assets', 'images', 'icon.png')
    save(render(512, rounded=True), 'assets', 'images', 'splash-icon.png')
    save(render(256), 'assets', 'images', 'favicon.png')

    # Android 적응형 아이콘 — 앞면은 안전 영역(66%) 안에, 뒷면은 배경만
    save(render(1024, background=False, scale=0.66), 'assets', 'images', 'android-icon-foreground.png')
    save(gradient(1024).convert('RGBA'), 'assets', 'images', 'android-icon-background.png')
    save(render(1024, background=False, scale=0.66, mono=True), 'assets', 'images', 'android-icon-monochrome.png')

    # PWA (public/icons — 빌드 시 dist로 복사된다)
    for px in (180, 192, 512):
        save(render(px), 'public', 'icons', f'icon-{px}.png')

    print('완료 — app.json / manifest.json의 색과 함께 확인하세요.')


if __name__ == '__main__':
    main()
