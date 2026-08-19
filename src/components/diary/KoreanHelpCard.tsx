import React from 'react';
import { View } from 'react-native';

import { KoHelp } from '@/ai/korean';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { IconButton } from '@/components/ui/IconButton';
import { LearningLanguage } from '@/domain/types';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

/**
 * 한글로 쓴 문장에 대한 예시 카드.
 *
 * 이 카드가 지켜야 할 것 하나: **못 만든 문장을 만든 척하지 않는다.** 사용자는 여기 나온
 * 영어가 맞는지 판단할 수 없는 상태로 이걸 읽는다. 그래서 사전이 못 만들면 빈손이라고
 * 말하고 '문장 만들기'로 보낸다.
 */

interface KoreanHelpCardProps {
  help: KoHelp;
  language: LearningLanguage;
  /** 예시를 입력창에 넣는다 */
  onUse: (text: string) => void;
  /** 예시를 소리로 들려준다 */
  onSpeak: (text: string) => void;
  /** 문장 만들기를 연다 */
  onOpenBuilder: () => void;
  onDismiss: () => void;
}

export function KoreanHelpCard({
  help,
  language,
  onUse,
  onSpeak,
  onOpenBuilder,
  onDismiss,
}: KoreanHelpCardProps) {
  const { colors } = useTheme();
  const languageName = language === 'en' ? '영어' : '일본어';

  return (
    <Card variant="soft" style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <AppText variant="label" color="accent">
          {help.needsBuilder ? '이 문장은 아직 예시가 없어요' : `${languageName}로는 이렇게 말해요`}
        </AppText>
        <IconButton icon="x" variant="ghost" accessibilityLabel="도움말 닫기" onPress={onDismiss} />
      </View>

      {help.suggestions.map((suggestion, index) => (
        <View
          key={suggestion.text}
          style={{
            gap: spacing.sm,
            paddingBottom: spacing.md,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <AppText variant="correctionSentence">{suggestion.text}</AppText>
          {suggestion.unknown.length > 0 ? (
            <AppText variant="caption" color="warning">
              {suggestion.unknown.map((item) => `[${item.word}]`).join(' ')}는 사전에 없는 말이에요. 이
              부분만 직접 바꿔 주세요
              {suggestion.unknown.some((item) => item.romanized)
                ? ` — 지역·가게·사람 이름이라면 ${suggestion.unknown
                    .filter((item) => item.romanized)
                    .map((item) => `${item.word} → ${item.romanized}`)
                    .join(', ')} 처럼 소리 나는 대로 적으면 돼요`
                : ''}
              .
            </AppText>
          ) : null}
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Button
              size="compact"
              // 첫 예시만 강조한다. 큰 노란 버튼이 여러 개면 무엇을 고르라는 화면인지 흐려진다.
              variant={index === 0 ? 'primary' : 'secondary'}
              icon="corner-down-left"
              label="이 문장 쓰기"
              onPress={() => onUse(suggestion.text)}
            />
            <Button
              size="compact"
              variant="ghost"
              icon="volume-2"
              label="들어보기"
              onPress={() => onSpeak(suggestion.text)}
            />
          </View>
        </View>
      ))}

      {help.needsBuilder ? (
        <View style={{ gap: spacing.sm }}>
          <AppText variant="bodySmall" color="secondary">
            이 앱의 예시는 기기 안에 담긴 사전으로 만들어요. 인터넷 번역기를 쓰지 않아서 무료이고
            비행기 안에서도 되지만, 대신 아직 모르는 문장이 있어요. 대신 골라서 만들어 볼까요?
          </AppText>
          {help.words.length > 0 ? (
            <AppText variant="caption" color="secondary">
              아는 단어: {help.words.map((word) => `${word.ko} = ${word.target}`).join(' · ')}
            </AppText>
          ) : null}
          {help.nameHints.length > 0 ? (
            <AppText variant="caption" color="secondary">
              지역·가게·사람 이름이라면 소리 나는 대로 적으면 돼요:{' '}
              {help.nameHints.map((hint) => `${hint.ko} → ${hint.romanized}`).join(' · ')}
            </AppText>
          ) : null}
        </View>
      ) : null}

      <Button
        variant={help.needsBuilder ? 'primary' : 'secondary'}
        icon="grid"
        label="골라서 문장 만들기"
        onPress={onOpenBuilder}
      />
    </Card>
  );
}
