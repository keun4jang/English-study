import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { AccessibilityInfo, Animated, View } from 'react-native';

import { DiaryRow } from '@/components/diary/DiaryRow';
import { AppIcon } from '@/components/ui/AppIcon';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { InstalledNameNotice } from '@/components/ui/InstalledNameNotice';
import { Screen } from '@/components/ui/Screen';
import { UpdateBanner } from '@/components/ui/UpdateBanner';
import { VersionFooter } from '@/components/ui/VersionFooter';
import { diffDays, formatDateKo, todayKey } from '@/lib/dates';
import { useAuth } from '@/state/useAuth';
import { useChat } from '@/state/useChat';
import { selectEntriesByDate, useDiary } from '@/state/useDiary';
import { useSettings } from '@/state/useSettings';
import { spacing } from '@/theme/tokens';

/**
 * 홈 — **오늘 일기를 쓰는 것 하나만** 한다.
 *
 * 예전에는 목표 진행바, 연속 기록, 그날의 기억, 복습 알림, 연습 알림, 학습 통계·단어장
 * 버튼이 전부 여기 있었다. 하나하나는 쓸모가 있었지만 한 화면에 모아 놓으니
 * "지금 뭘 하라는 건지" 알 수 없는 화면이 됐다.
 *
 * 그래서 홈에 남긴 것은 오늘 쓰는 데 필요한 것뿐이다.
 *   1) 오늘이 며칠인지    2) 쓰다 만 게 있는지    3) 무엇에 대해 쓸지    4) 오늘 쓴 것
 * 나머지는 없앤 게 아니라 제자리로 옮겼다 — 되돌아보는 것은 달력, 숫자는 학습 통계,
 * 연습·단어장은 쓰기 탭.
 */

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
  const language = useSettings((s) => s.learning.language);
  const reduceMotion = useSettings((s) => s.design.reduceMotion);

  const conversations = useChat((s) => s.conversations);
  const chatMessages = useChat((s) => s.messages);
  const deleteConversation = useChat((s) => s.deleteConversation);
  const clearDraft = useDiary((s) => s.clearDraft);
  const [discardOpen, setDiscardOpen] = useState(false);

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

  /**
   * 이어서 하기 — **하나만** 띄운다.
   *
   * 쓰다 만 것을 안 보여주면 그대로 잃어버린다. 하지만 초안·대화·연습·복습을 다 띄우면
   * 오늘 쓰는 화면이 아니라 밀린 일 목록이 된다. 그래서 "오늘 쓰던 것"만 남기고
   * (초안 > 진행 중 대화), 연습과 복습은 쓰기 탭으로 옮겼다.
   */
  const resume = draft
    ? {
        icon: 'edit-3' as const,
        label: '작성 중인 일기가 있어요',
        preview: draft.text || null,
        action: '이어서 쓰기',
        go: () => router.push('/write/text'),
        discardTitle: '쓰던 일기를 지울까요?',
        discardDescription: '작성 중이던 내용이 사라져요. 되돌릴 수 없어요.',
        discard: () => clearDraft(),
      }
    : activeConversation
      ? {
          icon: 'message-circle' as const,
          label: '진행 중인 AI 대화가 있어요',
          preview: null,
          action: '이어서 이야기하기',
          go: () => router.push('/write/chat'),
          discardTitle: '이 대화를 지울까요?',
          discardDescription:
            '주고받은 문장과 교정 내용이 함께 사라져요. 되돌릴 수 없어요.\n\n이 대화로 이미 만든 일기가 있다면 그 일기는 그대로 남아요.',
          discard: () => deleteConversation(activeConversation.id),
        }
      : null;

  return (
    <Screen>
      <View style={{ gap: spacing.x20 }}>
        {/* 인사말 — 날짜와 이름만. 연속 기록·목표 같은 숫자는 학습 통계로 옮겼다 */}
        <View style={{ gap: spacing.xs }}>
          <AppText variant="caption" color="secondary">
            {formatDateKo(today)}
          </AppText>
          <AppText variant="display">{user?.nickname ?? '친구'}님, 안녕하세요</AppText>
        </View>

        <UpdateBanner />
        <InstalledNameNotice />

        {resume ? (
          <Card style={{ gap: spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <AppIcon name={resume.icon} size={18} color="accent" />
              <AppText variant="label">{resume.label}</AppText>
            </View>
            {resume.preview ? (
              <AppText variant="bodySmall" color="secondary" numberOfLines={2}>
                {resume.preview}
              </AppText>
            ) : null}
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Button size="compact" variant="secondary" label={resume.action} onPress={resume.go} />
              {/* 안 이어갈 거면 지울 수 있어야 한다. 지울 방법이 없으면 이 카드가 계속 따라다닌다 */}
              <Button
                size="compact"
                variant="ghost"
                label="지우기"
                onPress={() => setDiscardOpen(true)}
              />
            </View>
          </Card>
        ) : null}

        {/* 오늘의 편지 — 이 화면의 주인공 */}
        <Card variant="raised" style={{ gap: spacing.lg }}>
          <AppText variant="label" color="accent">
            오늘의 편지
          </AppText>
          <Animated.View style={{ opacity: promptOpacity }}>
            <AppText variant="prompt">{DAILY_PROMPTS[promptIndex]}</AppText>
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

        {/* 오늘 쓴 것 */}
        <View style={{ gap: spacing.md }}>
          <AppText variant="heading">오늘의 일기</AppText>
          {todayEntries.length === 0 ? (
            <EmptyState
              icon="feather"
              title="아직 적지 않은 하루예요."
              description={'거창하지 않아도 괜찮아요.\n오늘 기억나는 장면 하나만 들려주세요.'}
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
      </View>

      {resume ? (
        <ConfirmDialog
          visible={discardOpen}
          title={resume.discardTitle}
          description={resume.discardDescription}
          confirmLabel="지우기"
          onConfirm={() => {
            resume.discard();
            setDiscardOpen(false);
          }}
          onCancel={() => setDiscardOpen(false)}
        />
      ) : null}

      <VersionFooter />
    </Screen>
  );
}
