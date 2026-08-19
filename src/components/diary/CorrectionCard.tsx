import React, { useState } from 'react';
import { View } from 'react-native';

import { AppIcon } from '@/components/ui/AppIcon';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CorrectionResult, LearningLanguage } from '@/domain/types';
import { speak } from '@/speech/tts';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

interface CorrectionCardProps {
  correction: CorrectionResult;
  language: LearningLanguage;
  onSpeakAgain: () => void;
  onKeepOriginal: () => void;
  onApplyCorrection: () => void;
  onContinue: () => void;
  onSaveExpression: (expression: { expression: string; meaningKo: string; example: string }) => void;
  savedExpressions: Set<string>;
}

/**
 * 교정 카드 — 비난 없이 짧고 친절하게. 정보 밀도를 낮추고
 * 설명은 접어두며, 부가 액션은 더보기로 정리한다.
 */
export function CorrectionCard({
  correction,
  language,
  onSpeakAgain,
  onKeepOriginal,
  onApplyCorrection,
  onContinue,
  onSaveExpression,
  savedExpressions,
}: CorrectionCardProps) {
  const { colors } = useTheme();
  const [explanationOpen, setExplanationOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <Card style={{ gap: spacing.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <AppIcon name="edit-2" size={16} color="accent" />
        <AppText variant="label" color="accent">
          조금 더 자연스럽게
        </AppText>
      </View>

      <View style={{ gap: spacing.xs }}>
        <AppText variant="caption" color="secondary">
          내 문장
        </AppText>
        <AppText variant="body">{correction.original}</AppText>
      </View>

      <View style={{ gap: spacing.xs }}>
        <AppText variant="caption" color="secondary">
          자연스러운 표현
        </AppText>
        <AppText variant="correctionSentence" color="accent">
          {correction.corrected}
        </AppText>
        {correction.readingJa ? (
          <AppText variant="bodySmall" color="secondary">
            {correction.readingJa}
          </AppText>
        ) : null}
      </View>

      {correction.changedParts.length > 0 ? (
        <View style={{ gap: spacing.xs }}>
          {correction.changedParts.map((part, i) => (
            <View
              key={`${part.from}-${i}`}
              accessibilityLabel={`바뀐 표현: ${part.from}에서 ${part.to}로, 이유: ${part.reasonKo}`}
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }}
            >
              <AppIcon name="minus-circle" size={13} color="secondary" />
              <AppText
                variant="bodySmall"
                color="secondary"
                style={{ textDecorationLine: 'line-through' }}
              >
                {part.from}
              </AppText>
              <AppIcon name="arrow-right" size={13} color="secondary" />
              <AppIcon name="plus-circle" size={13} color="success" />
              <AppText
                variant="bodySmall"
                weight="600"
                style={{ textDecorationLine: 'underline' }}
              >
                {part.to}
              </AppText>
              <AppText variant="caption" color="secondary">
                ({part.reasonKo})
              </AppText>
            </View>
          ))}
        </View>
      ) : null}

      {correction.explanationKo ? (
        <View style={{ gap: spacing.sm }}>
          {explanationOpen ? (
            <View
              style={{
                backgroundColor: colors.surfaceSoft,
                borderRadius: radius.md,
                padding: spacing.lg,
              }}
            >
              <AppText variant="bodySmall" color="secondary">
                {correction.explanationKo}
              </AppText>
            </View>
          ) : (
            <AppText variant="bodySmall" color="secondary" numberOfLines={2}>
              {correction.explanationKo}
            </AppText>
          )}
          <Button
            size="compact"
            variant="ghost"
            icon={explanationOpen ? 'chevron-up' : 'help-circle'}
            label={explanationOpen ? '설명 접기' : '왜 이렇게 말해요?'}
            onPress={() => setExplanationOpen((v) => !v)}
          />
        </View>
      ) : null}

      {correction.keyExpressions.length > 0 ? (
        <View style={{ gap: spacing.sm }}>
          {correction.keyExpressions.map((k) => {
            const saved = savedExpressions.has(k.expression);
            return (
              <View
                key={k.expression}
                style={{
                  backgroundColor: colors.surfaceSoft,
                  borderRadius: radius.md,
                  padding: spacing.md,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.sm,
                }}
              >
                <View style={{ flex: 1 }}>
                  <AppText variant="bodySmall" weight="600">
                    {k.expression}
                  </AppText>
                  <AppText variant="caption" color="secondary">
                    {k.meaningKo}
                  </AppText>
                </View>
                <Button
                  size="compact"
                  variant="ghost"
                  icon={saved ? 'check' : 'bookmark'}
                  label={saved ? '저장됨' : '저장'}
                  disabled={saved}
                  onPress={() => onSaveExpression(k)}
                />
              </View>
            );
          })}
        </View>
      ) : null}

      {/* 주요 액션 2개 + 더보기 */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        <Button size="compact" icon="mic" label="다시 말해보기" onPress={onSpeakAgain} />
        <Button
          size="compact"
          variant="secondary"
          icon="volume-1"
          label="천천히 듣기"
          onPress={() => speak(correction.corrected, { language, extraSlow: true })}
        />
        <Button
          size="compact"
          variant="ghost"
          icon="more-horizontal"
          label="더보기"
          onPress={() => setMoreOpen((v) => !v)}
          accessibilityHint="듣기, 적용 등 추가 동작 보기"
        />
      </View>

      {moreOpen ? (
        <View style={{ gap: spacing.sm }}>
          <Button
            size="compact"
            variant="ghost"
            icon="volume-2"
            label="보통 속도로 듣기"
            onPress={() => speak(correction.corrected, { language })}
          />
          <Button size="compact" variant="ghost" icon="check" label="교정문 적용" onPress={onApplyCorrection} />
          <Button size="compact" variant="ghost" icon="corner-up-left" label="원문 유지" onPress={onKeepOriginal} />
          <Button size="compact" variant="ghost" icon="arrow-right" label="그냥 계속하기" onPress={onContinue} />
        </View>
      ) : null}
    </Card>
  );
}
