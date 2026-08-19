import { router } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';

import { SpeakPractice } from '@/components/diary/SpeakPractice';
import { AppIcon } from '@/components/ui/AppIcon';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { PracticeItem, usePracticeQueue } from '@/lib/practiceQueue';
import { speak } from '@/speech/tts';
import { useSettings } from '@/state/useSettings';
import { spacing } from '@/theme/tokens';

/**
 * 다시 말해보기 연습 — 지난 7일 동안 배운 교정 문장을 모아 말하기로 복습한다.
 * (Speak류 앱의 말하기 반복 훈련에서 착안, 점수 압박 없이)
 */
export default function PracticeScreen() {
  const queue = usePracticeQueue();
  const speechRate = useSettings((s) => s.voice.speechRate);
  const [target, setTarget] = useState<PracticeItem | null>(null);
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  if (queue.length === 0) {
    return (
      <Screen>
        <EmptyState
          icon="mic"
          title="아직 연습할 문장이 없어요"
          description={'AI와 대화하며 교정을 받으면\n배운 문장이 여기에 모여요.'}
          actionLabel="AI와 이야기하러 가기"
          onAction={() => router.push('/write/chat')}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={{ gap: spacing.lg }}>
        <AppText variant="bodySmall" color="secondary">
          지난 7일 동안 배운 문장이에요. 소리 내어 말해보면 내 것이 돼요.
        </AppText>

        {queue.map((item) => {
          const done = completed.has(item.sentence);
          return (
            <Card key={item.sentence} style={{ gap: spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
                {done ? (
                  <AppIcon name="check-circle" size={18} color="success" decorative={false} accessibilityLabel="연습 완료" />
                ) : null}
                <AppText variant="correctionSentence" color="accent" style={{ flex: 1 }}>
                  {item.sentence}
                </AppText>
              </View>
              {item.explanationKo ? (
                <AppText variant="caption" color="secondary" numberOfLines={2}>
                  {item.explanationKo}
                </AppText>
              ) : null}
              <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
                <Button
                  size="compact"
                  variant="secondary"
                  icon="volume-2"
                  label="듣기"
                  onPress={() => speak(item.sentence, { language: item.language, rate: speechRate })}
                />
                <Button
                  size="compact"
                  icon="mic"
                  label={done ? '한 번 더 말해보기' : '다시 말해보기'}
                  onPress={() => setTarget(item)}
                />
              </View>
            </Card>
          );
        })}

        {completed.size === queue.length ? (
          <Card variant="soft">
            <AppText variant="bodySmall" color="success">
              오늘의 연습 {queue.length}문장을 모두 마쳤어요.
            </AppText>
          </Card>
        ) : null}
      </View>

      <SpeakPractice
        visible={target !== null}
        targetSentence={target?.sentence ?? ''}
        language={target?.language ?? 'en'}
        speechRate={speechRate}
        onSuccess={() => {
          if (target) setCompleted((prev) => new Set(prev).add(target.sentence));
          setTarget(null);
        }}
        onSkip={() => setTarget(null)}
        onClose={() => setTarget(null)}
      />
    </Screen>
  );
}
