import { router } from 'expo-router';
import React from 'react';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { VersionFooter } from '@/components/ui/VersionFooter';
import { useSettings } from '@/state/useSettings';
import { spacing } from '@/theme/tokens';

interface ModeCardProps {
  emoji: string;
  title: string;
  description: string;
  onPress: () => void;
}

function ModeCard({ emoji, title, description, onPress }: ModeCardProps) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress}>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
        <AppText style={{ fontSize: 32, lineHeight: 40 }} accessibilityElementsHidden>
          {emoji}
        </AppText>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="subheading">{title}</AppText>
          <AppText variant="bodySmall" color="secondary">
            {description}
          </AppText>
        </View>
      </Card>
    </Pressable>
  );
}

export default function WriteTab() {
  const language = useSettings((s) => s.learning.language);
  const langName = language === 'en' ? '영어' : '일본어';

  return (
    <Screen>
      <View style={{ gap: spacing.lg, paddingTop: spacing.md }}>
        <AppText variant="title">오늘은 어떻게 기록할까요?</AppText>
        <ModeCard
          emoji="💬"
          title={`AI와 ${langName}로 이야기하기`}
          description="AI 친구와 대화하면 마지막에 일기로 완성돼요. 말하기 또는 타이핑 모두 가능해요."
          onPress={() => router.push('/write/chat')}
        />
        <ModeCard
          emoji="✍️"
          title="직접 일기 쓰기"
          description={`${langName}로 자유롭게 써 보세요. 길거나 짧아도 괜찮아요.`}
          onPress={() => router.push('/write/text')}
        />
        <ModeCard
          emoji="📚"
          title="단어장 복습하기"
          description="저장한 표현을 카드로 복습해요."
          onPress={() => router.push('/expressions')}
        />
      </View>
      <VersionFooter />
    </Screen>
  );
}
