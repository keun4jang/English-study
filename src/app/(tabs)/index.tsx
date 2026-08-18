import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { AccessibilityInfo, Animated, View } from 'react-native';

import { DiaryRow } from '@/components/diary/DiaryRow';
import { AppIcon } from '@/components/ui/AppIcon';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { GoalProgress } from '@/components/ui/GoalProgress';
import { Screen } from '@/components/ui/Screen';
import { UpdateBanner } from '@/components/ui/UpdateBanner';
import { VersionFooter } from '@/components/ui/VersionFooter';
import { isMockAI } from '@/ai';
import { calcStreakGenerous, diffDays, formatDateKo, todayKey } from '@/lib/dates';
import { computeDailyProgress } from '@/lib/goals';
import { usePracticeQueue } from '@/lib/practiceQueue';
import { useAuth } from '@/state/useAuth';
import { useChat } from '@/state/useChat';
import { selectActiveEntries, selectEntriesByDate, useDiary } from '@/state/useDiary';
import { useExpressions } from '@/state/useExpressions';
import { useSettings } from '@/state/useSettings';
import { spacing } from '@/theme/tokens';

const DAILY_PROMPTS = [
  '오늘 가장 기억에 남는 순간은 무엇이었나요?',
  '오늘 감사했던 일 3가지는 무엇인가요?',
  '오늘 새로 배운 표현이 있나요?',
  '내일의 나에게 한마디를 남긴다면?',
  '오늘 먹은 것 중 가장 맛있었던 건 무엇인가요?',
  '오늘 누구와 이야기를 나눴나요?',
  '요즘 나를 웃게 하는 것은 무엇인가요?',
];

export default function TodayHome() {
  const user = useAuth((s) => s.user);
  const entries = useDiary((s) => s.entries);
  const draft = useDiary((s) => s.draft);
  const expressions = useExpressions((s) => s.expressions);
  const language = useSettings((s) => s.learning.language);
  const reduceMotion = useSettings((s) => s.design.reduceMotion);

  const conversations = useChat((s) => s.conversations);
  const chatMessages = useChat((s) => s.messages);

  const today = todayKey();
  const todayEntries = useMemo(() => selectEntriesByDate(entries, today), [entries, today]);
  // 진행 중인 AI 대화 — 자정이 지나도 사라지지 않고 이어서 할 수 있다
  const activeConversation = useMemo(
    () =>
      conversations.find(
        (c) =>
          c.status === 'active' &&
          chatMessages.some((m) => m.conversationId === c.id && m.role === 'user'),
      ) ?? null,
    [conversations, chatMessages],
  );

  const active = useMemo(() => selectActiveEntries(entries), [entries]);
  const streakInfo = useMemo(
    () => calcStreakGenerous(active.map((e) => e.localDate), today),
    [active, today],
  );
  const reviewDue = expressions.filter((e) => e.nextReviewDate <= today).length;
  const practiceQueue = usePracticeQueue();
  const dailyGoal = useSettings((s) => s.learning.dailyGoalSentences);
  const progress = useMemo(
    () => computeDailyProgress({ messages: chatMessages, entries, today, goal: dailyGoal }),
    [chatMessages, entries, today, dailyGoal],
  );

  // 오늘의 질문: 날짜 기반 기본 + "다른 질문 보기"로 교체 (150ms fade, Reduce Motion 시 즉시)
  const baseIndex = Math.abs(diffDays(today, '2026-01-01')) % DAILY_PROMPTS.length;
  const [promptOffset, setPromptOffset] = useState(0);
  const [promptOpacity] = useState(() => new Animated.Value(1));
  const promptIndex = (baseIndex + promptOffset) % DAILY_PROMPTS.length;

  const nextPrompt = () => {
    const advance = () => setPromptOffset((o) => o + 1);
    AccessibilityInfo.isReduceMotionEnabled().then((sysReduce) => {
      if (reduceMotion || sysReduce) {
        advance();
        return;
      }
      Animated.timing(promptOpacity, { toValue: 0, duration: 150, useNativeDriver: true }).start(
        () => {
          advance();
          Animated.timing(promptOpacity, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }).start();
        },
      );
    });
  };

  // 이어서 하기 카드들 — 우선순위: 초안 > 진행 중 대화 > 말하기 연습 > 복습
  const nudgeCards: React.ReactElement[] = [];
  if (draft) {
    nudgeCards.push(
      <Card key="draft" style={{ gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <AppIcon name="edit-3" size={18} color="accent" />
          <AppText variant="label">작성 중인 일기가 있어요</AppText>
        </View>
        <AppText variant="bodySmall" color="secondary" numberOfLines={2}>
          {draft.text || '(내용 없음)'}
        </AppText>
        <Button
          size="compact"
          variant="secondary"
          label="이어서 쓰기"
          onPress={() => router.push('/write/text')}
        />
      </Card>,
    );
  }
  if (activeConversation) {
    nudgeCards.push(
      <Card key="conversation" style={{ gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <AppIcon name="message-circle" size={18} color="accent" />
          <AppText variant="label">진행 중인 AI 대화가 있어요</AppText>
        </View>
        <Button size="compact" label="이어서 이야기하기" onPress={() => router.push('/write/chat')} />
      </Card>,
    );
  }
  if (practiceQueue.length > 0) {
    nudgeCards.push(
      <Card key="practice" style={{ gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <AppIcon name="mic" size={18} color="accent" />
          <AppText variant="label">다시 말해볼 문장이 {practiceQueue.length}개 있어요</AppText>
        </View>
        <Button
          size="compact"
          variant="secondary"
          label="연습 시작하기"
          onPress={() => router.push('/practice')}
        />
      </Card>,
    );
  }
  if (reviewDue > 0) {
    nudgeCards.push(
      <Card key="review" style={{ gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <AppIcon name="book-open" size={18} color="accent" />
          <AppText variant="label">복습할 표현이 {reviewDue}개 있어요</AppText>
        </View>
        <Button
          size="compact"
          variant="secondary"
          label="단어장 열기"
          onPress={() => router.push('/expressions')}
        />
      </Card>,
    );
  }

  return (
    <Screen>
      <View style={{ gap: spacing.x20 }}>
        {/* 배경 위 인사말 — 카드로 감싸지 않는다 */}
        <View style={{ gap: spacing.xs }}>
          <AppText variant="caption" color="secondary">
            {formatDateKo(today)}
          </AppText>
          <AppText variant="display">{user?.nickname ?? '친구'}님, 안녕하세요</AppText>
          {streakInfo.streak > 0 ? (
            <AppText variant="bodySmall" color="secondary">
              {streakInfo.streak}일째 이어서 기록하고 있어요
              {streakInfo.restDaysUsed > 0 ? ' (하루 쉬어가도 이어져요)' : ''}
            </AppText>
          ) : null}
          {isMockAI() ? (
            <AppText variant="caption" color="secondary">
              Mock AI 모드 — 실제 AI 연결 전 체험용 응답이에요
            </AppText>
          ) : null}
        </View>

        <UpdateBanner />

        {/* 오늘의 목표 — 부드러운 진행 표시 (미달성 죄책감 문구 없음) */}
        <GoalProgress
          total={progress.total}
          goal={progress.goal}
          achieved={progress.achieved}
        />

        {/* 이어서 하기 카드 — 우선순위(초안 > 대화 > 연습 > 복습)로 최대 2개만 노출해 과밀 방지 */}
        {nudgeCards.slice(0, 2)}

        {/* 오늘의 편지 — 대표 카드 (raised) */}
        <Card variant="raised" style={{ gap: spacing.lg }}>
          <AppText variant="label" color="accent">
            오늘의 편지
          </AppText>
          <Animated.View style={{ opacity: promptOpacity }}>
            <AppText style={{ fontSize: 21, lineHeight: 30, fontWeight: '500' }}>
              {DAILY_PROMPTS[promptIndex]}
            </AppText>
          </Animated.View>
          <View style={{ gap: spacing.sm }}>
            <Button
              label={`이 질문으로 시작하기 (${language === 'en' ? '영어' : '일본어'})`}
              icon="message-circle"
              onPress={() => router.push('/write/chat')}
            />
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Button size="compact" variant="ghost" label="다른 질문 보기" onPress={nextPrompt} />
              <Button
                size="compact"
                variant="ghost"
                label="직접 쓰기"
                onPress={() => router.push('/write/text')}
              />
            </View>
          </View>
        </Card>

        {/* 오늘의 일기 — 카드 하나 안의 리스트 */}
        <View style={{ gap: spacing.md }}>
          <View
            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <AppText variant="heading">오늘의 일기</AppText>
            <Button
              size="compact"
              variant="ghost"
              icon="search"
              label="검색"
              onPress={() => router.push('/search')}
            />
          </View>
          {todayEntries.length === 0 ? (
            <EmptyState
              icon="feather"
              title="아직 적지 않은 하루예요."
              description={'거창하지 않아도 괜찮아요.\n오늘 기억나는 장면 하나만 들려주세요.'}
              actionLabel="AI 친구에게 이야기하기"
              onAction={() => router.push('/write/chat')}
            />
          ) : (
            <Card style={{ paddingVertical: spacing.xs }}>
              {todayEntries.map((entry, i) => (
                <DiaryRow
                  key={entry.id}
                  entry={entry}
                  showDivider={i < todayEntries.length - 1}
                  onPress={() => router.push({ pathname: '/diary/[id]', params: { id: entry.id } })}
                />
              ))}
            </Card>
          )}
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Button
            size="compact"
            variant="ghost"
            icon="bar-chart-2"
            label="학습 통계"
            onPress={() => router.push('/stats')}
          />
          <Button
            size="compact"
            variant="ghost"
            icon="book-open"
            label="단어장"
            onPress={() => router.push('/expressions')}
          />
        </View>
      </View>
      <VersionFooter />
    </Screen>
  );
}
