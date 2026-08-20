import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, View } from 'react-native';

import { AppIcon } from '@/components/ui/AppIcon';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { VersionFooter } from '@/components/ui/VersionFooter';
import { usePracticeQueue } from '@/lib/practiceQueue';
import { todayKey } from '@/lib/dates';
import { useExpressions } from '@/state/useExpressions';
import { useSettings } from '@/state/useSettings';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

interface ModeCardProps {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  description: string;
  onPress: () => void;
}

function ModeCard({ icon, title, description, onPress }: ModeCardProps) {
  const { colors } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress}>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: radius.md,
            backgroundColor: colors.primarySoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AppIcon name={icon} size={20} color="accent" />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="subheading">{title}</AppText>
          <AppText variant="bodySmall" color="secondary">
            {description}
          </AppText>
        </View>
        <AppIcon name="chevron-right" size={18} color="secondary" />
      </Card>
    </Pressable>
  );
}

export default function WriteTab() {
  const language = useSettings((s) => s.learning.language);
  const langName = language === 'en' ? '영어' : '일본어';

  // 복습·연습 알림은 홈에서 옮겨 왔다. 홈은 오늘 쓰는 화면이고, 이건 "무엇을 할까"의 화면이다.
  const expressions = useExpressions((s) => s.expressions);
  const today = todayKey();
  const reviewDue = expressions.filter((e) => e.nextReviewDate <= today).length;
  const practiceQueue = usePracticeQueue();

  return (
    <Screen>
      <View style={{ gap: spacing.lg, paddingTop: spacing.md }}>
        <AppText variant="title">오늘은 어떻게 기록할까요?</AppText>
        <ModeCard
          icon="message-circle"
          title={`AI와 ${langName}로 이야기하기`}
          description="AI 친구와 대화하면 마지막에 일기로 완성돼요. 말하기 또는 타이핑 모두 가능해요."
          onPress={() => router.push('/write/chat')}
        />
        <ModeCard
          icon="edit-3"
          title="직접 일기 쓰기"
          description={`${langName}로 자유롭게 써 보세요. 길거나 짧아도 괜찮아요.`}
          onPress={() => router.push('/write/text')}
        />
        <ModeCard
          icon="mic"
          title="다시 말해보기"
          description={
            practiceQueue.length > 0
              ? `배운 문장 ${practiceQueue.length}개를 소리 내어 연습해요.`
              : '교정받은 문장을 소리 내어 연습해요.'
          }
          onPress={() => router.push('/practice')}
        />
        <ModeCard
          icon="book-open"
          title="단어장 복습하기"
          description={
            reviewDue > 0
              ? `오늘 복습할 표현이 ${reviewDue}개 있어요.`
              : '저장한 표현을 카드로 복습해요.'
          }
          onPress={() => router.push('/expressions')}
        />
      </View>
      <VersionFooter />
    </Screen>
  );
}
