import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, Animated, Platform, View } from 'react-native';

import { AppIcon } from '@/components/ui/AppIcon';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { DiaryBodyText, DiaryPaper, DiaryTitleText } from '@/components/ui/DiaryPaper';
import { EmotionPicker } from '@/components/ui/EmotionPicker';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { CorrectionResult, Emotion } from '@/domain/types';
import { useAuth } from '@/state/useAuth';
import { useChat } from '@/state/useChat';
import { useDiary } from '@/state/useDiary';
import { useFinalize } from '@/state/useFinalize';
import { useSettings } from '@/state/useSettings';
import { spacing } from '@/theme/tokens';

type VersionChoice = 'simple' | 'natural' | 'original' | 'custom';

const VERSION_OPTIONS: { value: VersionChoice; label: string }[] = [
  { value: 'natural', label: '자연스러운 버전' },
  { value: 'simple', label: '쉬운 버전' },
  { value: 'original', label: '내 원문 그대로' },
  { value: 'custom', label: '직접 수정' },
];

/**
 * 최종 일기 미리보기 및 저장 — "한 장의 완성된 종이 일기".
 * AI가 만든 문장은 반드시 사용자 승인 후 저장되며,
 * 저장 전에는 대화가 잠기지 않아 뒤로 가서 이어갈 수 있다.
 */
export default function FinalizeScreen() {
  const { result, conversationId, language, originalText, clear } = useFinalize();
  const user = useAuth((s) => s.user);
  const createEntry = useDiary((s) => s.createEntry);
  const finishConversation = useChat((s) => s.finishConversation);
  const allMessages = useChat((s) => s.messages);
  const reduceMotion = useSettings((s) => s.design.reduceMotion);
  const hapticsEnabled = useSettings((s) => s.design.hapticsEnabled);

  const [choice, setChoice] = useState<VersionChoice>('natural');
  const [title, setTitle] = useState(result?.titleCandidates[0] ?? '');
  const [customText, setCustomText] = useState(result?.naturalVersion ?? '');
  const [emotion, setEmotion] = useState<Emotion>('calm');
  const [correctionsOpen, setCorrectionsOpen] = useState(false);

  // 완성 모션: 종이가 살며시 나타난다 (300~400ms, Reduce Motion이면 즉시)
  const [paperOpacity] = useState(() => new Animated.Value(0));
  const [paperScale] = useState(() => new Animated.Value(0.98));
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((sysReduce) => {
      if (reduceMotion || sysReduce) {
        paperOpacity.setValue(1);
        paperScale.setValue(1);
        return;
      }
      Animated.parallel([
        Animated.timing(paperOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(paperScale, { toValue: 1, duration: 350, useNativeDriver: true }),
      ]).start();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 이 대화의 교정 모아보기 ("대화 끝난 후" 교정 타이밍 지원)
  const corrections = useMemo<CorrectionResult[]>(() => {
    if (!conversationId) return [];
    return allMessages
      .filter((m) => m.conversationId === conversationId && m.correction)
      .map((m) => m.correction!)
      .filter((c) => c.severity !== 'correct');
  }, [allMessages, conversationId]);

  if (!result || !user) {
    return (
      <Screen>
        <Card style={{ gap: spacing.md }}>
          <AppText variant="body">완성할 대화가 없어요. AI 대화를 먼저 진행해 주세요.</AppText>
          <Button label="돌아가기" onPress={() => router.back()} />
        </Card>
      </Screen>
    );
  }

  const textByChoice: Record<VersionChoice, string> = {
    simple: result.simpleVersion,
    natural: result.naturalVersion,
    original: originalText,
    custom: customText,
  };
  const finalText = textByChoice[choice];

  const save = () => {
    const entry = createEntry({
      ownerId: user.id,
      title: title.trim(),
      originalText,
      correctedText: result.naturalVersion,
      finalText,
      translationKo: result.translationKo,
      language,
      emotion,
      inputMethod: 'ai-chat',
      conversationId,
    });
    // 저장이 완료된 이 시점에 대화를 마무리한다
    if (conversationId) finishConversation(conversationId);
    if (hapticsEnabled && Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    clear();
    router.replace({ pathname: '/diary/[id]', params: { id: entry.id } });
  };

  return (
    <Screen>
      <View style={{ gap: spacing.x20 }}>
        <AppText variant="bodySmall" color="secondary">
          {result.encouragementKo}
        </AppText>

        {/* 제목 후보 — 칩으로 통일 */}
        <View style={{ gap: spacing.sm }}>
          <AppText variant="label">제목</AppText>
          <TextField placeholder="제목을 입력하세요" value={title} onChangeText={setTitle} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {result.titleCandidates.map((t) => (
              <Chip key={t} label={t} selected={title === t} onPress={() => setTitle(t)} />
            ))}
          </View>
        </View>

        {/* 버전 선택 */}
        <View style={{ gap: spacing.sm }}>
          <AppText variant="label">어떤 버전으로 저장할까요?</AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {VERSION_OPTIONS.map((o) => (
              <Chip
                key={o.value}
                label={o.label}
                selected={choice === o.value}
                onPress={() => setChoice(o.value)}
              />
            ))}
          </View>
        </View>

        {/* 완성된 종이 일기 */}
        {choice === 'custom' ? (
          <TextField
            value={customText}
            onChangeText={setCustomText}
            multiline
            style={{ minHeight: 160, textAlignVertical: 'top' }}
          />
        ) : (
          <Animated.View style={{ opacity: paperOpacity, transform: [{ scale: paperScale }] }}>
            <DiaryPaper>
              <View style={{ gap: spacing.md }}>
                {title.trim() ? <DiaryTitleText language={language}>{title.trim()}</DiaryTitleText> : null}
                <DiaryBodyText language={language}>{finalText || '(내용 없음)'}</DiaryBodyText>
              </View>
            </DiaryPaper>
          </Animated.View>
        )}

        {result.translationKo ? (
          <Card variant="soft" style={{ gap: spacing.xs }}>
            <AppText variant="caption" color="secondary">
              한국어 뜻
            </AppText>
            <AppText variant="bodySmall" color="secondary">
              {result.translationKo}
            </AppText>
          </Card>
        ) : null}

        {/* 오늘의 교정 모아보기 */}
        {corrections.length > 0 ? (
          <Card style={{ gap: spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <AppIcon name="edit-2" size={16} color="accent" />
              <AppText variant="label">오늘의 교정 모아보기 ({corrections.length})</AppText>
            </View>
            {correctionsOpen ? (
              <View style={{ gap: spacing.md }}>
                {corrections.map((c, i) => (
                  <View key={i} style={{ gap: 2 }}>
                    <AppText
                      variant="bodySmall"
                      color="secondary"
                      style={{ textDecorationLine: 'line-through' }}
                    >
                      {c.original}
                    </AppText>
                    <AppText variant="bodySmall" weight="600" color="accent">
                      {c.corrected}
                    </AppText>
                    {c.explanationKo ? (
                      <AppText variant="caption" color="secondary">
                        {c.explanationKo}
                      </AppText>
                    ) : null}
                  </View>
                ))}
              </View>
            ) : null}
            <Button
              size="compact"
              variant="ghost"
              icon={correctionsOpen ? 'chevron-up' : 'chevron-down'}
              label={correctionsOpen ? '접기' : '펼쳐 보기'}
              onPress={() => setCorrectionsOpen((v) => !v)}
            />
          </Card>
        ) : null}

        {result.practiceSentences.length > 0 ? (
          <Card variant="soft" style={{ gap: spacing.sm }}>
            <AppText variant="label">다음에 연습해 볼 문장</AppText>
            {result.practiceSentences.map((s) => (
              <AppText key={s} variant="bodySmall" color="secondary">
                · {s}
              </AppText>
            ))}
          </Card>
        ) : null}

        <View style={{ gap: spacing.sm }}>
          <AppText variant="label">오늘의 감정</AppText>
          <EmotionPicker value={emotion} onChange={setEmotion} />
        </View>

        <Button size="large" icon="check" label="일기 저장하기" onPress={save} disabled={!finalText.trim()} />
        <AppText variant="caption" color="secondary" align="center">
          저장된 일기는 기본으로 비공개예요
        </AppText>
      </View>
    </Screen>
  );
}
