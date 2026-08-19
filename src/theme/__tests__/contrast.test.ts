import { palette } from '../tokens';

/**
 * 색 대비 회귀 테스트 (WCAG AA).
 *
 * 노랑은 밝아서 밝은 배경 위 글자로 쓰면 대비가 2:1대까지 떨어진다. 그래서 이 앱은
 * "칠하는 노랑(primary)"과 "쓰는 노랑(primaryInk)"을 나눠 쓰는데, 나중에 누가 색을
 * 손볼 때 이 구분이 무너지면 글자가 안 보이게 된다. 그 순간을 여기서 잡는다.
 *
 * 기준: 본문 글자 4.5:1, UI 요소(테두리·포커스링) 3:1
 */

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

const SURFACES = [
  'background',
  'surface',
  'surfaceSoft',
  'surfaceRaised',
  'inputBackground',
  'diaryPaper',
  'primarySoft',
  'selectedBackground',
  'pressedBackground',
] as const;

const TEXT_ON_SURFACE = ['textPrimary', 'textSecondary'] as const;

const INK_SURFACES = ['background', 'surface', 'surfaceRaised', 'primarySoft'] as const;

describe.each(['light', 'dark'] as const)('%s 테마 대비', (scheme) => {
  const colors = palette[scheme];

  describe.each(SURFACES)('%s 위 본문 글자', (surface) => {
    it.each(TEXT_ON_SURFACE)('%s', (token) => {
      expect({ token, ratio: contrast(colors[token], colors[surface]) >= 4.5 }).toEqual({
        token,
        ratio: true,
      });
    });
  });

  it.each(INK_SURFACES)('primaryInk는 %s 위에서 글자로 읽힌다', (surface) => {
    expect(contrast(colors.primaryInk, colors[surface])).toBeGreaterThanOrEqual(4.5);
  });

  it('채움색 위 글자(onPrimary/primary)', () => {
    expect(contrast(colors.onPrimary, colors.primary)).toBeGreaterThanOrEqual(4.5);
  });

  it('위험 버튼 위 글자(onError/error)', () => {
    // onPrimary를 재사용하면 어두운 글자가 어두운 빨강에 묻힌다 — 실제로 겪은 회귀다
    expect(contrast(colors.onError, colors.error)).toBeGreaterThanOrEqual(4.5);
  });

  it.each([
    ['success', 'successSoft'],
    ['warning', 'warningSoft'],
    ['error', 'errorSoft'],
    ['accentRose', 'accentRoseSoft'],
    ['accentSage', 'accentSageSoft'],
  ] as const)('%s는 %s 위에서 읽힌다', (fg, bg) => {
    expect(contrast(colors[fg], colors[bg])).toBeGreaterThanOrEqual(4.5);
    expect(contrast(colors[fg], colors.background)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(['background', 'surface'] as const)('포커스 링이 %s에서 보인다', (surface) => {
    expect(contrast(colors.focusRing, colors[surface])).toBeGreaterThanOrEqual(3);
  });

  it('선택 테두리(primaryBorder)가 배경과 구분된다', () => {
    expect(contrast(colors.primaryBorder, colors.background)).toBeGreaterThanOrEqual(3);
    expect(contrast(colors.primaryBorder, colors.surfaceSoft)).toBeGreaterThanOrEqual(3);
  });

  it('강한 테두리가 배경과 구분된다', () => {
    expect(contrast(colors.borderStrong, colors.background)).toBeGreaterThanOrEqual(3);
  });

  it('탭 활성/비활성 모두 읽힌다', () => {
    expect(contrast(colors.tabActive, colors.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(colors.tabInactive, colors.surface)).toBeGreaterThanOrEqual(4.5);
  });
});
