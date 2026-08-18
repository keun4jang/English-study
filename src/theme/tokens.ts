/**
 * 디자인 토큰 — 모든 색상/간격/radius/타이포그래피는 여기서만 정의한다.
 * 화면 코드에서 색상을 하드코딩하지 않는다.
 */

interface Palette {
  background: string;
  surface: string;
  surfaceSoft: string;
  primary: string;
  primarySoft: string;
  accentRose: string;
  accentRoseSoft: string;
  accentSage: string;
  accentSageSoft: string;
  textPrimary: string;
  textSecondary: string;
  textOnPrimary: string;
  border: string;
  success: string;
  warning: string;
  error: string;
  overlay: string;
}

export const palette: Record<'light' | 'dark', Palette> = {
  light: {
    background: '#FFF9F5',
    surface: '#FFFFFF',
    surfaceSoft: '#FBF4EE',
    primary: '#9B8AC4',
    primarySoft: '#EEE8F7',
    accentRose: '#E9A6B0',
    accentRoseSoft: '#FBEDEF',
    accentSage: '#A8BFA3',
    accentSageSoft: '#EDF3EB',
    textPrimary: '#332F3A',
    textSecondary: '#77717D',
    textOnPrimary: '#FFFFFF',
    border: '#EFE7E0',
    success: '#6FA584',
    warning: '#D9A45B',
    error: '#C96F73',
    overlay: 'rgba(51, 47, 58, 0.4)',
  },
  dark: {
    background: '#1E1B24',
    surface: '#2A2632',
    surfaceSoft: '#332F3D',
    primary: '#B3A5D6',
    primarySoft: '#3D3650',
    accentRose: '#D8919C',
    accentRoseSoft: '#463038',
    accentSage: '#93AB8E',
    accentSageSoft: '#2F3A2E',
    textPrimary: '#F2EEF6',
    textSecondary: '#A79FB0',
    textOnPrimary: '#241F2E',
    border: '#3B3644',
    success: '#7FB694',
    warning: '#E0B171',
    error: '#D98A8E',
    overlay: 'rgba(0, 0, 0, 0.5)',
  },
};

export type ThemeColors = Palette;
export type ColorSchemeName = keyof typeof palette;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

export const typography = {
  title: { fontSize: 26, fontWeight: '700' as const, lineHeight: 34 },
  heading: { fontSize: 20, fontWeight: '700' as const, lineHeight: 28 },
  subheading: { fontSize: 17, fontWeight: '600' as const, lineHeight: 24 },
  body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 26 },
  bodySmall: { fontSize: 14, fontWeight: '400' as const, lineHeight: 21 },
  caption: { fontSize: 12, fontWeight: '400' as const, lineHeight: 17 },
} as const;

export const shadows = {
  card: {
    shadowColor: '#332F3A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
} as const;

/** 최소 터치 영역 (접근성) */
export const MIN_TOUCH_TARGET = 44;
