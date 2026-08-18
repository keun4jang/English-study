import { Platform, TextStyle } from 'react-native';

/**
 * 디자인 토큰 — 모든 색상/간격/radius/타이포그래피/그림자는 여기서만 정의한다.
 * 화면 코드에서 색상을 하드코딩하지 않는다. (single source of truth)
 *
 * 콘셉트: 종이 일기장 + 부드러운 편지지. 텍스트 대비 WCAG AA(4.5:1) 준수.
 */

interface Palette {
  background: string;
  surface: string;
  surfaceSoft: string;
  surfaceRaised: string;
  primary: string;
  primarySoft: string;
  onPrimary: string;
  accentRose: string;
  accentRoseSoft: string;
  accentSage: string;
  accentSageSoft: string;
  textPrimary: string;
  textSecondary: string;
  textInverse: string;
  border: string;
  borderStrong: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  error: string;
  errorSoft: string;
  shadow: string;
  /** 모달/시트 뒤 배경 */
  scrim: string;
  /** 입력창 배경 */
  inputBackground: string;
  /** 완성 일기 종이 배경 */
  diaryPaper: string;
  /** 일기 종이의 얇은 줄 색 */
  diaryLine: string;
  /** 탭 비활성/활성 */
  tabInactive: string;
  tabActive: string;
  /** 포커스 링 */
  focusRing: string;
  /** 선택/눌림 배경 */
  selectedBackground: string;
  pressedBackground: string;
  /** @deprecated scrim을 사용 — 하위 호환용 별칭 */
  overlay: string;
}

export const palette: Record<'light' | 'dark', Palette> = {
  light: {
    background: '#FFF9F5',
    surface: '#FFFDFC',
    surfaceSoft: '#F6EEE7',
    surfaceRaised: '#FFFFFF',
    primary: '#715A9B',
    primarySoft: '#EFE8F7',
    onPrimary: '#FFFFFF',
    accentRose: '#A95062',
    accentRoseSoft: '#F8E7EA',
    accentSage: '#4F7457',
    accentSageSoft: '#E8F0E8',
    textPrimary: '#312D36',
    textSecondary: '#665F6B',
    textInverse: '#FFFFFF',
    border: '#E4D9D1',
    borderStrong: '#9A8D98',
    success: '#35704C',
    successSoft: '#E7F2EA',
    warning: '#855C1F',
    warningSoft: '#FBF0DB',
    error: '#A14349',
    errorSoft: '#F9E7E8',
    shadow: 'rgba(69, 51, 75, 0.10)',
    scrim: 'rgba(35, 28, 39, 0.42)',
    inputBackground: '#FFFFFF',
    diaryPaper: '#FFFDF9',
    diaryLine: '#EDE3D9',
    tabInactive: '#665F6B',
    tabActive: '#715A9B',
    focusRing: '#715A9B',
    selectedBackground: '#EFE8F7',
    pressedBackground: '#F0E9E2',
    overlay: 'rgba(35, 28, 39, 0.42)',
  },
  dark: {
    background: '#1D1921',
    surface: '#28232E',
    surfaceSoft: '#332D3A',
    surfaceRaised: '#393241',
    primary: '#C6B4ED',
    primarySoft: '#403653',
    onPrimary: '#241B30',
    accentRose: '#E7A3AE',
    accentRoseSoft: '#472D35',
    accentSage: '#A9C9A9',
    accentSageSoft: '#2B3A30',
    textPrimary: '#F3EEF6',
    textSecondary: '#BDB4C3',
    textInverse: '#241B30',
    border: '#4B4352',
    borderStrong: '#766D7E',
    success: '#9BCDA8',
    successSoft: '#26392E',
    warning: '#F0C47D',
    warningSoft: '#40331F',
    error: '#F0A4A9',
    errorSoft: '#45282C',
    shadow: 'rgba(0, 0, 0, 0.34)',
    scrim: 'rgba(0, 0, 0, 0.58)',
    inputBackground: '#28232E',
    diaryPaper: '#2C2733',
    diaryLine: '#3E3746',
    tabInactive: '#BDB4C3',
    tabActive: '#C6B4ED',
    focusRing: '#C6B4ED',
    selectedBackground: '#403653',
    pressedBackground: '#332D3A',
    overlay: 'rgba(0, 0, 0, 0.58)',
  },
};

export type ThemeColors = Palette;
export type ColorSchemeName = keyof typeof palette;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  x20: 20,
  xl: 24,
  xxl: 32,
  x40: 40,
  xxxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  /** 일반 버튼 — pill 대신 사용 */
  button: 14,
  /** 카드 기본 */
  card: 16,
  /** 말풍선 (화자 방향 모서리는 6) */
  bubble: 18,
  large: 24,
  pill: 999,
  /** @deprecated card/large를 사용 — 하위 호환 별칭 */
  lg: 16,
  xl: 24,
} as const;

/**
 * 폰트 패밀리.
 * - UI(한국어): 시스템 폰트 (Noto Sans KR 번들은 웨이트당 수 MB라 PWA 로딩 저하 → 제외)
 * - 영어 일기: Lora (번들, @expo-google-fonts/lora — 무료)
 * - 일본어 일기: 플랫폼 세리프 fallback (Noto Serif JP 번들은 4MB+/웨이트 → 제외)
 */
export const fonts = {
  sans: undefined as string | undefined, // 시스템 기본
  serifEn: 'Lora_500Medium',
  serifEnBold: 'Lora_600SemiBold',
  serifJa: Platform.select({
    ios: 'Hiragino Mincho ProN',
    android: 'serif',
    default: 'serif',
  }),
} as const;

interface TypeToken {
  fontSize: number;
  lineHeight: number;
  fontWeight: TextStyle['fontWeight'];
  fontFamily?: string;
}

export const typography: Record<string, TypeToken> = {
  /** 홈 인사말 등 제한된 영역 전용 */
  display: { fontSize: 30, lineHeight: 40, fontWeight: '600' },
  title: { fontSize: 26, lineHeight: 36, fontWeight: '700' },
  heading: { fontSize: 21, lineHeight: 30, fontWeight: '700' },
  subheading: { fontSize: 17, lineHeight: 26, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 27, fontWeight: '400' },
  bodyMedium: { fontSize: 16, lineHeight: 27, fontWeight: '500' },
  bodySmall: { fontSize: 14, lineHeight: 22, fontWeight: '400' },
  label: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 19, fontWeight: '400' },
  /** 완성 일기 제목/본문 — 언어별 세리프는 DiaryText에서 적용 */
  diaryTitle: { fontSize: 24, lineHeight: 34, fontWeight: '600' },
  diaryBody: { fontSize: 18, lineHeight: 31, fontWeight: '400' },
  correctionSentence: { fontSize: 17, lineHeight: 28, fontWeight: '500' },
};

export type TypographyVariant = keyof typeof typography;

/** 대표 카드/모달/중앙 버튼에만 사용 — 모든 카드에 그림자를 넣지 않는다 */
export function raisedShadow(colors: ThemeColors, scheme: 'light' | 'dark') {
  return {
    shadowColor: colors.shadow,
    shadowOpacity: 1,
    shadowOffset: { width: 0, height: scheme === 'dark' ? 4 : 3 },
    shadowRadius: scheme === 'dark' ? 12 : 10,
    elevation: scheme === 'dark' ? 3 : 2,
  };
}

/** @deprecated raisedShadow 사용 — 하위 호환용 */
export const shadows = {
  card: {
    shadowColor: 'rgba(69, 51, 75, 0.10)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
} as const;

/** 최소 터치 영역 (접근성) */
export const MIN_TOUCH_TARGET = 44;
