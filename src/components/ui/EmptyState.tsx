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
  /**
   * 화면 전체가 빈 상태일 때 true. 남은 공간을 채우고 세로 가운데에 놓인다.
   *
   * 기본값이 false인 이유: 예전에는 항상 flexGrow:1이었는데, 부모가 늘어나지 않는
   * 구조에서는 아무 효과가 없어 화면 위쪽에 붙어 버리고(친구·휴지통), 반대로 목록 안에
   * 끼워 쓸 때는 늘어나면 안 된다. 늘릴지 말지는 쓰는 쪽이 정해야 한다.
   */
  fill?: boolean;
}

/** 빈 상태 — 작은 라인 아이콘 + 죄책감 없는 따뜻한 안내 */
export function EmptyState({
  icon = 'feather',
  title,
  description,
  actionLabel,
  onAction,
  fill = false,
}: EmptyStateProps) {
  return (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xxl,
        gap: spacing.md,
        ...(fill ? { flexGrow: 1 } : null),
      }}
    >
      <AppIcon name={icon} size={32} color="accent" />
      {/* 빈 화면은 '아무것도 없다'를 알리는 자리라 말투가 제일 중요하다 — 손글씨로 쓴다 */}
      <AppText variant="editorialTitle" align="center">
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
