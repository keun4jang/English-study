import React from 'react';
import { Pressable, View } from 'react-native';

import { Emotion } from '@/domain/types';
import { MIN_TOUCH_TARGET, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import { AppText } from './AppText';

export const EMOTIONS: { value: Emotion; emoji: string; labelKo: string }[] = [
  { value: 'happy', emoji: '😊', labelKo: '행복' },
  { value: 'calm', emoji: '😌', labelKo: '평온' },
  { value: 'excited', emoji: '🤩', labelKo: '신남' },
  { value: 'grateful', emoji: '🥰', labelKo: '감사' },
  { value: 'tired', emoji: '😪', labelKo: '피곤' },
  { value: 'sad', emoji: '😢', labelKo: '슬픔' },
  { value: 'anxious', emoji: '😟', labelKo: '불안' },
  { value: 'angry', emoji: '😤', labelKo: '화남' },
  { value: 'neutral', emoji: '🙂', labelKo: '보통' },
];

export function emotionEmoji(emotion: Emotion): string {
  return EMOTIONS.find((e) => e.value === emotion)?.emoji ?? '🙂';
}

interface EmotionPickerProps {
  value: Emotion;
  onChange: (emotion: Emotion) => void;
}

export function EmotionPicker({ value, onChange }: EmotionPickerProps) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
      {EMOTIONS.map((e) => {
        const selected = e.value === value;
        return (
          <Pressable
            key={e.value}
            accessibilityRole="button"
            accessibilityLabel={`감정: ${e.labelKo}`}
            accessibilityState={{ selected }}
            onPress={() => onChange(e.value)}
            style={{
              minWidth: MIN_TOUCH_TARGET + 8,
              minHeight: MIN_TOUCH_TARGET + 12,
              borderRadius: radius.md,
              backgroundColor: selected ? colors.primarySoft : colors.surface,
              borderWidth: 1.5,
              borderColor: selected ? colors.primary : colors.border,
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: spacing.xs,
            }}
          >
            <AppText style={{ fontSize: 22, lineHeight: 28 }}>{e.emoji}</AppText>
            <AppText variant="caption" color={selected ? 'accent' : 'secondary'}>
              {e.labelKo}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
