import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';

import { DiaryCard } from '@/components/diary/DiaryCard';
import { AppText } from '@/components/ui/AppText';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { selectActiveEntries, useDiary } from '@/state/useDiary';
import { spacing } from '@/theme/tokens';

type Filter = 'all' | 'favorite' | 'en' | 'ja';

export default function SearchScreen() {
  const entries = useDiary((s) => s.entries);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  // 검색 입력 debounce
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), 250);
    return () => clearTimeout(timer);
  }, [query]);

  const results = useMemo(() => {
    const q = debounced.trim().toLowerCase();
    let list = selectActiveEntries(entries);
    if (filter === 'favorite') list = list.filter((e) => e.isFavorite);
    if (filter === 'en' || filter === 'ja') list = list.filter((e) => e.language === filter);
    if (!q) return list;
    return list.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.finalText.toLowerCase().includes(q) ||
        (e.translationKo ?? '').toLowerCase().includes(q) ||
        e.tags.some((t) => t.toLowerCase().includes(q)) ||
        e.localDate.includes(q),
    );
  }, [entries, debounced, filter]);

  return (
    <Screen>
      <View style={{ gap: spacing.lg }}>
        <TextField
          placeholder="제목, 내용, 태그, 날짜(YYYY-MM-DD)로 검색"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoFocus
        />
        <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
          <Chip label="전체" selected={filter === 'all'} onPress={() => setFilter('all')} />
          <Chip label="⭐ 즐겨찾기" selected={filter === 'favorite'} onPress={() => setFilter('favorite')} />
          <Chip label="🇺🇸 영어" selected={filter === 'en'} onPress={() => setFilter('en')} />
          <Chip label="🇯🇵 일본어" selected={filter === 'ja'} onPress={() => setFilter('ja')} />
        </View>

        {results.length === 0 ? (
          <EmptyState
            emoji="🔍"
            title={debounced ? '검색 결과가 없어요' : '아직 일기가 없어요'}
            description={debounced ? '다른 단어로 검색해 볼까요?' : '일기를 쓰면 여기서 찾을 수 있어요.'}
          />
        ) : (
          <View style={{ gap: spacing.md }}>
            <AppText variant="caption" color="secondary">
              {results.length}개의 일기
            </AppText>
            {results.map((entry) => (
              <DiaryCard
                key={entry.id}
                entry={entry}
                onPress={() => router.push({ pathname: '/diary/[id]', params: { id: entry.id } })}
              />
            ))}
          </View>
        )}
      </View>
    </Screen>
  );
}
