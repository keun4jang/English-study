import * as Clipboard from 'expo-clipboard';
import React, { useState } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { VersionFooter } from '@/components/ui/VersionFooter';
import { useAuth } from '@/state/useAuth';
import { spacing } from '@/theme/tokens';

/**
 * 친구 탭 — Phase 1에서는 구조(친구 코드)만 제공한다.
 * 친구 요청/공유/댓글은 Supabase 연결(Phase 3)에서 활성화되며,
 * 데이터 구조(RLS 포함)는 supabase/migrations에 이미 준비되어 있다.
 */
export default function FriendsTab() {
  const user = useAuth((s) => s.user);
  const [copied, setCopied] = useState(false);

  const copyCode = async () => {
    if (!user) return;
    await Clipboard.setStringAsync(user.friendCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Screen>
      <View style={{ gap: spacing.lg, flex: 1 }}>
        <Card style={{ gap: spacing.sm, alignItems: 'center' }}>
          <AppText variant="caption" color="secondary">
            나의 친구 코드
          </AppText>
          <AppText variant="title">{user?.friendCode ?? '—'}</AppText>
          <Button
            small
            variant="secondary"
            icon={copied ? 'check' : 'copy'}
            label={copied ? '복사됨' : '코드 복사하기'}
            onPress={copyCode}
          />
          <AppText variant="caption" color="secondary" align="center">
            친구에게 코드를 알려주면 서로의 일기를 공유할 수 있어요
          </AppText>
        </Card>

        <EmptyState
          fill
          icon="users"
          title="친구 기능은 준비 중이에요"
          description={
            '친구 요청과 댓글은 온라인 계정을 연결해야 열려요.\n그때도 내가 고른 일기만, 내가 고른 친구에게만 갑니다.\n\n지금도 일기 하나를 골라 보낼 수는 있어요 —\n일기를 열고 더보기 → 일기 공유하기를 누르면 됩니다.'
          }
        />
      </View>
      <VersionFooter />
    </Screen>
  );
}
