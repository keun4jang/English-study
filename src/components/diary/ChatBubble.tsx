import React from 'react';
import { Pressable, View } from 'react-native';

import { ChatMessage, LearningLanguage, SpeechRate } from '@/domain/types';
import { speak } from '@/speech/tts';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import { AppText } from '@/components/ui/AppText';

interface ChatBubbleProps {
  message: ChatMessage;
  language: LearningLanguage;
  speechRate: SpeechRate;
  showTranslation: boolean;
}

export function ChatBubble({ message, language, speechRate, showTranslation }: ChatBubbleProps) {
  const { colors } = useTheme();
  const isUser = message.role === 'user';

  return (
    <View
      style={{
        alignSelf: isUser ? 'flex-end' : 'flex-start',
        maxWidth: '85%',
        gap: spacing.xs,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={isUser ? `내 메시지: ${message.text}` : `AI 메시지: ${message.text}. 눌러서 듣기`}
        onPress={() => speak(message.text, { language, rate: speechRate })}
        style={{
          backgroundColor: isUser ? colors.primary : colors.surface,
          borderRadius: radius.lg,
          borderBottomRightRadius: isUser ? radius.sm : radius.lg,
          borderBottomLeftRadius: isUser ? radius.lg : radius.sm,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
          borderWidth: isUser ? 0 : 1,
          borderColor: colors.border,
        }}
      >
        <AppText variant="body" style={{ color: isUser ? colors.textOnPrimary : colors.textPrimary }}>
          {message.text}
        </AppText>
        {!isUser && showTranslation && message.translationKo ? (
          <AppText variant="bodySmall" color="secondary" style={{ marginTop: spacing.xs }}>
            {message.translationKo}
          </AppText>
        ) : null}
      </Pressable>
      {!isUser ? (
        <AppText variant="caption" color="secondary">
          🔊 눌러서 듣기
        </AppText>
      ) : null}
    </View>
  );
}
