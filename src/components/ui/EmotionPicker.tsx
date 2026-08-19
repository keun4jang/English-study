import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, View } from 'react-native';

import { Emotion } from '@/domain/types';
import { MIN_TOUCH_TARGET, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import { AppIcon, AppMciIcon } from './AppIcon';
import { AppText } from './AppText';

type MciName = keyof typeof MaterialCommunityIcons.glyphMap;

/** 감정별 얼굴 아이콘 — 전체 9종 매핑 (이전에 저장된 일기 표시용) */
const EMOTION_ICONS: Record<Emotion, MciName> = {
  happy: 'emoticon-happy-outline',
  calm: 'emoticon-outline',
  excited: 'emoticon-excited-outline',
  grateful: 'emoticon-kiss-outline',
  tired: 'emoticon-dead-outline',
  sad: 'emoticon-sad-outline',
  anxious: 'emoticon-confused-outline',
  angry: 'emoticon-angry-outline',
  neutral: 'emoticon-neutral-outline',
};

const EMOTION_LABELS: Record<Emotion, string> = {
  happy: '기쁨',
  calm: '편안함',
  excited: '설렘',
  grateful: '감사',
  tired: '피곤함',
  sad: '속상함',
  anxious: '불안',
  angry: '화남',
  neutral: '평범함',
};

/** 선택 화면에 보여줄 감정 6가지 (기존 저장 데이터의 다른 감정도 표시엔 지원) */
const PICKER_EMOTIONS: Emotion[] = ['happy', 'calm', 'excited', 'neutral', 'tired', 'sad'];

export function emotionIconName(emotion: Emotion): MciName {
  return EMOTION_ICONS[emotion] ?? 'emoticon-neutral-outline';
}

export function emotionLabel(emotion: Emotion): string {
  return EMOTION_LABELS[emotion] ?? '평범함';
}

/** 감정 아이콘 표시용 (목록/달력 등) */
export function EmotionIcon({ emotion, size = 18 }: { emotion: Emotion; size?: number }) {
  return <AppMciIcon name={emotionIconName(emotion)} size={size} color="accent" />;
}

interface EmotionPickerProps {
  value: Emotion;
  onChange: (emotion: Emotion) => void;
}

/**
 * 감정 선택 — 선택 상태는 배경 + 2px 테두리 + 체크 + 라벨 굵기로 함께 표현.
 * 색상만으로 구분하지 않는다.
 */
export function EmotionPicker({ value, onChange }: EmotionPickerProps) {
  const { colors } = useTheme();
  // 저장된 값이 6종 외(예: 감사)라면 그 감정도 함께 보여줘 데이터가 사라져 보이지 않게 한다
  const options = PICKER_EMOTIONS.includes(value)
    ? PICKER_EMOTIONS
    : [...PICKER_EMOTIONS, value];

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
      {options.map((emotion) => {
        const selected = emotion === value;
        return (
          <Pressable
            key={emotion}
            accessibilityRole="button"
            accessibilityLabel={`감정: ${EMOTION_LABELS[emotion]}`}
            accessibilityState={{ selected }}
            onPress={() => onChange(emotion)}
            style={({ pressed }) => ({
              minWidth: MIN_TOUCH_TARGET + 16,
              minHeight: MIN_TOUCH_TARGET + 18,
              borderRadius: radius.md,
              backgroundColor: selected
                ? colors.primarySoft
                : pressed
                  ? colors.pressedBackground
                  : colors.surface,
              borderWidth: selected ? 2 : 1,
              borderColor: selected ? colors.primaryBorder : colors.border,
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: spacing.sm,
              paddingHorizontal: spacing.sm,
              gap: 2,
            })}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <AppMciIcon
                name={EMOTION_ICONS[emotion]}
                size={24}
                color={selected ? 'accent' : 'secondary'}
              />
              {selected ? <AppIcon name="check" size={12} color="accent" /> : null}
            </View>
            <AppText
              variant="caption"
              weight={selected ? '600' : '400'}
              color={selected ? 'accent' : 'secondary'}
            >
              {EMOTION_LABELS[emotion]}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
