import React from 'react';
import { ActivityIndicator, Pressable, StyleProp, ViewStyle } from 'react-native';

import { MIN_TOUCH_TARGET, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import { AppText } from './AppText';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  small,
  style,
  accessibilityHint,
}: ButtonProps) {
  const { colors } = useTheme();
  const backgrounds: Record<ButtonVariant, string> = {
    primary: colors.primary,
    secondary: colors.primarySoft,
    ghost: 'transparent',
    danger: colors.error,
  };
  const textColor =
    variant === 'primary' || variant === 'danger'
      ? colors.textOnPrimary
      : variant === 'secondary'
        ? colors.primary
        : colors.textSecondary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: Boolean(disabled || loading) }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        {
          minHeight: MIN_TOUCH_TARGET,
          paddingHorizontal: small ? spacing.md : spacing.xl,
          paddingVertical: small ? spacing.sm : spacing.md,
          borderRadius: radius.pill,
          backgroundColor: backgrounds[variant],
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
          borderWidth: variant === 'ghost' ? 1 : 0,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <AppText
          variant={small ? 'bodySmall' : 'body'}
          weight="600"
          style={{ color: textColor }}
        >
          {label}
        </AppText>
      )}
    </Pressable>
  );
}
