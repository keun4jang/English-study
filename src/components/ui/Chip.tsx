import React from 'react';
import { Pressable } from 'react-native';

import { MIN_TOUCH_TARGET, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import { AppText } from './AppText';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}

/** 선택 가능한 칩 — 선택 상태를 색상+체크표시로 함께 표현 (색상만으로 구분하지 않음) */
export function Chip({ label, selected, onPress }: ChipProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: Boolean(selected) }}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: Math.max(36, MIN_TOUCH_TARGET - 8),
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: radius.pill,
        backgroundColor: selected ? colors.primarySoft : colors.surface,
        borderWidth: 1.5,
        borderColor: selected ? colors.primary : colors.border,
        opacity: pressed ? 0.8 : 1,
        justifyContent: 'center',
      })}
    >
      <AppText variant="bodySmall" weight={selected ? '600' : '400'} color={selected ? 'accent' : 'secondary'}>
        {selected ? `✓ ${label}` : label}
      </AppText>
    </Pressable>
  );
}
