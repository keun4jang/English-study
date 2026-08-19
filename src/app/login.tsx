import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Platform, View } from 'react-native';

import { AppIcon } from '@/components/ui/AppIcon';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { VersionFooter } from '@/components/ui/VersionFooter';
import { appConfig, isSupabaseConfigured } from '@/config/appConfig';
import { useAuth } from '@/state/useAuth';
import { spacing } from '@/theme/tokens';

function notConfigured(providerName: string) {
  const message = `${providerName} 로그인은 Supabase 연결 후 사용할 수 있어요. README의 설정 가이드를 참고해 주세요. 지금은 Demo 모드로 시작할 수 있어요.`;
  if (Platform.OS === 'web') {
    alert(message);
  } else {
    Alert.alert('설정 필요', message);
  }
}

export default function Login() {
  const signInDemo = useAuth((s) => s.signInDemo);
  const [nickname, setNickname] = useState('');
  const supabaseReady = isSupabaseConfigured();

  const startDemo = () => {
    signInDemo(nickname || '데모 사용자');
    router.replace('/(tabs)');
  };

  return (
    <Screen>
      <View style={{ gap: spacing.xl, paddingTop: spacing.xxxl, flexGrow: 1 }}>
        <View style={{ alignItems: 'center', gap: spacing.sm }}>
          <AppIcon name="mail" size={40} color="accent" />
          <AppText variant="title">{appConfig.appName}</AppText>
          <AppText variant="bodySmall" color="secondary" align="center">
            {appConfig.tagline}
          </AppText>
        </View>

        <Card style={{ gap: spacing.md }}>
          <Button
            label="Google로 계속하기"
            variant="secondary"
            onPress={() => notConfigured('Google')}
            accessibilityHint={supabaseReady ? undefined : 'Supabase 설정이 필요합니다'}
          />
          <Button
            label="Apple로 계속하기"
            variant="secondary"
            onPress={() => notConfigured('Apple')}
          />
          <Button
            label="이메일로 계속하기"
            variant="secondary"
            onPress={() => notConfigured('이메일')}
          />
          {!supabaseReady ? (
            <AppText variant="caption" color="secondary" align="center">
              소셜/이메일 로그인은 온라인 계정 연결 준비가 끝나면 열려요
            </AppText>
          ) : null}
        </Card>

        <Card soft style={{ gap: spacing.md }}>
          <AppText variant="subheading">Demo 모드로 시작</AppText>
          <AppText variant="bodySmall" color="secondary">
            계정 없이 이 기기에만 저장되는 체험 모드예요. AI는 Mock으로 동작해요.
          </AppText>
          <TextField
            placeholder="닉네임 (선택)"
            value={nickname}
            onChangeText={setNickname}
            maxLength={20}
          />
          <Button label="Demo 모드로 시작하기" onPress={startDemo} />
        </Card>
      </View>
      <VersionFooter />
    </Screen>
  );
}
