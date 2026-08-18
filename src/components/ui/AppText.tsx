import React from 'react';
import { Text, TextProps, TextStyle } from 'react-native';

import { useSettings } from '@/state/useSettings';
import { typography, TypographyVariant } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

type ColorName =
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'onPrimary'
  | 'inverse'
  | 'error'
  | 'success'
  | 'warning';

interface AppTextProps extends TextProps {
  variant?: TypographyVariant;
  color?: ColorName;
  weight?: TextStyle['fontWeight'];
  align?: TextStyle['textAlign'];
}

const FONT_SCALE = { small: 0.9, normal: 1, large: 1.15 } as const;

/** 폰트 확대 설정과 테마를 반영하는 공용 텍스트 */
export function AppText({
  variant = 'body',
  color = 'primary',
  weight,
  align,
  style,
  ...rest
}: AppTextProps) {
  const { colors } = useTheme();
  const fontScale = useSettings((s) => FONT_SCALE[s.design.fontScale]);
  const base = typography[variant];
  const colorMap: Record<ColorName, string> = {
    primary: colors.textPrimary,
    secondary: colors.textSecondary,
    accent: colors.primary,
    onPrimary: colors.onPrimary,
    inverse: colors.textInverse,
    error: colors.error,
    success: colors.success,
    warning: colors.warning,
  };
  return (
    <Text
      allowFontScaling
      {...rest}
      style={[
        {
          fontSize: base.fontSize * fontScale,
          lineHeight: base.lineHeight * fontScale,
          fontWeight: weight ?? base.fontWeight,
          fontFamily: base.fontFamily,
          color: colorMap[color],
          textAlign: align,
        },
        style,
      ]}
    />
  );
}
