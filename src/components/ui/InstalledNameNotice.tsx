import React, { useState } from 'react';
import { Platform, View } from 'react-native';

import { spacing } from '@/theme/tokens';
import { AppText } from './AppText';
import { Button } from './Button';
import { Card } from './Card';

/**
 * 홈 화면에 박힌 옛 이름·아이콘 안내.
 *
 * PWA를 설치하면 폰이 그 시점의 앱 이름과 아이콘을 복사해 둔다. 앱을 업데이트해도
 * 홈 화면 라벨은 그대로인 경우가 많고, iOS는 아예 바뀌지 않는다. 서버에서 고칠 수 있는
 * 문제가 아니라서, 앱이 직접 알려 주고 방법을 알려 준다.
 *
 * 설치해서 쓰는 사람에게만, 한 번 닫으면 다시 뜨지 않는다.
 */

const DISMISS_KEY = 'dlog-renamed-notice-dismissed';

/** 홈 화면에서 실행 중인지 (브라우저 탭이면 이 안내가 필요 없다) */
function isInstalledApp(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches;
  // iOS 사파리는 display-mode 대신 navigator.standalone을 쓴다
  const iosStandalone = (window.navigator as { standalone?: boolean }).standalone === true;
  return Boolean(standalone || iosStandalone);
}

function readDismissed(): boolean {
  try {
    return window.localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    // 시크릿 모드 등에서 localStorage가 막히면 안내를 띄우는 쪽이 낫다
    return false;
  }
}

export function InstalledNameNotice() {
  // 첫 렌더에서 한 번만 판단한다 (설치 여부와 닫음 여부는 렌더 중에 바뀌지 않는다)
  const [visible, setVisible] = useState(() => isInstalledApp() && !readDismissed());

  if (!visible) return null;

  const dismiss = () => {
    try {
      window.localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // 저장에 실패해도 이번 세션에서는 닫아 준다
    }
    setVisible(false);
  };

  return (
    <Card variant="soft" style={{ gap: spacing.sm }}>
      <AppText variant="bodySmall" weight="700" color="accent">
        홈 화면 이름이 아직 예전 이름인가요?
      </AppText>
      <AppText variant="caption" color="secondary">
        앱 이름이 D-log로 바뀌었어요. 그런데 홈 화면의 이름과 아이콘은 앱을 추가하던 때
        폰이 저장해 둔 것이라, 업데이트해도 그대로 남아 있을 수 있어요 (특히 아이폰).
      </AppText>
      <AppText variant="caption" color="secondary">
        바꾸시려면 홈 화면에서 아이콘을 지우고 브라우저로 다시 접속해 “홈 화면에 추가”를
        한 번만 해 주세요. <AppText variant="caption" weight="700">일기는 사라지지 않아요.</AppText>{' '}
        그래도 걱정되면 설정 → 계정 → 백업 내보내기를 먼저 해 두세요.
      </AppText>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Button size="compact" variant="ghost" label="알겠어요" onPress={dismiss} />
      </View>
    </Card>
  );
}
