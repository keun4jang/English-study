import React from 'react';
import { View } from 'react-native';

import { DiaryEntry } from '@/domain/types';
import { MOOD_LABELS, MoodGroup, buildMoodTrend } from '@/lib/moodTrend';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import { AppText } from './AppText';
import { emotionLabel } from './EmotionPicker';

/**
 * 감정 흐름 막대.
 *
 * 점수나 평균을 만들지 않는다. 좋았던 날이 며칠, 힘들었던 날이 며칠인지만 보여준다.
 * 감정에 점수를 붙이면 사용자는 점수를 올리려고 감정을 고르게 되고, 그러면 일기가 아니다.
 *
 * 색은 세 갈래를 **색만으로 구분하지 않는다** — 높이와 라벨이 함께 구분한다
 * (색각 이상이 있어도 읽을 수 있어야 한다).
 */

interface MoodTrendProps {
  entries: DiaryEntry[];
  days?: number;
}

export function MoodTrend({ entries, days = 30 }: MoodTrendProps) {
  const { colors } = useTheme();
  const trend = buildMoodTrend(entries, days);

  const style: Record<MoodGroup, { color: string; height: number }> = {
    good: { color: colors.success, height: 28 },
    neutral: { color: colors.primaryBorder, height: 18 },
    // 힘들었던 날을 너무 낮게 두면 기록 없는 날(3px)과 구분이 안 된다
    hard: { color: colors.accentRose, height: 12 },
  };

  if (trend.recorded === 0) {
    return (
      <AppText variant="bodySmall" color="secondary">
        아직 감정을 기록한 날이 없어요. 일기를 쓸 때 오늘의 감정을 고르면 여기에 흐름이 쌓여요.
      </AppText>
    );
  }

  return (
    <View style={{ gap: spacing.md }}>
      <View
        accessibilityRole="image"
        accessibilityLabel={`최근 ${days}일 감정 흐름. 좋았던 날 ${trend.counts.good}일, 평범한 날 ${trend.counts.neutral}일, 힘들었던 날 ${trend.counts.hard}일.`}
        style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 32 }}
      >
        {trend.days.map((day) => (
          <View
            key={day.date}
            style={{
              flex: 1,
              minWidth: 3,
              borderRadius: radius.sm,
              // 기록이 없는 날도 자리를 비워 두지 않고 옅게 그린다 — 빈 날이 보여야 흐름이 읽힌다
              height: day.group ? style[day.group].height : 3,
              backgroundColor: day.group ? style[day.group].color : colors.border,
            }}
          />
        ))}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
        {(['good', 'neutral', 'hard'] as const).map((group) => (
          <View key={group} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <View
              style={{
                width: 8,
                height: style[group].height / 2,
                borderRadius: 2,
                backgroundColor: style[group].color,
              }}
            />
            <AppText variant="caption" color="secondary">
              {MOOD_LABELS[group]} {trend.counts[group]}일
            </AppText>
          </View>
        ))}
      </View>

      {trend.topEmotion ? (
        <AppText variant="caption" color="secondary">
          이 기간에 가장 자주 고른 감정은 “{emotionLabel(trend.topEmotion)}”이에요.
        </AppText>
      ) : null}
    </View>
  );
}
