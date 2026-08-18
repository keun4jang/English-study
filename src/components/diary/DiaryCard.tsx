import { Image } from 'expo-image';
import React from 'react';
import { Pressable, View } from 'react-native';

import { AppIcon } from '@/components/ui/AppIcon';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { EmotionIcon } from '@/components/ui/EmotionPicker';
import { DiaryEntry } from '@/domain/types';
import { formatDateKo } from '@/lib/dates';
import { radius, spacing } from '@/theme/tokens';

interface DiaryCardProps {
  entry: DiaryEntry;
  onPress: () => void;
  showDate?: boolean;
}

const VISIBILITY_LABELS: Record<DiaryEntry['visibility'], string> = {
  private: '나만 보기',
  'selected-friends': '선택한 친구',
  'all-friends': '모든 친구',
  link: '링크 공유',
};

/** 검색/타임라인용 일기 카드 */
export function DiaryCard({ entry, onPress, showDate = true }: DiaryCardProps) {
  const preview = entry.finalText.replace(/\s+/g, ' ').slice(0, 90);
  const cover = entry.photos.find((p) => p.isCover) ?? entry.photos[0];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`일기: ${entry.title || preview}`}
      onPress={onPress}
    >
      <Card style={{ gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <EmotionIcon emotion={entry.emotion} size={22} />
          <View style={{ flex: 1 }}>
            {showDate ? (
              <AppText variant="caption" color="secondary">
                {formatDateKo(entry.localDate)}
              </AppText>
            ) : null}
            <AppText variant="subheading" numberOfLines={1}>
              {entry.title || (entry.language === 'en' ? 'Untitled' : '無題')}
            </AppText>
          </View>
          {entry.isFavorite ? (
            <AppIcon name="bookmark" size={16} color="accent" decorative={false} />
          ) : null}
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <AppText variant="bodySmall" color="secondary" numberOfLines={2} style={{ flex: 1 }}>
            {preview}
            {entry.finalText.length > 90 ? '…' : ''}
          </AppText>
          {cover ? (
            <Image
              source={{ uri: cover.uri }}
              style={{ width: 56, height: 56, borderRadius: radius.md }}
              contentFit="cover"
              accessibilityLabel="일기 사진"
            />
          ) : null}
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', alignItems: 'center' }}>
          <AppText variant="caption" color="secondary">
            {entry.language === 'en' ? '영어' : '일본어'} · {VISIBILITY_LABELS[entry.visibility]}
            {entry.inputMethod === 'ai-chat' ? ' · AI 대화로 작성' : ''}
          </AppText>
          {entry.tags.slice(0, 3).map((tag) => (
            <AppText key={tag} variant="caption" color="accent">
              #{tag}
            </AppText>
          ))}
        </View>
      </Card>
    </Pressable>
  );
}
