import React, { useMemo } from 'react';
import { View } from 'react-native';

import { addDays, todayKey } from '@/lib/dates';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import { AppText } from './AppText';

interface ActivityHeatmapProps {
  /** 일기를 쓴 날짜들 (YYYY-MM-DD) */
  dateKeys: string[];
  /** 표시할 주 수 (기본 12주) */
  weeks?: number;
}

/**
 * 기록 잔디 — 최근 N주의 작성 기록을 작은 격자로 보여준다.
 * (듀오링고/깃허브의 활동 히트맵에서 착안. 빈 날을 비난하는 표현은 쓰지 않는다.)
 * 색과 함께 테두리로도 구분해 색상만으로 상태를 표현하지 않는다.
 */
export function ActivityHeatmap({ dateKeys, weeks = 12 }: ActivityHeatmapProps) {
  const { colors } = useTheme();
  const today = todayKey();

  const grid = useMemo(() => {
    const set = new Set(dateKeys);
    const days = weeks * 7;
    // 오늘이 마지막 칸이 되도록 과거 → 현재 순으로
    const cells: { key: string; written: boolean; isToday: boolean }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const key = addDays(today, -i);
      cells.push({ key, written: set.has(key), isToday: key === today });
    }
    // 열(주) 단위로 재배열
    const columns: (typeof cells)[] = [];
    for (let w = 0; w < weeks; w++) {
      columns.push(cells.slice(w * 7, w * 7 + 7));
    }
    return columns;
  }, [dateKeys, weeks, today]);

  const writtenCount = useMemo(
    () => grid.flat().filter((c) => c.written).length,
    [grid],
  );

  return (
    <View style={{ gap: spacing.sm }}>
      <View
        accessibilityLabel={`최근 ${weeks}주 동안 ${writtenCount}일 기록했어요`}
        style={{ flexDirection: 'row', gap: 3 }}
      >
        {grid.map((column, ci) => (
          <View key={ci} style={{ gap: 3 }}>
            {column.map((cell) => (
              <View
                key={cell.key}
                accessibilityElementsHidden
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 3,
                  backgroundColor: cell.written ? colors.primary : colors.surfaceSoft,
                  borderWidth: cell.isToday ? 1.5 : cell.written ? 0 : 1,
                  borderColor: cell.isToday ? colors.primary : colors.border,
                }}
              />
            ))}
          </View>
        ))}
      </View>
      <AppText variant="caption" color="secondary">
        최근 {weeks}주 동안 {writtenCount}일 기록했어요
      </AppText>
    </View>
  );
}
