import React from 'react';
import { View } from 'react-native';

import { spacing } from '@/theme/tokens';
import { AppText } from './AppText';
import { Button } from './Button';

interface EmptyStateProps {
  emoji?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** 빈 상태 화면 — 죄책감 없는 따뜻한 안내 */
export function EmptyState({ emoji = '🌿', title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', padding: spacing.xxl, gap: spacing.md, flexGrow: 1 }}>
      <AppText style={{ fontSize: 44, lineHeight: 56 }} accessibilityElementsHidden>
        {emoji}
      </AppText>
      <AppText variant="subheading" align="center">
        {title}
      </AppText>
      {description ? (
        <AppText variant="bodySmall" color="secondary" align="center">
          {description}
        </AppText>
      ) : null}
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} variant="secondary" /> : null}
    </View>
  );
}
