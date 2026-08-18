import React, { useState } from 'react';
import { StyleProp, TextInput, TextInputProps, View, ViewStyle } from 'react-native';

import { radius, spacing, typography } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import { AppText } from './AppText';

interface TextFieldProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

/** 입력창 — 인지가 필요한 경계는 borderStrong, 포커스 시 primary 2px */
export function TextField({ label, error, containerStyle, style, onFocus, onBlur, ...rest }: TextFieldProps) {
  const { colors, scheme } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={[{ gap: spacing.xs }, containerStyle]}>
      {label ? (
        <AppText variant="label">{label}</AppText>
      ) : null}
      <TextInput
        accessibilityLabel={label ?? rest.placeholder}
        placeholderTextColor={colors.textSecondary}
        keyboardAppearance={scheme}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...rest}
        style={[
          {
            backgroundColor: colors.inputBackground,
            borderWidth: focused || error ? 2 : 1,
            borderColor: error ? colors.error : focused ? colors.focusRing : colors.borderStrong,
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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <AppText variant="caption" color="error" accessibilityLiveRegion="polite">
            {error}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}
