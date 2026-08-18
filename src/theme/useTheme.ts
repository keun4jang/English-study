import { useColorScheme } from 'react-native';

import { useSettings } from '@/state/useSettings';
import { palette, ThemeColors } from './tokens';

export interface Theme {
  colors: ThemeColors;
  scheme: 'light' | 'dark';
}

/**
 * 설정(라이트/다크/시스템)과 시스템 테마를 반영한 현재 테마를 반환한다.
 */
export function useTheme(): Theme {
  const systemScheme = useColorScheme();
  const themeMode = useSettings((s) => s.design.themeMode);

  const scheme: 'light' | 'dark' =
    themeMode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : themeMode;

  return { colors: palette[scheme], scheme };
}
