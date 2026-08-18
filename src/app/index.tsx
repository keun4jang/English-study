import { Redirect } from 'expo-router';
import React from 'react';

import { useAuth } from '@/state/useAuth';
import { useSettings } from '@/state/useSettings';

/** 진입 분기: 온보딩 → 로그인 → 메인 탭 */
export default function Index() {
  const onboardingCompleted = useSettings((s) => s.onboardingCompleted);
  const user = useAuth((s) => s.user);

  if (!onboardingCompleted) return <Redirect href="/onboarding" />;
  if (!user) return <Redirect href="/login" />;
  return <Redirect href="/(tabs)" />;
}
