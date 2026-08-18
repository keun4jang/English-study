import { Feather } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { radius, raisedShadow } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

type FeatherName = keyof typeof Feather.glyphMap;

/** 탭 아이콘 — 선택 상태는 색 + 상단 2px 표시선 + (라벨 굵기)로 함께 표현 */
function TabIcon({ name, focused }: { name: FeatherName; focused: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: 3 }}>
      <View
        style={{
          width: 20,
          height: 2,
          borderRadius: 1,
          backgroundColor: focused ? colors.tabActive : 'transparent',
        }}
      />
      <Feather name={name} size={23} color={focused ? colors.tabActive : colors.tabInactive} />
    </View>
  );
}

function TabLabel({ label, focused }: { label: string; focused: boolean }) {
  const { colors } = useTheme();
  return (
    <Text
      style={{
        fontSize: 12,
        fontWeight: focused ? '600' : '400',
        color: focused ? colors.tabActive : colors.tabInactive,
      }}
    >
      {label}
    </Text>
  );
}

/** 중앙 "쓰기" 버튼 — 시각적 강조 (56px, 대표 그림자) */
function WriteIcon({ focused }: { focused: boolean }) {
  const { colors, scheme } = useTheme();
  return (
    <View
      style={[
        {
          width: 56,
          height: 56,
          borderRadius: radius.pill,
          backgroundColor: colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: -22,
          borderWidth: 3,
          borderColor: colors.surfaceRaised,
          opacity: focused ? 1 : 0.94,
        },
        raisedShadow(colors, scheme),
      ]}
    >
      <Feather name="edit-3" size={24} color={colors.onPrimary} />
    </View>
  );
}

export default function TabsLayout() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.textPrimary,
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: colors.surfaceRaised,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 64 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 6,
        },
        tabBarActiveTintColor: colors.tabActive,
        tabBarInactiveTintColor: colors.tabInactive,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '오늘',
          tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} />,
          tabBarLabel: ({ focused }) => <TabLabel label="오늘" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: '달력',
          tabBarIcon: ({ focused }) => <TabIcon name="calendar" focused={focused} />,
          tabBarLabel: ({ focused }) => <TabLabel label="달력" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="write"
        options={{
          title: '쓰기',
          tabBarIcon: ({ focused }) => <WriteIcon focused={focused} />,
          tabBarLabel: ({ focused }) => <TabLabel label="쓰기" focused={focused} />,
          tabBarAccessibilityLabel: '일기 쓰기',
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: '친구',
          tabBarIcon: ({ focused }) => <TabIcon name="users" focused={focused} />,
          tabBarLabel: ({ focused }) => <TabLabel label="친구" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '설정',
          tabBarIcon: ({ focused }) => <TabIcon name="settings" focused={focused} />,
          tabBarLabel: ({ focused }) => <TabLabel label="설정" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
