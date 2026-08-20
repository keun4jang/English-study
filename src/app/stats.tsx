import React, { useMemo } from 'react';
import { View } from 'react-native';

import { ActivityHeatmap } from '@/components/ui/ActivityHeatmap';
import { AppIcon } from '@/components/ui/AppIcon';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { GoalProgress } from '@/components/ui/GoalProgress';
import { MoodTrend } from '@/components/ui/MoodTrend';
import { Screen } from '@/components/ui/Screen';
import { calcStreakGenerous, todayKey } from '@/lib/dates';
import { computeDailyProgress, countSentences } from '@/lib/goals';
import { getUsageLimits } from '@/lib/usageLimits';
import { useChat } from '@/state/useChat';
import { selectActiveEntries, useDiary } from '@/state/useDiary';
import { useExpressions } from '@/state/useExpressions';
import { useSettings } from '@/state/useSettings';
import { useUsage } from '@/state/useUsage';
import { spacing } from '@/theme/tokens';

function StatCard({ icon, label, value }: { icon: React.ComponentProps<typeof AppIcon>['name']; label: string; value: string }) {
  return (
    // flex:1이면 홀수 개일 때 마지막 카드만 혼자 전체 폭으로 늘어나 격자가 깨진다
    <Card style={{ flexGrow: 0, flexBasis: '47%', alignItems: 'center', gap: spacing.xs }}>
      <AppIcon name={icon} size={22} color="accent" />
      <AppText variant="heading">{value}</AppText>
      <AppText variant="caption" color="secondary">
        {label}
      </AppText>
    </Card>
  );
}

/**
 * 학습 통계 — 측정 가능한 값만 표시한다.
 * 가짜 유창성 점수/발음 점수는 만들지 않는다.
 */
export default function StatsScreen() {
  const entries = useDiary((s) => s.entries);
  const messages = useChat((s) => s.messages);
  const expressions = useExpressions((s) => s.expressions);
  const usage = useUsage((s) => s.usage);
  const limits = getUsageLimits();

  const today = todayKey();
  const active = useMemo(() => selectActiveEntries(entries), [entries]);
  const uniqueDays = useMemo(() => new Set(active.map((e) => e.localDate)).size, [active]);
  const streakInfo = useMemo(
    () => calcStreakGenerous(active.map((e) => e.localDate), today),
    [active, today],
  );
  const spokenSentences = useMemo(
    () => messages.filter((m) => m.role === 'user').reduce((n, m) => n + countSentences(m.text), 0),
    [messages],
  );
  const enCount = active.filter((e) => e.language === 'en').length;
  const jaCount = active.filter((e) => e.language === 'ja').length;

  // 오늘의 목표는 홈에서 옮겨 왔다. 매일 보는 화면에 진행바가 있으면 일기가 숙제처럼 보인다.
  const dailyGoal = useSettings((s) => s.learning.dailyGoalSentences);
  const progress = useMemo(
    () => computeDailyProgress({ messages, entries, today, goal: dailyGoal }),
    [messages, entries, today, dailyGoal],
  );

  return (
    <Screen>
      <View style={{ gap: spacing.lg }}>
        <GoalProgress
          total={progress.total}
          goal={progress.goal}
          achieved={progress.achieved}
        />

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
          <StatCard icon="book" label="작성한 일기" value={String(active.length)} />
          <StatCard icon="calendar" label="총 학습 일수" value={`${uniqueDays}일`} />
          <StatCard icon="trending-up" label="연속 작성" value={`${streakInfo.streak}일`} />
          <StatCard icon="message-circle" label="AI에게 말한 문장" value={String(spokenSentences)} />
          <StatCard icon="book-open" label="저장한 표현" value={String(expressions.length)} />
        </View>

        <Card style={{ gap: spacing.sm }}>
          <AppText variant="subheading">기록 잔디</AppText>
          <ActivityHeatmap dateKeys={active.map((e) => e.localDate)} />
          {streakInfo.restDaysUsed > 0 ? (
            <AppText variant="caption" color="secondary">
              연속 기록에는 쉬어간 날 {streakInfo.restDaysUsed}일이 포함돼 있어요. 7일마다
              하루는 쉬어도 기록이 이어져요.
            </AppText>
          ) : null}
        </Card>

        <Card style={{ gap: spacing.sm }}>
          <AppText variant="subheading">감정 흐름</AppText>
          <AppText variant="caption" color="secondary">
            최근 30일
          </AppText>
          <MoodTrend entries={active} />
        </Card>

        <Card style={{ gap: spacing.sm }}>
          <AppText variant="subheading">언어별 일기</AppText>
          <AppText variant="bodySmall" color="secondary">
            영어 {enCount}개 · 일본어 {jaCount}개
          </AppText>
        </Card>

        <Card style={{ gap: spacing.sm }}>
          <AppText variant="subheading">오늘의 AI 사용량</AppText>
          <AppText variant="bodySmall" color="secondary">
            대화 {usage.date === today ? usage.aiTurns : 0} / {limits.dailyAiTurns}턴 · 일기 완성{' '}
            {usage.date === today ? usage.diaryGenerations : 0} / {limits.dailyDiaryGenerations}회
          </AppText>
          <AppText variant="caption" color="secondary">
            무료 한도 보호를 위해 하루 사용량이 제한돼요. 한도를 넘으면 일반 일기 모드로 계속 쓸
            수 있어요.
          </AppText>
        </Card>

        <AppText variant="caption" color="secondary">
          모든 수치는 기록된 활동 기준이에요. 발음 정확도처럼 정확히 측정할 수 없는 값은
          표시하지 않아요.
        </AppText>
      </View>
    </Screen>
  );
}
