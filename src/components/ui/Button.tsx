import { Feather } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, Pressable, StyleProp, View, ViewStyle } from 'react-native';

import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import { AppText } from './AppText';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'large' | 'medium' | 'compact';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: keyof typeof Feather.glyphMap;
  disabled?: boolean;
  loading?: boolean;
  /** @deprecated size="compact" 사용 — 하위 호환 별칭 */
  small?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}

const MIN_HEIGHTS: Record<ButtonSize, number> = { large: 52, medium: 48, compact: 44 };

/**
 * 공용 버튼 — radius 14 (pill은 칩 전용).
 * pressed 시 배경 토큰 변경 + 0.98 scale, disabled에도 라벨 가독성 유지.
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  size,
  icon,
  disabled,
  loading,
  small,
  style,
  accessibilityHint,
}: ButtonProps) {
  const { colors } = useTheme();
  const resolvedSize: ButtonSize = size ?? (small ? 'compact' : 'medium');

  const backgrounds: Record<ButtonVariant, string> = {
    primary: colors.primary,
    secondary: colors.primarySoft,
    ghost: 'transparent',
    danger: colors.error,
  };
  const pressedBackgrounds: Record<ButtonVariant, string> = {
    primary: colors.primary,
    secondary: colors.selectedBackground,
    ghost: colors.pressedBackground,
    danger: colors.error,
  };
  const textColor =
    variant === 'primary' || variant === 'danger'
      ? colors.onPrimary
      : variant === 'secondary'
        ? colors.primary
        : colors.textSecondary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: Boolean(disabled), busy: Boolean(loading) }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        {
          minHeight: MIN_HEIGHTS[resolvedSize],
          paddingHorizontal: icon ? spacing.lg : spacing.x20,
          paddingVertical: spacing.sm,
          borderRadius: radius.button,
          backgroundColor: pressed ? pressedBackgrounds[variant] : backgrounds[variant],
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: spacing.sm,
          opacity: disabled ? 0.55 : 1,
          borderWidth: variant === 'ghost' ? 1 : 0,
          borderColor: colors.border,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <>
          {icon ? (
            <View accessibilityElementsHidden importantForAccessibility="no">
              <Feather name={icon} size={18} color={textColor} />
            </View>
          ) : null}
          <AppText variant="label" style={{ color: textColor }}>
            {label}
          </AppText>
        </>
      )}
    </Pressable>
  );
}
