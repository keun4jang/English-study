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
  /** 채움색 — 버튼/칩 배경. 이 위에는 onPrimary(어두운 잉크)를 올린다 */
  primary: string;
  /**
   * 글자·아이콘용 진한 브랜드색.
   *
   * 노랑은 밝아서 크림 배경 위 글자로 쓰면 대비가 2:1대로 떨어진다. 그래서 "칠하는 노랑"과
   * "쓰는 노랑"을 나눈다 — 배경은 primary, 글자·아이콘·포커스는 primaryInk.
   */
  primaryInk: string;
  /** 채움색 버튼의 테두리 — 밝은 배경 위에서 버튼 경계가 사라지지 않게 한다 */
  primaryBorder: string;
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
    background: '#FFFBF3',
    surface: '#FFFDF8',
    surfaceSoft: '#F7EFE0',
    surfaceRaised: '#FFFFFF',
    primary: '#E0A82E',
    primaryInk: '#856610',
    primaryBorder: '#B07F14',
    primarySoft: '#FBEFD2',
    onPrimary: '#2E2412',
    accentRose: '#A34A5C',
    accentRoseSoft: '#F8E7EA',
    accentSage: '#4F7457',
    accentSageSoft: '#E8F0E8',
    textPrimary: '#322C21',
    textSecondary: '#6A6152',
    textInverse: '#FFFFFF',
    border: '#E6DBC9',
    borderStrong: '#97897A',
    success: '#35704C',
    successSoft: '#E7F2EA',
    // 경고는 브랜드 노랑과 헷갈리지 않게 주황·적갈 쪽으로 옮겼다
    warning: '#9C4E18',
    warningSoft: '#FBE6D6',
    error: '#A14349',
    errorSoft: '#F9E7E8',
    shadow: 'rgba(90, 70, 30, 0.10)',
    scrim: 'rgba(40, 32, 18, 0.42)',
    inputBackground: '#FFFFFF',
    diaryPaper: '#FFFDF6',
    diaryLine: '#EFE4CE',
    tabInactive: '#6A6152',
    tabActive: '#856610',
    focusRing: '#856610',
    selectedBackground: '#FBEFD2',
    pressedBackground: '#F2E9D8',
    overlay: 'rgba(40, 32, 18, 0.42)',
  },
  dark: {
    background: '#1C1913',
    surface: '#262218',
    surfaceSoft: '#322C20',
    surfaceRaised: '#383021',
    // 어두운 배경에서는 밝은 노랑이 글자로도 충분히 읽혀서 primary와 primaryInk가 같다
    primary: '#F0C86A',
    primaryInk: '#F0C86A',
    primaryBorder: '#F0C86A',
    primarySoft: '#46381D',
    onPrimary: '#2A2113',
    accentRose: '#E7A3AE',
    accentRoseSoft: '#472D35',
    accentSage: '#A9C9A9',
    accentSageSoft: '#2B3A30',
    textPrimary: '#F5F0E4',
    textSecondary: '#C2B8A4',
    textInverse: '#2A2113',
    border: '#4C4535',
    borderStrong: '#7A7161',
    success: '#9BCDA8',
    successSoft: '#26392E',
    warning: '#F0A96A',
    warningSoft: '#43301E',
    error: '#F0A4A9',
    errorSoft: '#45282C',
    shadow: 'rgba(0, 0, 0, 0.34)',
    scrim: 'rgba(0, 0, 0, 0.58)',
    inputBackground: '#262218',
    diaryPaper: '#2B2619',
    diaryLine: '#3D3626',
    tabInactive: '#C2B8A4',
    tabActive: '#F0C86A',
    focusRing: '#F0C86A',
    selectedBackground: '#46381D',
    pressedBackground: '#322C20',
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
