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
        accessible
        accessibilityLabel={`최근 ${weeks}주 동안 ${writtenCount}일 기록했어요`}
        // 칸 크기를 고정하면 카드 오른쪽 40%가 비어 격자가 잘린 것처럼 보인다.
        // 열이 남는 폭을 나눠 갖게 해 카드를 꽉 채운다.
        style={{ flexDirection: 'row', gap: 3 }}
      >
        {grid.map((column, ci) => (
          <View key={ci} style={{ flex: 1, gap: 3 }}>
            {column.map((cell) => (
              <View
                key={cell.key}
                accessibilityElementsHidden
                style={{
                  width: '100%',
                  aspectRatio: 1,
                  borderRadius: 3,
                  backgroundColor: cell.written ? colors.primary : colors.surfaceSoft,
                  borderWidth: cell.isToday ? 1.5 : cell.written ? 0 : 1,
                  // 오늘 표시는 칸이 채워졌는지에 따라 색을 바꿔야 한다. 하나로 고정하면
                  // 다크 모드에서 노란 칸 위에 노란 테두리가 얹혀 전혀 안 보였다.
                  borderColor: cell.isToday
                    ? cell.written
                      ? colors.onPrimary
                      : colors.primaryInk
                    : colors.border,
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
