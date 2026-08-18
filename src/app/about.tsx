import React from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { VersionFooter } from '@/components/ui/VersionFooter';
import { appConfig, getAppEnv } from '@/config/appConfig';
import { spacing } from '@/theme/tokens';

export default function AboutScreen() {
  return (
    <Screen>
      <View style={{ gap: spacing.lg, alignItems: 'center', paddingTop: spacing.xxl }}>
        <AppText style={{ fontSize: 56, lineHeight: 68 }}>📖</AppText>
        <AppText variant="title">{appConfig.appName}</AppText>
        <AppText variant="bodySmall" color="secondary" align="center">
          {appConfig.tagline}
        </AppText>
        <Card style={{ gap: spacing.sm, alignSelf: 'stretch' }}>
          <AppText variant="bodySmall">버전: v{appConfig.version}</AppText>
          <AppText variant="bodySmall">환경: {getAppEnv()}</AppText>
          <AppText variant="bodySmall" color="secondary">
            변경 내역은 프로젝트의 CHANGELOG.md에서 확인할 수 있어요.
          </AppText>
        </Card>
        <Card soft style={{ alignSelf: 'stretch' }}>
          <AppText variant="caption" color="secondary">
            이 앱은 오픈소스 라이브러리로 만들어졌어요. AI 교정 기능 사용 시 텍스트가 AI
            제공자에게 전송될 수 있으며, 자세한 내용은 개인정보 안내를 확인해 주세요.
          </AppText>
        </Card>
      </View>
      <VersionFooter />
    </Screen>
  );
}
