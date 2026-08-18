import { Tabs } from 'expo-router';
import React from 'react';
import { ColorValue, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { radius } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

function TabIcon({ emoji, focused, color }: { emoji: string; focused: boolean; color: ColorValue }) {
  return (
    <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.55, color }} accessibilityElementsHidden>
      {emoji}
    </Text>
  );
}

/** 중앙 "쓰기" 버튼 — 시각적으로 강조 */
function WriteIcon({ focused }: { focused: boolean }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        width: 52,
        height: 52,
        borderRadius: radius.pill,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: -18,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
        elevation: 6,
        opacity: focused ? 1 : 0.92,
      }}
    >
      <Text style={{ fontSize: 24 }} accessibilityElementsHidden>
        ✏️
      </Text>
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
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          // 고정 높이 대신 safe area(아이폰 홈 인디케이터) 반영
          height: 58 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 6,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: { fontSize: 11 },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '오늘',
          tabBarIcon: ({ focused, color }) => <TabIcon emoji="🏠" focused={focused} color={color} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: '달력',
          tabBarIcon: ({ focused, color }) => <TabIcon emoji="📅" focused={focused} color={color} />,
        }}
      />
      <Tabs.Screen
        name="write"
        options={{
          title: '쓰기',
          tabBarIcon: ({ focused }) => <WriteIcon focused={focused} />,
          tabBarAccessibilityLabel: '일기 쓰기',
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: '친구',
          tabBarIcon: ({ focused, color }) => <TabIcon emoji="💛" focused={focused} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '설정',
          tabBarIcon: ({ focused, color }) => <TabIcon emoji="⚙️" focused={focused} color={color} />,
        }}
      />
    </Tabs>
  );
}
