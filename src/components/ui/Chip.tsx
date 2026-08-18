import React from 'react';
import { Pressable, View } from 'react-native';

import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import { AppIcon } from './AppIcon';
import { AppText } from './AppText';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}

/**
 * 선택 칩 — pill 형태는 칩/필터/제목 후보/감정 태그 전용.
 * 선택 상태는 배경 + 테두리 + 체크 아이콘 + 굵기로 함께 표현 (색상만으로 구분 금지).
 */
export function Chip({ label, selected, onPress }: ChipProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: Boolean(selected) }}
      hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 36,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: radius.pill,
        backgroundColor: selected
          ? colors.primarySoft
          : pressed
            ? colors.pressedBackground
            : colors.surface,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? colors.primary : colors.border,
        justifyContent: 'center',
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
        {selected ? <AppIcon name="check" size={14} color="accent" /> : null}
        <AppText
          variant="bodySmall"
          weight={selected ? '600' : '400'}
          color={selected ? 'accent' : 'secondary'}
        >
          {label}
        </AppText>
      </View>
    </Pressable>
  );
}
