import React, { useCallback, useEffect, useState } from 'react';
import { Linking, Platform, View } from 'react-native';

import { applyWebUpdate, checkForUpdate, UpdateCheckResult } from '@/lib/updates';
import { spacing } from '@/theme/tokens';
import { AppText } from './AppText';
import { Button } from './Button';
import { Card } from './Card';

/**
 * 새 버전이 있으면 "업데이트 해야 해요" 배너를 띄운다.
 * - Web/PWA: 버튼 한 번으로 재설치 없이 즉시 업데이트 (서비스 워커 갱신 + 새로고침)
 * - Android APK: 다운로드 링크로 안내 (apkUrl이 배포된 경우)
 */
export function UpdateBanner() {
  const [result, setResult] = useState<UpdateCheckResult | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    checkForUpdate().then((r) => {
      if (!cancelled) setResult(r);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const apply = useCallback(async () => {
    if (!result?.latest) return;
    if (Platform.OS === 'web') {
      setApplying(true);
      await applyWebUpdate();
    } else if (result.latest.apkUrl) {
      Linking.openURL(result.latest.apkUrl).catch(() => {});
    }
  }, [result]);

  if (dismissed || result?.status !== 'update-available' || !result.latest) return null;

  const isWeb = Platform.OS === 'web';
  const hasApk = Boolean(result.latest.apkUrl);

  return (
    <Card soft style={{ gap: spacing.sm }}>
      <AppText variant="bodySmall" weight="700" color="accent">
        새 버전 v{result.latest.version}이(가) 준비됐어요 — 업데이트가 필요해요!
      </AppText>
      {result.latest.noteKo ? (
        <AppText variant="caption" color="secondary">
          {result.latest.noteKo}
        </AppText>
      ) : null}
      <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
        {isWeb ? (
          <Button
            small
            label={applying ? '업데이트 중…' : '지금 업데이트'}
            loading={applying}
            onPress={apply}
            accessibilityHint="재설치 없이 새 버전으로 갱신됩니다"
          />
        ) : hasApk ? (
          <Button small label="새 버전 받기" onPress={apply} />
        ) : (
          <AppText variant="caption" color="secondary">
            새 APK를 받아 설치해 주세요 (기존 데이터는 유지돼요)
          </AppText>
        )}
        <Button small variant="ghost" label="나중에" onPress={() => setDismissed(true)} />
      </View>
    </Card>
  );
}
