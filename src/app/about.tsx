import React from 'react';
import { Linking, View } from 'react-native';

import { AppIcon } from '@/components/ui/AppIcon';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { appConfig, getAppEnv } from '@/config/appConfig';
import { spacing } from '@/theme/tokens';

export default function AboutScreen() {
  return (
    <Screen>
      <View style={{ gap: spacing.lg, alignItems: 'center', paddingTop: spacing.xxl }}>
        <AppIcon name="mail" size={48} color="accent" />
        <AppText variant="title">{appConfig.appName}</AppText>
        <AppText variant="bodySmall" color="secondary" align="center">
          {appConfig.tagline}
        </AppText>
        <Card style={{ gap: spacing.sm, alignSelf: 'stretch' }}>
          <AppText variant="bodySmall">버전 v{appConfig.version}</AppText>
          {/* 환경 표기는 개발 빌드에서만 — 일반 사용자에게는 의미 없는 값이다 */}
          {getAppEnv() !== 'production' ? (
            <AppText variant="caption" color="secondary">
              환경: {getAppEnv()}
            </AppText>
          ) : null}
          <AppText variant="bodySmall" color="secondary">
            무엇이 바뀌었는지는 저장소의 변경 기록에서 볼 수 있어요.
          </AppText>
          <Button
            size="compact"
            variant="ghost"
            icon="external-link"
            label="변경 기록 보기"
            onPress={() => Linking.openURL(`${appConfig.repositoryUrl}/blob/main/CHANGELOG.md`)}
          />
        </Card>
        <Card soft style={{ alignSelf: 'stretch' }}>
          <AppText variant="caption" color="secondary">
            이 앱은 무료 오픈소스 라이브러리로 만들어졌어요. 교정과 대화는 기기 안에서
            처리되고, 쓴 내용은 밖으로 나가지 않아요.
          </AppText>
        </Card>
      </View>
    </Screen>
  );
}
