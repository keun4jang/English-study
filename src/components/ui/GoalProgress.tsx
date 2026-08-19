import React from 'react';
import { View } from 'react-native';

import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import { AppIcon } from './AppIcon';
import { AppText } from './AppText';
import { Card } from './Card';

interface GoalProgressProps {
  total: number;
  goal: number;
  achieved: boolean;
}

/**
 * 오늘의 목표 진행 표시 (듀오링고 daily goal에서 착안).
 * 미달성 상태에 어떤 압박/죄책감 문구도 쓰지 않는다.
 * 진행률은 색 + 텍스트로 함께 표현한다 (색상만으로 구분 금지).
 */
export function GoalProgress({ total, goal, achieved }: GoalProgressProps) {
  const { colors } = useTheme();
  const ratio = goal > 0 ? Math.min(1, total / goal) : 0;

  return (
    <Card
      style={{ gap: spacing.sm }}
      accessible
      accessibilityLabel={
        achieved
          ? `오늘의 목표 ${goal}문장을 달성했어요. 오늘 ${total}문장 이야기했어요.`
          : `오늘의 목표 진행 중. ${goal}문장 중 ${total}문장`
      }
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        {achieved ? (
          <AppIcon name="check-circle" size={18} color="success" />
        ) : (
          <AppIcon name="target" size={18} color="accent" />
        )}
        <AppText variant="label" style={{ flex: 1 }}>
          {achieved
            ? '오늘의 목표를 채웠어요'
            : total > 0
              ? `오늘 ${goal}문장 중 ${total}문장을 이야기했어요`
              : `오늘의 목표: ${goal}문장 — 편하게 시작해요`}
        </AppText>
        <AppText variant="caption" color="secondary">
          {Math.min(total, goal)}/{goal}
        </AppText>
      </View>
      <View
        style={{
          height: 8,
          borderRadius: radius.pill,
          backgroundColor: colors.surfaceSoft,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            width: `${Math.round(ratio * 100)}%`,
            height: '100%',
            borderRadius: radius.pill,
            backgroundColor: achieved ? colors.success : colors.primaryBorder,
          }}
        />
      </View>
      {achieved && total > goal ? (
        <AppText variant="caption" color="secondary">
          목표보다 {total - goal}문장 더 이야기했어요
        </AppText>
      ) : null}
    </Card>
  );
}
