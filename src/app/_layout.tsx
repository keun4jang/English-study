import { Lora_500Medium, Lora_600SemiBold, useFonts } from '@expo-google-fonts/lora';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { useColorScheme, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { appConfig } from '@/config/appConfig';
import { useHydrated } from '@/lib/useHydrated';
import { palette } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

function SplashFallback() {
  // 스토어/폰트 로딩 중 잠깐 보이는 스플래시 (흰 화면 방지) — 시스템 테마 반영
  const scheme = useColorScheme();
  const colors = palette[scheme === 'dark' ? 'dark' : 'light'];
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.background,
        gap: 12,
      }}
    >
      <AppText variant="title" style={{ color: colors.primaryInk }}>
        {appConfig.appName}
      </AppText>
      <AppText variant="caption" color="secondary">
        v{appConfig.version}
      </AppText>
    </View>
  );
}

function RootStack() {
  const { colors, scheme } = useTheme();
  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.textPrimary,
          headerTitleStyle: { fontWeight: '600' },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="write/text" options={{ title: '일기 쓰기' }} />
        <Stack.Screen name="write/chat" options={{ title: 'AI와 이야기하기' }} />
        <Stack.Screen name="write/finalize" options={{ title: '오늘의 일기 완성' }} />
        <Stack.Screen name="diary/[id]" options={{ title: '일기' }} />
        <Stack.Screen name="diary/edit/[id]" options={{ title: '일기 수정' }} />
        <Stack.Screen name="search" options={{ title: '검색' }} />
        <Stack.Screen name="stats" options={{ title: '학습 통계' }} />
        <Stack.Screen name="expressions" options={{ title: '단어장' }} />
        <Stack.Screen name="practice" options={{ title: '다시 말해보기' }} />
        <Stack.Screen name="trash" options={{ title: '휴지통' }} />
        <Stack.Screen name="about" options={{ title: '앱 정보' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const hydrated = useHydrated();
  // 영어 일기용 세리프(Lora)만 번들 — 로딩 실패 시 시스템 폰트로 계속 진행
  const [fontsLoaded, fontError] = useFonts({
    Lora_500Medium,
    Lora_600SemiBold,
  });
  const ready = hydrated && (fontsLoaded || Boolean(fontError));
  return <SafeAreaProvider>{ready ? <RootStack /> : <SplashFallback />}</SafeAreaProvider>;
}
