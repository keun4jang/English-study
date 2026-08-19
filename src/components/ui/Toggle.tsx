import React from 'react';
import { Platform, Switch, SwitchProps } from 'react-native';

import { useTheme } from '@/theme/useTheme';

/**
 * 설정 토글.
 *
 * Switch를 그냥 쓰면 켜졌을 때 손잡이가 react-native-web 기본 청록색(#009688)으로
 * 나온다. 꿀색·크림 팔레트 위에서 완전히 튀는데, `thumbColor`만 지정해서는 안 고쳐진다 —
 * 라이브러리가 켜짐 상태에는 `activeThumbColor`를 쓰고 그 기본값이 청록색이기 때문이다
 * (react-native-web/dist/exports/Switch/index.js: `value ? activeThumbColor ?? '#009688' : ...`).
 * 웹 전용 prop이라 RN 타입에는 없어서 플랫폼을 나눠 넘긴다.
 */

interface ToggleProps extends Pick<SwitchProps, 'disabled'> {
  value: boolean;
  onValueChange: (next: boolean) => void;
  accessibilityLabel: string;
}

export function Toggle({ value, onValueChange, accessibilityLabel, disabled }: ToggleProps) {
  const { colors } = useTheme();

  // 켜짐 트랙은 primary(밝은 노랑)가 아니라 primaryBorder를 쓴다. 밝은 노랑은 크림
  // 배경과 2:1까지 붙어서 켜짐/꺼짐이 잘 구분되지 않는다.
  const webThumb =
    Platform.OS === 'web'
      ? ({ activeThumbColor: colors.surfaceRaised } as { activeThumbColor: string })
      : null;

  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      trackColor={{ true: colors.primaryBorder, false: colors.borderStrong }}
      thumbColor={colors.surfaceRaised}
      ios_backgroundColor={colors.borderStrong}
      {...webThumb}
    />
  );
}
