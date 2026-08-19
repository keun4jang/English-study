import React, { PropsWithChildren } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';

import { LearningLanguage } from '@/domain/types';
import { fonts, radius, raisedShadow, spacing, typography } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import { AppText } from './AppText';

/**
 * 완성된 일기를 "한 장의 종이"로 보여주는 컴포넌트.
 *
 * 앱에서 세리프를 쓰는 곳은 여기뿐이다. 대화·교정 카드는 학습 인터페이스라 산세리프를
 * 쓰고, 다 쓰인 일기만 세리프 문서가 된다. 그 차이가 "대화가 일기로 완성됐다"는 변화를
 * 폰트로 보여 준다.
 *
 * 영어는 Lora, 일본어는 플랫폼 명조를 쓴다. 일본어 명조는 Lora보다 세로 획과 문장 밀도가
 * 높아서 줄간격을 조금 더 준다.
 */

export function diaryFontFamily(language: LearningLanguage, bold = false): string | undefined {
  if (language === 'en') return bold ? fonts.serifEnBold : fonts.serifEn;
  return fonts.serifJa;
}

/** 일본어 명조는 줄간격·자간을 조금 더 준다 */
function diaryMetrics(language: LearningLanguage, kind: 'title' | 'body') {
  if (language !== 'ja') return undefined;
  return kind === 'title'
    ? { lineHeight: 36, letterSpacing: 0.1 }
    : { lineHeight: 32, letterSpacing: 0.15 };
}

interface DiaryPaperProps extends PropsWithChildren {
  style?: StyleProp<ViewStyle>;
}

export function DiaryPaper({ children, style }: DiaryPaperProps) {
  const { colors, scheme } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: colors.diaryPaper,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: radius.card,
          paddingHorizontal: spacing.xl,
          paddingVertical: 28,
        },
        raisedShadow(colors, scheme),
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function DiaryTitleText({
  language,
  children,
}: {
  language: LearningLanguage;
  children: string;
}) {
  return (
    <AppText
      variant="diaryTitle"
      style={{ fontFamily: diaryFontFamily(language, true), ...diaryMetrics(language, 'title') }}
    >
      {children}
    </AppText>
  );
}

export function DiaryBodyText({
  language,
  children,
}: {
  language: LearningLanguage;
  children: string;
}) {
  return (
    <AppText
      variant="diaryBody"
      style={{ fontFamily: diaryFontFamily(language), ...diaryMetrics(language, 'body') }}
    >
      {children}
    </AppText>
  );
}

/** 종이 줄무늬 — 얇은 구분선 (텍스처 이미지 금지) */
export function DiaryLine() {
  const { colors } = useTheme();
  return <View style={{ height: 1, backgroundColor: colors.diaryLine, marginVertical: spacing.md }} />;
}

/** 접근성용: diaryBody 크기 참조 (미사용 경고 방지 겸 명시적 export) */
export const DIARY_BODY_SIZE = typography.diaryBody.fontSize;
