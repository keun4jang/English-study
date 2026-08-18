import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';

import { useTheme } from '@/theme/useTheme';

/**
 * 기능 아이콘 — 이모지 대신 Feather(기본) / MaterialCommunityIcons(감정 얼굴 등 보조)를 사용한다.
 * 색상은 반드시 테마 토큰에서 가져온다.
 */

type FeatherName = keyof typeof Feather.glyphMap;
type MciName = keyof typeof MaterialCommunityIcons.glyphMap;

type ColorName =
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'onPrimary'
  | 'error'
  | 'success'
  | 'warning';

interface BaseProps {
  size?: number;
  color?: ColorName;
  /** 장식용 아이콘이면 true — 스크린리더에서 제외 */
  decorative?: boolean;
}

function useIconColor(color: ColorName): string {
  const { colors } = useTheme();
  const map: Record<ColorName, string> = {
    primary: colors.textPrimary,
    secondary: colors.textSecondary,
    accent: colors.primary,
    onPrimary: colors.onPrimary,
    error: colors.error,
    success: colors.success,
    warning: colors.warning,
  };
  return map[color];
}

export function AppIcon({
  name,
  size = 20,
  color = 'secondary',
  decorative = true,
}: BaseProps & { name: FeatherName }) {
  const iconColor = useIconColor(color);
  return (
    <Feather
      name={name}
      size={size}
      color={iconColor}
      accessibilityElementsHidden={decorative}
      importantForAccessibility={decorative ? 'no' : 'auto'}
    />
  );
}

/** 감정 얼굴 등 Feather에 없는 아이콘용 */
export function AppMciIcon({
  name,
  size = 20,
  color = 'secondary',
  decorative = true,
}: BaseProps & { name: MciName }) {
  const iconColor = useIconColor(color);
  return (
    <MaterialCommunityIcons
      name={name}
      size={size}
      color={iconColor}
      accessibilityElementsHidden={decorative}
      importantForAccessibility={decorative ? 'no' : 'auto'}
    />
  );
}
