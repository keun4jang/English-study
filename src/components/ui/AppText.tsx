import React from 'react';
import { Text, TextProps, TextStyle } from 'react-native';

import { useSettings } from '@/state/useSettings';
import { typography } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

type Variant = keyof typeof typography;

interface AppTextProps extends TextProps {
  variant?: Variant;
  color?: 'primary' | 'secondary' | 'accent' | 'onPrimary' | 'error' | 'success';
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
  const colorMap = {
    primary: colors.textPrimary,
    secondary: colors.textSecondary,
    accent: colors.primary,
    onPrimary: colors.textOnPrimary,
    error: colors.error,
    success: colors.success,
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
          color: colorMap[color],
          textAlign: align,
        },
        style,
      ]}
    />
  );
}
