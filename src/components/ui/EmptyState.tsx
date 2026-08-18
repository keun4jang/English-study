import { Feather } from '@expo/vector-icons';
import React from 'react';
import { View } from 'react-native';

import { spacing } from '@/theme/tokens';
import { AppIcon } from './AppIcon';
import { AppText } from './AppText';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: keyof typeof Feather.glyphMap;
  /** @deprecated icon 사용 — 하위 호환 (이모지는 무시됨) */
  emoji?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** 빈 상태 — 작은 라인 아이콘 + 죄책감 없는 따뜻한 안내 */
export function EmptyState({ icon = 'feather', title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xxl,
        gap: spacing.md,
        flexGrow: 1,
      }}
    >
      <AppIcon name={icon} size={32} color="accent" />
      <AppText variant="subheading" align="center">
        {title}
      </AppText>
      {description ? (
        <AppText variant="bodySmall" color="secondary" align="center">
          {description}
        </AppText>
      ) : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} variant="secondary" />
      ) : null}
    </View>
  );
}
