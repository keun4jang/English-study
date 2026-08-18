import React from 'react';
import { Pressable, View } from 'react-native';

import { AppIcon } from '@/components/ui/AppIcon';
import { AppText } from '@/components/ui/AppText';
import { ChatMessage, LearningLanguage, SpeechRate } from '@/domain/types';
import { speak } from '@/speech/tts';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

interface ChatBubbleProps {
  message: ChatMessage;
  language: LearningLanguage;
  speechRate: SpeechRate;
  showTranslation: boolean;
}

/** 채팅 말풍선 — 꼬리 삼각형 없이 화자 방향 모서리만 6으로 줄인다 */
export function ChatBubble({ message, language, speechRate, showTranslation }: ChatBubbleProps) {
  const { colors } = useTheme();
  const isUser = message.role === 'user';

  return (
    <View
      style={{
        alignSelf: isUser ? 'flex-end' : 'flex-start',
        maxWidth: isUser ? '82%' : '88%',
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={isUser ? `내 메시지: ${message.text}` : `AI 메시지: ${message.text}`}
        accessibilityHint="눌러서 음성으로 듣기"
        onPress={() => speak(message.text, { language, rate: speechRate })}
        style={({ pressed }) => ({
          backgroundColor: isUser ? colors.primary : colors.surface,
          borderRadius: radius.bubble,
          borderBottomRightRadius: isUser ? 6 : radius.bubble,
          borderBottomLeftRadius: isUser ? radius.bubble : 6,
          paddingHorizontal: spacing.lg,
          paddingVertical: isUser ? spacing.md : 13,
          borderWidth: isUser ? 0 : 1,
          borderColor: colors.border,
          opacity: pressed ? 0.9 : 1,
        })}
      >
        <AppText variant="body" style={{ color: isUser ? colors.onPrimary : colors.textPrimary }}>
          {message.text}
        </AppText>
        {!isUser && showTranslation && message.translationKo ? (
          <AppText variant="bodySmall" color="secondary" style={{ marginTop: spacing.xs }}>
            {message.translationKo}
          </AppText>
        ) : null}
        {!isUser ? (
          <View style={{ alignSelf: 'flex-end', marginTop: spacing.xs }}>
            <AppIcon name="volume-2" size={14} color="secondary" />
          </View>
        ) : null}
      </Pressable>
    </View>
  );
}
