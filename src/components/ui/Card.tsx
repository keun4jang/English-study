import React, { PropsWithChildren } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';

import { radius, raisedShadow, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

type CardVariant = 'default' | 'raised' | 'soft' | 'paper';

interface CardProps extends PropsWithChildren {
  style?: StyleProp<ViewStyle>;
  variant?: CardVariant;
  /** @deprecated variant="soft" 사용 — 하위 호환 별칭 */
  soft?: boolean;
}

/**
 * 기본 카드 — radius 16.
 * 그림자는 raised(대표 카드/모달)에만 사용한다. 모든 카드에 그림자 금지.
 */
export function Card({ children, style, variant, soft }: CardProps) {
  const { colors, scheme } = useTheme();
  const resolved: CardVariant = variant ?? (soft ? 'soft' : 'default');

  const backgrounds: Record<CardVariant, string> = {
    default: colors.surface,
    raised: colors.surfaceRaised,
    soft: colors.surfaceSoft,
    paper: colors.diaryPaper,
  };

  return (
    <View
      style={[
        {
          backgroundColor: backgrounds[resolved],
          borderRadius: radius.card,
          padding: resolved === 'paper' ? undefined : spacing.x20,
          borderWidth: 1,
          borderColor: colors.border,
        },
        resolved === 'raised' || resolved === 'paper' ? raisedShadow(colors, scheme) : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}
