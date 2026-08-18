import React from 'react';
import { View } from 'react-native';

import { CorrectionResult, LearningLanguage } from '@/domain/types';
import { speak } from '@/speech/tts';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

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
 * 교정 카드 — 비난 없이 짧고 친절하게.
 * "내가 말한 문장 / 자연스러운 문장 / 설명 / 핵심 표현" 구조.
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
  const isMinor = correction.severity === 'minor';

  return (
    <Card soft style={{ gap: spacing.md }}>
      <AppText variant="bodySmall" weight="700" color="accent">
        {isMinor ? '💡 조금 더 자연스럽게' : '✏️ 이렇게 말하면 자연스러워요'}
      </AppText>

      <View style={{ gap: spacing.xs }}>
        <AppText variant="caption" color="secondary">
          내가 말한 문장
        </AppText>
        <AppText variant="body">{correction.original}</AppText>
      </View>

      <View style={{ gap: spacing.xs }}>
        <AppText variant="caption" color="secondary">
          자연스러운 문장
        </AppText>
        <AppText variant="body" weight="600" style={{ color: colors.primary }}>
          {correction.corrected}
        </AppText>
        {correction.readingJa ? (
          <AppText variant="bodySmall" color="secondary">
            {correction.readingJa}
          </AppText>
        ) : null}
      </View>

      {correction.explanationKo ? (
        <AppText variant="bodySmall" color="secondary">
          {correction.explanationKo}
        </AppText>
      ) : null}

      {correction.keyExpressions.length > 0 ? (
        <View style={{ gap: spacing.sm }}>
          <AppText variant="caption" color="secondary">
            핵심 표현
          </AppText>
          {correction.keyExpressions.map((k) => {
            const saved = savedExpressions.has(k.expression);
            return (
              <View
                key={k.expression}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
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
                  small
                  variant="secondary"
                  label={saved ? '저장됨 ✓' : '단어장 저장'}
                  disabled={saved}
                  onPress={() => onSaveExpression(k)}
                />
              </View>
            );
          })}
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        <Button small label="다시 말하기" onPress={onSpeakAgain} />
        <Button
          small
          variant="secondary"
          label="천천히 듣기"
          onPress={() => speak(correction.corrected, { language, extraSlow: true })}
        />
        <Button small variant="secondary" label="교정문 적용" onPress={onApplyCorrection} />
        <Button small variant="ghost" label="원문 유지" onPress={onKeepOriginal} />
        <Button small variant="ghost" label="그냥 계속하기" onPress={onContinue} />
      </View>
    </Card>
  );
}
