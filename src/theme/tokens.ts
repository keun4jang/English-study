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
  /**
   * 위험(삭제) 버튼 위의 글자색.
   *
   * onPrimary를 같이 쓰면 안 된다. 브랜드색이 밝은 노랑이라 onPrimary가 어두운 잉크인데,
   * error는 어두운 빨강이어서 어두운 글자를 얹으면 라벨이 묻힌다. 실제로 휴지통의
   * "영구 삭제" 라벨이 2.5:1까지 떨어졌었다.
   */
  onError: string;
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
    onError: '#FFFFFF',
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
    // 다크에서는 error가 밝은 분홍이라 어두운 글자를 얹는다
    onError: '#3A1D20',
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
 *
 * 규칙은 **언어별이 아니라 역할별**로 나눈다.
 * - 조작하고 학습하는 영역(버튼·대화·교정 카드·설정)은 전부 산세리프 하나로 통일한다.
 *   교정 카드의 영어 문장도 세리프를 쓰지 않는다.
 * - 완성되어 보관되는 문서(일기)만 세리프를 쓴다.
 * 그래서 "대화가 일기로 완성됐다"는 변화가 폰트로도 드러난다.
 *
 * SUIT는 UI 본문용으로 만들어진 한글 폰트라 한글·라틴 수직 정렬이 안정적이고,
 * 웨이트당 약 167KB로 작다.
 *
 * 굵기별로 family를 나누지 않고 하나의 'SUIT' family에 400/600/700을 등록한다.
 * 나눠 두면 SemiBold family에 fontWeight 600이 겹쳐 들어가 브라우저가 가짜 볼드를
 * 덧씌운다(획이 두꺼워지고 지저분해진다).
 *
 * 네이티브(Expo Go/개발 빌드)에는 SUIT를 아직 넣지 않았다 — TTF는 웨이트당 590KB라
 * 지금 배포 형태(PWA)에 필요 없는 1.7MB를 저장소에 넣게 된다. 네이티브에서는
 * undefined가 되어 시스템 폰트로 안전하게 내려간다.
 */
// 폴백을 반드시 붙인다. 'SUIT' 하나만 쓰면 폰트를 못 받았을 때 브라우저 기본값인
// Times(세리프)로 떨어져서, 한글은 시스템 고딕인데 영어만 명조로 나오는 기괴한 화면이 된다.
// (실제로 폰트가 404 나던 화면에서 그 증상을 겪었다.)
const UI_FONT =
  Platform.OS === 'web'
    ? 'SUIT, system-ui, -apple-system, "Segoe UI", Roboto, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif'
    : undefined;

/**
 * 손글씨 폰트 — '아기자기한' 감정을 담는 자리에만 쓴다.
 *
 * 쓰는 곳: 오늘의 편지 질문, 빈 화면 제목, 온보딩 소개 문장처럼 **앱이 사용자에게 건네는
 * 고정 문구**. 쓰지 않는 곳: 버튼·설정·교정 카드·통계 숫자·날짜, 그리고 **사용자가 입력한
 * 모든 글자**(닉네임·일기 본문).
 *
 * 사용자 입력에 쓰지 않는 이유는 취향이 아니라 기술적 제약이다. 용량을 줄이려고 앱 소스에
 * 실제로 등장하는 한글 음절만 남겨 뒀기 때문에(scripts/subset-hand-font.py), 서브셋에 없는
 * 글자는 브라우저가 그 한 글자만 SUIT로 떨어뜨려 한 단어 안에서 글씨체가 섞인다.
 */
const HAND_FONT = Platform.OS === 'web' ? `Gaegu, ${UI_FONT}` : undefined;

export const fonts = {
  /** 한국어·영어 UI 공통 (대화·교정 카드 포함) */
  ui: UI_FONT,
  /** 감정을 담는 고정 문구 전용 손글씨 (사용자 입력에는 쓰지 않는다) */
  hand: HAND_FONT,
  /** @deprecated ui 사용 */
  sans: UI_FONT,
  serifEn: 'Lora_400Regular',
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
  letterSpacing?: number;
}

/**
 * 실제 크기 단계는 13 / 14 / 16 / 18 / 22 / 26 / 30 일곱 개로 정리했다(일기 24는 예외).
 * 이전에는 21과 17이 있었는데 각각 18·26, 16 사이에서 차이가 잘 안 보였다.
 *
 * 자간은 한글에서 특히 중요하다. SUIT는 자체 자간이 이미 촘촘해서 큰 음수 자간을 더하면
 * 답답해지고, 16px 이하에서 음수를 크게 주면 다크 모드·저해상도 Android에서 획이 뭉친다.
 * 그래서 큰 글자에만 살짝 좁히고 본문 이하는 0에 둔다.
 */
export const typography: Record<string, TypeToken> = {
  /** 홈 인사말 등 제한된 영역 전용 */
  display: { fontSize: 30, lineHeight: 40, fontWeight: '600', fontFamily: fonts.ui, letterSpacing: -0.45 },
  /**
   * 손글씨 문구 — 앱이 말을 거는 자리(오늘의 편지 질문, 온보딩 소개).
   *
   * Gaegu는 글자 폭이 넓고 획이 가늘어서 SUIT와 같은 크기로 두면 작고 흐려 보인다.
   * 그래서 같은 위계라도 한 단계 크게 잡고 줄간격을 넉넉히 준다. 자간은 손글씨의 리듬을
   * 해치지 않도록 0에 둔다.
   */
  editorial: { fontSize: 26, lineHeight: 38, fontWeight: '700', fontFamily: fonts.hand },
  /** 손글씨 제목 — 빈 화면처럼 한 줄짜리 안내 */
  editorialTitle: { fontSize: 24, lineHeight: 34, fontWeight: '700', fontFamily: fonts.hand },
  /** 손글씨 본문 — 두세 줄짜리 소개 문단 */
  /**
   * 손글씨 본문 — 두세 줄짜리 소개 문단.
   *
   * 20px에서는 온보딩 첫 줄이 420px 화면 좌우 여백에 거의 닿는다. 글자 크기를 '크게'로
   * 두면(1.15배) 줄이 한 번 더 접히면서 문단 모양이 무너져서 한 단계 낮춰 잡았다.
   */
  editorialBody: { fontSize: 19, lineHeight: 31, fontWeight: '400', fontFamily: fonts.hand },
  title: { fontSize: 26, lineHeight: 36, fontWeight: '700', fontFamily: fonts.ui, letterSpacing: -0.35 },
  heading: { fontSize: 22, lineHeight: 30, fontWeight: '700', fontFamily: fonts.ui, letterSpacing: -0.2 },
  subheading: { fontSize: 18, lineHeight: 26, fontWeight: '600', fontFamily: fonts.ui, letterSpacing: -0.1 },
  body: { fontSize: 16, lineHeight: 26, fontWeight: '400', fontFamily: fonts.ui },
  /** 강조 본문 — 긴 문단 전체가 아니라 강조 문장·인터랙션 텍스트에만 */
  bodyStrong: { fontSize: 16, lineHeight: 26, fontWeight: '600', fontFamily: fonts.ui },
  bodySmall: { fontSize: 14, lineHeight: 22, fontWeight: '400', fontFamily: fonts.ui },
  label: { fontSize: 14, lineHeight: 20, fontWeight: '600', fontFamily: fonts.ui },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400', fontFamily: fonts.ui, letterSpacing: 0.05 },
  /** 완성 일기 제목/본문 — 언어별 세리프는 DiaryText에서 적용 */
  diaryTitle: { fontSize: 24, lineHeight: 34, fontWeight: '600', letterSpacing: -0.15 },
  diaryBody: { fontSize: 18, lineHeight: 31, fontWeight: '400' },
  /**
   * 교정 문장 — 학습 인터페이스이지 문서가 아니므로 세리프를 쓰지 않는다.
   * 크기보다 줄간격과 굵기로 구분한다.
   */
  correctionSentence: { fontSize: 16, lineHeight: 28, fontWeight: '600', fontFamily: fonts.ui },
  /** @deprecated bodyStrong 사용 — 웨이트 500을 줄이기 위해 통합 */
  bodyMedium: { fontSize: 16, lineHeight: 26, fontWeight: '600', fontFamily: fonts.ui },
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
