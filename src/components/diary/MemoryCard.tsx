import { router } from 'expo-router';
import React from 'react';
import { Pressable, View } from 'react-native';

import { AppIcon } from '@/components/ui/AppIcon';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { EmotionIcon } from '@/components/ui/EmotionPicker';
import { Memory } from '@/lib/onThisDay';
import { formatDateKo } from '@/lib/dates';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

/**
 * 그날의 기억 — 작년(또는 몇 달 전) 오늘 쓴 일기.
 *
 * 일기 앱을 계속 쓰게 만드는 건 쌓는 재미가 아니라 다시 읽는 재미다. 그 순간을 만드는
 * 카드라서 홈 위쪽에 둔다. 대신 하루에 최대 두 장까지만 — 홈이 과거로 뒤덮이면 안 된다.
 */

interface MemoryCardProps {
  memories: Memory[];
}

export function MemoryCard({ memories }: MemoryCardProps) {
  const { colors } = useTheme();
  if (memories.length === 0) return null;

  return (
    <Card variant="soft" style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <AppIcon name="clock" size={16} color="accent" />
        <AppText variant="label" color="accent">
          그날의 기억
        </AppText>
      </View>

      {memories.map((memory, index) => (
        <Pressable
          key={memory.entry.id}
          accessibilityRole="button"
          accessibilityLabel={`${memory.labelKo} 일기 보기: ${memory.entry.title || memory.entry.finalText.slice(0, 30)}`}
          onPress={() =>
            router.push({ pathname: '/diary/[id]', params: { id: memory.entry.id } })
          }
          style={({ pressed }) => ({
            gap: spacing.xs,
            paddingVertical: spacing.sm,
            borderTopWidth: index === 0 ? 0 : 1,
            borderTopColor: colors.border,
            backgroundColor: pressed ? colors.pressedBackground : 'transparent',
          })}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <AppText variant="bodyStrong" color="accent">
              {memory.labelKo}
            </AppText>
            <AppText variant="caption" color="secondary">
              {formatDateKo(memory.entry.localDate)}
            </AppText>
            <EmotionIcon emotion={memory.entry.emotion} size={16} />
          </View>
          <AppText variant="bodySmall" color="secondary" numberOfLines={2}>
            {memory.entry.title || memory.entry.finalText.replace(/\s+/g, ' ')}
          </AppText>
        </Pressable>
      ))}
    </Card>
  );
}
