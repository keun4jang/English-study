import React, { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleProp, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

interface ScreenProps extends PropsWithChildren {
  scroll?: boolean;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
  /** 하단 safe area까지 패딩 포함 여부 */
  bottomInset?: boolean;
}

/** 배경/세이프에어리어/키보드 회피를 처리하는 화면 래퍼 */
export function Screen({ children, scroll = true, padded = true, style, bottomInset = true }: ScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const contentStyle: ViewStyle = {
    paddingHorizontal: padded ? spacing.lg : 0,
    paddingTop: padded ? spacing.md : 0,
    paddingBottom: (bottomInset ? insets.bottom : 0) + (padded ? spacing.xl : 0),
    flexGrow: 1,
  };

  const body = scroll ? (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[contentStyle, style]}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1 }, contentStyle, style]}>{children}</View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {body}
    </KeyboardAvoidingView>
  );
}
