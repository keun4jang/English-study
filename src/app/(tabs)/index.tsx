import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { View } from 'react-native';

import { DiaryCard } from '@/components/diary/DiaryCard';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { UpdateBanner } from '@/components/ui/UpdateBanner';
import { VersionFooter } from '@/components/ui/VersionFooter';
import { isMockAI } from '@/ai';
import { calcStreak, diffDays, formatDateKo, todayKey } from '@/lib/dates';
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

  const conversations = useChat((s) => s.conversations);
  const chatMessages = useChat((s) => s.messages);

  const today = todayKey();
  const todayEntries = useMemo(() => selectEntriesByDate(entries, today), [entries, today]);
  // 진행 중인 AI 대화 (뒤로 나갔어도 이어서 할 수 있게)
  const activeConversation = useMemo(
    () =>
      conversations.find(
        (c) =>
          c.status === 'active' &&
          c.localDate === today &&
          chatMessages.some((m) => m.conversationId === c.id && m.role === 'user'),
      ) ?? null,
    [conversations, chatMessages, today],
  );
  const activeConversationPreview = useMemo(() => {
    if (!activeConversation) return '';
    const lastUser = [...chatMessages]
      .reverse()
      .find((m) => m.conversationId === activeConversation.id && m.role === 'user');
    return lastUser?.text ?? '';
  }, [activeConversation, chatMessages]);
  const active = useMemo(() => selectActiveEntries(entries), [entries]);
  const streak = useMemo(
    () => calcStreak(active.map((e) => e.localDate), today),
    [active, today],
  );
  // 오늘의 질문: 날짜 기반으로 선택 (매일 다른 질문)
  const promptIndex = Math.abs(diffDays(today, '2026-01-01')) % DAILY_PROMPTS.length;
  const reviewDue = expressions.filter((e) => e.nextReviewDate <= today).length;

  return (
    <Screen>
      <View style={{ gap: spacing.lg }}>
        <View style={{ gap: spacing.xs }}>
          <AppText variant="caption" color="secondary">
            {formatDateKo(today)}
          </AppText>
          <AppText variant="title">
            {user?.nickname ?? '친구'}님, 안녕하세요 🌷
          </AppText>
          {streak > 0 ? (
            <AppText variant="bodySmall" color="secondary">
              🔥 {streak}일째 이어서 기록하고 있어요
            </AppText>
          ) : null}
          {isMockAI() ? (
            <AppText variant="caption" color="secondary">
              🧪 Mock AI 모드 — 실제 AI 연결 전 체험용 응답이에요
            </AppText>
          ) : null}
        </View>

        <UpdateBanner />

        {activeConversation ? (
          <Card style={{ gap: spacing.sm }}>
            <AppText variant="bodySmall" weight="600">
              💬 진행 중인 AI 대화가 있어요
            </AppText>
            {activeConversationPreview ? (
              <AppText variant="bodySmall" color="secondary" numberOfLines={1}>
                마지막 이야기: “{activeConversationPreview}”
              </AppText>
            ) : null}
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Button small label="이어서 이야기하기" onPress={() => router.push('/write/chat')} />
            </View>
          </Card>
        ) : null}

        <Card soft style={{ gap: spacing.md }}>
          <AppText variant="caption" color="secondary">
            오늘의 질문
          </AppText>
          <AppText variant="subheading">{DAILY_PROMPTS[promptIndex]}</AppText>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Button
              small
              label={`✨ ${language === 'en' ? '영어' : '일본어'}로 이야기하기`}
              onPress={() => router.push('/write/chat')}
            />
            <Button small variant="secondary" label="직접 쓰기" onPress={() => router.push('/write/text')} />
          </View>
        </Card>

        {draft ? (
          <Card style={{ gap: spacing.sm }}>
            <AppText variant="bodySmall" weight="600">
              📝 작성 중인 일기가 있어요
            </AppText>
            <AppText variant="bodySmall" color="secondary" numberOfLines={2}>
              {draft.text || '(내용 없음)'}
            </AppText>
            <Button small variant="secondary" label="이어서 쓰기" onPress={() => router.push('/write/text')} />
          </Card>
        ) : null}

        {reviewDue > 0 ? (
          <Card style={{ gap: spacing.sm }}>
            <AppText variant="bodySmall" weight="600">
              📚 복습할 표현이 {reviewDue}개 있어요
            </AppText>
            <Button small variant="secondary" label="단어장 열기" onPress={() => router.push('/expressions')} />
          </Card>
        ) : null}

        <View style={{ gap: spacing.md }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <AppText variant="heading">오늘의 일기</AppText>
            <Button small variant="ghost" label="🔍 검색" onPress={() => router.push('/search')} />
          </View>
          {todayEntries.length === 0 ? (
            <EmptyState
              emoji="🍃"
              title="아직 오늘의 일기가 없어요"
              description="짧은 한 문장도 좋아요. 편하게 시작해 볼까요?"
              actionLabel="일기 쓰러 가기"
              onAction={() => router.push('/(tabs)/write')}
            />
          ) : (
            todayEntries.map((entry) => (
              <DiaryCard
                key={entry.id}
                entry={entry}
                showDate={false}
                onPress={() => router.push({ pathname: '/diary/[id]', params: { id: entry.id } })}
              />
            ))
          )}
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Button small variant="ghost" label="📊 학습 통계" onPress={() => router.push('/stats')} />
          <Button small variant="ghost" label="📚 단어장" onPress={() => router.push('/expressions')} />
        </View>
      </View>
      <VersionFooter />
    </Screen>
  );
}
