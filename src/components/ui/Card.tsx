import React, { PropsWithChildren } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';

import { radius, shadows, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

interface CardProps extends PropsWithChildren {
  style?: StyleProp<ViewStyle>;
  soft?: boolean;
}

/** 둥근 모서리 + 미세한 그림자의 기본 카드 */
export function Card({ children, style, soft }: CardProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: soft ? colors.surfaceSoft : colors.surface,
          borderRadius: radius.lg,
          padding: spacing.lg,
          borderWidth: 1,
          borderColor: colors.border,
        },
        shadows.card,
        style,
      ]}
    >
      {children}
    </View>
  );
}
