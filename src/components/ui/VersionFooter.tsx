import React from 'react';
import { View } from 'react-native';

import { appConfig } from '@/config/appConfig';
import { spacing } from '@/theme/tokens';
import { AppText } from './AppText';

/** 앱 최하단의 작은 버전 표시 — "D-log v0.1.0" */
export function VersionFooter() {
  return (
    <View style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
      <AppText variant="caption" color="secondary">
        {appConfig.appName} v{appConfig.version}
      </AppText>
    </View>
  );
}
