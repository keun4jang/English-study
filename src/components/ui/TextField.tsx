import React from 'react';
import { StyleProp, TextInput, TextInputProps, View, ViewStyle } from 'react-native';

import { radius, spacing, typography } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import { AppText } from './AppText';

interface TextFieldProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

export function TextField({ label, error, containerStyle, style, ...rest }: TextFieldProps) {
  const { colors } = useTheme();
  return (
    <View style={[{ gap: spacing.xs }, containerStyle]}>
      {label ? <AppText variant="bodySmall" weight="600">{label}</AppText> : null}
      <TextInput
        accessibilityLabel={label ?? rest.placeholder}
        placeholderTextColor={colors.textSecondary}
        {...rest}
        style={[
          {
            backgroundColor: colors.surface,
            borderWidth: 1.5,
            borderColor: error ? colors.error : colors.border,
            borderRadius: radius.md,
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.md,
            fontSize: typography.body.fontSize,
            color: colors.textPrimary,
            minHeight: 48,
          },
          style,
        ]}
      />
      {error ? (
        <AppText variant="caption" color="error">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}
