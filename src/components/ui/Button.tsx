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
  // 비활성은 투명도로 흐리게 만들지 않는다. 흐려진 노랑 위의 금색 글씨가 2:1대까지
  // 떨어져 라벨이 안 읽혔다. 대신 차분한 배경 + 보조 글자색으로 "지금은 못 누른다"를
  // 보여 주고 가독성은 지킨다.
  const isMuted = Boolean(disabled) && variant !== 'ghost';
  const textColor = isMuted
    ? colors.textSecondary
    : variant === 'danger'
      ? colors.onError
      : variant === 'primary'
        ? colors.onPrimary
      : variant === 'secondary'
        ? colors.primaryInk
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
          backgroundColor: isMuted
            ? colors.surfaceSoft
            : pressed
              ? pressedBackgrounds[variant]
              : backgrounds[variant],
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: spacing.sm,
          opacity: disabled && variant === 'ghost' ? 0.6 : 1,
          // 노란 채움 버튼은 크림 배경 위에서 경계가 흐려진다 — 진한 금색 테두리로 형태를 지킨다
          // secondary도 테두리를 준다. 옅은 노랑 채움이 크림 배경과 거의 같은 밝기라
          // 테두리가 없으면 버튼으로 안 보였다 (같은 줄의 다른 버튼만 테두리가 있어 더 어색했다).
          borderWidth: variant === 'danger' ? 0 : 1,
          borderColor: isMuted
            ? colors.border
            : variant === 'primary' || variant === 'secondary'
              ? colors.primaryBorder
              : colors.border,
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
