import * as Clipboard from 'expo-clipboard';
import { Platform, Share } from 'react-native';

import { DiaryEntry } from '@/domain/types';
import { formatDateKo } from './dates';

/**
 * 일기 공유 — 서버 없이 기기의 공유 기능만 사용한다 (비용 0원).
 * 사용자가 직접 누른 일기만, 사용자가 고른 앱으로만 나간다.
 */

export interface ShareOptions {
  /** 한국어 뜻도 함께 공유 */
  includeTranslation: boolean;
}

export function buildShareText(entry: DiaryEntry, options: ShareOptions): string {
  const lines: string[] = [];
  if (entry.title.trim()) lines.push(entry.title.trim());
  lines.push(formatDateKo(entry.localDate));
  lines.push('');
  lines.push(entry.finalText.trim());
  if (options.includeTranslation && entry.translationKo?.trim()) {
    lines.push('');
    lines.push(entry.translationKo.trim());
  }
  return lines.join('\n');
}

export type ShareResult = 'shared' | 'copied' | 'dismissed' | 'failed';

/**
 * 공유 시트를 열고, 지원되지 않으면 클립보드 복사로 대체한다.
 * (사진은 포함하지 않는다 — 기기 밖으로 나가는 내용을 사용자가 예측할 수 있게)
 */
export async function shareDiary(entry: DiaryEntry, options: ShareOptions): Promise<ShareResult> {
  const text = buildShareText(entry, options);

  if (Platform.OS === 'web') {
    const nav = typeof navigator !== 'undefined' ? (navigator as Navigator) : undefined;
    if (nav?.share) {
      try {
        await nav.share({ text });
        return 'shared';
      } catch {
        // 사용자가 취소했거나 브라우저가 거부 — 복사로 대체
      }
    }
    try {
      await Clipboard.setStringAsync(text);
      return 'copied';
    } catch {
      return 'failed';
    }
  }

  try {
    const result = await Share.share({ message: text });
    return result.action === Share.dismissedAction ? 'dismissed' : 'shared';
  } catch {
    try {
      await Clipboard.setStringAsync(text);
      return 'copied';
    } catch {
      return 'failed';
    }
  }
}
