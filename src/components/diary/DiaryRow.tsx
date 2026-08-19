import React from 'react';
import { Pressable, View } from 'react-native';

import { AppIcon } from '@/components/ui/AppIcon';
import { AppText } from '@/components/ui/AppText';
import { EmotionIcon } from '@/components/ui/EmotionPicker';
import { DiaryEntry } from '@/domain/types';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

interface DiaryRowProps {
  entry: DiaryEntry;
  onPress: () => void;
  showDivider?: boolean;
}

/** 일기 목록 행 — 카드 반복 대신 리스트 + 얇은 구분선 구조 (최소 높이 72) */
export function DiaryRow({ entry, onPress, showDivider }: DiaryRowProps) {
  const { colors } = useTheme();
  const time = new Date(entry.createdAt).toLocaleTimeString('ko-KR', {
    hour: 'numeric',
    minute: '2-digit',
  });
  const preview = entry.title || entry.finalText.replace(/\s+/g, ' ').slice(0, 40);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`일기: ${preview}`}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 72,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xs,
        backgroundColor: pressed ? colors.pressedBackground : 'transparent',
        borderBottomWidth: showDivider ? 1 : 0,
        borderBottomColor: colors.border,
      })}
    >
      <EmotionIcon emotion={entry.emotion} size={24} />
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {preview}
        </AppText>
        <AppText variant="caption" color="secondary">
          {entry.language === 'en' ? '영어' : '일본어'} · {time}
          {entry.inputMethod === 'ai-chat' ? ' · AI 대화' : ''}
          {entry.isFavorite ? ' · 즐겨찾기' : ''}
        </AppText>
      </View>
      <AppIcon name="chevron-right" size={18} color="secondary" />
    </Pressable>
  );
}
