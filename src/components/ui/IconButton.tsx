import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Pressable } from 'react-native';

import { radius } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

interface IconButtonProps {
  icon: keyof typeof Feather.glyphMap;
  /** 스크린리더용 라벨 (필수) */
  accessibilityLabel: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  size?: number;
}

/** 아이콘 전용 버튼 — 터치 영역 48, accessibilityLabel 필수 */
export function IconButton({
  icon,
  accessibilityLabel,
  onPress,
  variant = 'secondary',
  disabled,
  size = 20,
}: IconButtonProps) {
  const { colors } = useTheme();
  const backgrounds = {
    primary: colors.primary,
    secondary: colors.primarySoft,
    ghost: 'transparent',
  };
  // 투명도만 낮추면 노란 배경 위 아이콘이 사라져 버튼이 고장난 것처럼 보인다.
  // Button과 같은 방식으로 배경·색을 바꿔 "지금은 못 누른다"를 보여 준다.
  const isMuted = Boolean(disabled) && variant !== 'ghost';
  const iconColor = isMuted
    ? colors.textSecondary
    : variant === 'primary'
      ? colors.onPrimary
      : colors.primaryInk;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => ({
        width: 48,
        height: 48,
        borderRadius: radius.button,
        backgroundColor: isMuted
          ? colors.surfaceSoft
          : pressed && variant !== 'primary'
            ? colors.selectedBackground
            : backgrounds[variant],
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled && variant === 'ghost' ? 0.6 : 1,
        borderWidth: variant === 'ghost' ? 1 : 0,
        borderColor: colors.border,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      <Feather name={icon} size={size} color={disabled ? colors.textSecondary : iconColor} />
    </Pressable>
  );
}
