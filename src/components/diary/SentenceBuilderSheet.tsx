import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';

import { BuilderSelection, buildFrames, composeFromFrame } from '@/ai/korean';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { IconButton } from '@/components/ui/IconButton';
import { LearningLanguage } from '@/domain/types';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

/**
 * 문장 만들기.
 *
 * 번역이 아니라 조립이라서 **막히는 순간이 없다.** 고르는 것만으로 문장이 완성되고,
 * 고른 결과는 화면 아래에 실시간으로 보인다. 아직 못 고른 게 있으면 무엇이 비었는지
 * 말해 준다 — "안 됨"이 아니라 "여기만 고르면 돼요"가 되도록.
 */

interface SentenceBuilderSheetProps {
  visible: boolean;
  language: LearningLanguage;
  onClose: () => void;
  onUse: (text: string) => void;
  onSpeak: (text: string) => void;
}

export function SentenceBuilderSheet({
  visible,
  language,
  onClose,
  onUse,
  onSpeak,
}: SentenceBuilderSheetProps) {
  const { colors } = useTheme();
  const frames = buildFrames();
  const [frameId, setFrameId] = useState<string | null>(null);
  const [selection, setSelection] = useState<BuilderSelection>({});

  const frame = frames.find((f) => f.id === frameId) ?? null;
  // 조립은 사전 조회 몇 번이라 매 렌더 계산해도 싸다. useMemo로 감싸면 frames가 매 렌더
  // 새로 만들어지는 배열이라 React Compiler가 최적화를 통째로 포기한다.
  const sentence = frameId ? (composeFromFrame(frameId, selection, language)[0]?.text ?? null) : null;

  const missing = frame
    ? frame.steps.filter((step) => !step.optional && !selection[step.id]).map((step) => step.labelKo)
    : [];

  const reset = () => {
    setFrameId(null);
    setSelection({});
  };

  const close = () => {
    reset();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <View style={{ flex: 1, backgroundColor: colors.scrim, justifyContent: 'flex-end' }}>
        <View
          style={{
            backgroundColor: colors.background,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            maxHeight: '88%',
            paddingBottom: spacing.xl,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: spacing.lg,
            }}
          >
            <AppText variant="heading">
              {frame ? frame.titleKo : '무슨 이야기를 할까요?'}
            </AppText>
            <IconButton icon="x" variant="ghost" accessibilityLabel="닫기" onPress={close} />
          </View>

          <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.lg }}>
            {!frame ? (
              <View style={{ gap: spacing.sm }}>
                {frames.map((item) => (
                  <Pressable
                    key={item.id}
                    accessibilityRole="button"
                    accessibilityLabel={`${item.titleKo} — 예: ${item.shapeKo}`}
                    onPress={() => setFrameId(item.id)}
                  >
                    <Card style={{ gap: spacing.xs, padding: spacing.lg }}>
                      <AppText variant="bodyStrong">{item.titleKo}</AppText>
                      <AppText variant="caption" color="secondary">
                        예: {item.shapeKo}
                      </AppText>
                    </Card>
                  </Pressable>
                ))}
              </View>
            ) : (
              <>
                {frame.steps.map((step) => (
                  <View key={step.id} style={{ gap: spacing.sm }}>
                    <AppText variant="label">
                      {step.labelKo}
                      {step.optional ? (
                        <AppText variant="caption" color="secondary">
                          {'  '}건너뛰어도 돼요
                        </AppText>
                      ) : null}
                    </AppText>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                      {step.choices.map((choice) => (
                        <Chip
                          key={choice.value}
                          label={choice.ko}
                          selected={selection[step.id] === choice.value}
                          onPress={() =>
                            setSelection((prev) => ({
                              ...prev,
                              // 같은 칩을 다시 누르면 선택이 풀린다
                              [step.id]: prev[step.id] === choice.value ? undefined : choice.value,
                            }))
                          }
                        />
                      ))}
                    </View>
                  </View>
                ))}
                <Button variant="ghost" icon="arrow-left" label="다른 이야기 고르기" onPress={reset} />
              </>
            )}
          </ScrollView>

          {frame ? (
            <View
              style={{
                padding: spacing.lg,
                gap: spacing.sm,
                borderTopWidth: 1,
                borderTopColor: colors.border,
              }}
            >
              {sentence ? (
                <>
                  <AppText variant="correctionSentence">{sentence}</AppText>
                  <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                    <Button
                      icon="corner-down-left"
                      label="이 문장 쓰기"
                      onPress={() => {
                        onUse(sentence);
                        close();
                      }}
                    />
                    <Button
                      variant="ghost"
                      icon="volume-2"
                      label="들어보기"
                      onPress={() => onSpeak(sentence)}
                    />
                  </View>
                </>
              ) : (
                <AppText variant="bodySmall" color="secondary">
                  {missing.length > 0
                    ? `${missing.join(', ')} 를 고르면 문장이 완성돼요.`
                    : '고른 것으로는 아직 문장을 만들 수 없어요.'}
                </AppText>
              )}
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
