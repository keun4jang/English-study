import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { DiaryRow } from '@/components/diary/DiaryRow';
import { AppIcon, AppMciIcon } from '@/components/ui/AppIcon';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { emotionIconName } from '@/components/ui/EmotionPicker';
import { Screen } from '@/components/ui/Screen';
import { VersionFooter } from '@/components/ui/VersionFooter';
import { formatDateKo, monthInfo, todayKey } from '@/lib/dates';
import { selectActiveEntries, selectEntriesByDate, useDiary } from '@/state/useDiary';
import { useSettings } from '@/state/useSettings';
import { MIN_TOUCH_TARGET, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

export default function CalendarTab() {
  const { colors } = useTheme();
  const entries = useDiary((s) => s.entries);
  const startsMonday = useSettings((s) => s.design.calendarStartsOnMonday);

  const today = todayKey();
  const [ty, tm] = today.split('-').map(Number);
  const [year, setYear] = useState(ty);
  const [month, setMonth] = useState(tm);
  const [selectedDate, setSelectedDate] = useState(today);

  const active = useMemo(() => selectActiveEntries(entries), [entries]);
  const byDate = useMemo(() => {
    const map = new Map<string, typeof active>();
    for (const e of active) {
      const list = map.get(e.localDate) ?? [];
      list.push(e);
      map.set(e.localDate, list);
    }
    return map;
  }, [active]);

  const { firstWeekday, daysInMonth } = monthInfo(year, month);
  const weekdayLabels = startsMonday
    ? ['월', '화', '수', '목', '금', '토', '일']
    : ['일', '월', '화', '수', '목', '금', '토'];
  const leadingBlanks = startsMonday ? (firstWeekday + 6) % 7 : firstWeekday;

  const cells: (number | null)[] = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const moveMonth = (delta: number) => {
    let m = month + delta;
    let y = year;
    if (m < 1) {
      m = 12;
      y--;
    } else if (m > 12) {
      m = 1;
      y++;
    }
    setYear(y);
    setMonth(m);
  };

  const dateKeyOf = (day: number) =>
    `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const selectedEntries = selectEntriesByDate(entries, selectedDate);

  return (
    <Screen>
      <View style={{ gap: spacing.lg }}>
        <View
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="이전 달"
            hitSlop={12}
            onPress={() => moveMonth(-1)}
            style={({ pressed }) => ({
              minWidth: MIN_TOUCH_TARGET,
              minHeight: MIN_TOUCH_TARGET,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: radius.md,
              backgroundColor: pressed ? colors.pressedBackground : 'transparent',
            })}
          >
            <AppIcon name="chevron-left" size={22} color="primary" />
          </Pressable>
          <AppText variant="heading">
            {year}년 {month}월
          </AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="다음 달"
            hitSlop={12}
            onPress={() => moveMonth(1)}
            style={({ pressed }) => ({
              minWidth: MIN_TOUCH_TARGET,
              minHeight: MIN_TOUCH_TARGET,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: radius.md,
              backgroundColor: pressed ? colors.pressedBackground : 'transparent',
            })}
          >
            <AppIcon name="chevron-right" size={22} color="primary" />
          </Pressable>
        </View>

        {selectedDate !== today || year !== ty || month !== tm ? (
          <Button
            size="compact"
            variant="ghost"
            icon="calendar"
            label="오늘로 이동"
            onPress={() => {
              setYear(ty);
              setMonth(tm);
              setSelectedDate(today);
            }}
          />
        ) : null}

        <View>
          <View style={{ flexDirection: 'row' }}>
            {weekdayLabels.map((w) => (
              <View key={w} style={{ flex: 1, alignItems: 'center', paddingVertical: spacing.xs }}>
                <AppText variant="caption" color="secondary">
                  {w}
                </AppText>
              </View>
            ))}
          </View>
          {Array.from({ length: cells.length / 7 }, (_, row) => (
            <View key={row} style={{ flexDirection: 'row' }}>
              {cells.slice(row * 7, row * 7 + 7).map((day, col) => {
                if (day === null) {
                  return <View key={col} style={{ flex: 1, minHeight: 48 }} />;
                }
                const key = dateKeyOf(day);
                const dayEntries = byDate.get(key) ?? [];
                const isToday = key === today;
                const isSelected = key === selectedDate;
                const label = `${month}월 ${day}일${isToday ? ', 오늘' : ''}${
                  dayEntries.length ? `, 일기 ${dayEntries.length}개` : ''
                }`;
                return (
                  <Pressable
                    key={col}
                    accessibilityRole="button"
                    accessibilityLabel={label}
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => setSelectedDate(key)}
                    style={({ pressed }) => ({
                      flex: 1,
                      minHeight: 48,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: radius.md,
                      backgroundColor: isSelected
                        ? colors.primarySoft
                        : pressed
                          ? colors.pressedBackground
                          : 'transparent',
                      borderWidth: isSelected ? 2 : isToday ? 1.5 : 0,
                      borderColor: colors.primary,
                      margin: 1,
                      gap: 1,
                    })}
                  >
                    <AppText variant="bodySmall" weight={isToday || isSelected ? '600' : '400'}>
                      {day}
                    </AppText>
                    <View style={{ height: 16, justifyContent: 'center' }}>
                      {dayEntries.length > 0 ? (
                        <AppMciIcon
                          name={emotionIconName(dayEntries[0].emotion)}
                          size={14}
                          color="accent"
                        />
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>

        <View style={{ gap: spacing.md }}>
          <AppText variant="subheading">{formatDateKo(selectedDate)}</AppText>
          {selectedEntries.length === 0 ? (
            <AppText variant="bodySmall" color="secondary">
              이 날의 기록이 없어요. 지난 날의 기록이 없어도 괜찮아요.
            </AppText>
          ) : (
            <Card style={{ paddingVertical: spacing.xs }}>
              {selectedEntries.map((entry, i) => (
                <DiaryRow
                  key={entry.id}
                  entry={entry}
                  showDivider={i < selectedEntries.length - 1}
                  onPress={() => router.push({ pathname: '/diary/[id]', params: { id: entry.id } })}
                />
              ))}
            </Card>
          )}
        </View>
      </View>
      <VersionFooter />
    </Screen>
  );
}
