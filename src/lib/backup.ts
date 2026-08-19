import { z } from 'zod';

import { appConfig } from '@/config/appConfig';
import { DiaryEntry, SavedExpression } from '@/domain/types';

/**
 * 로컬 백업 내보내기/가져오기.
 *
 * 이 앱은 서버에 데이터를 보관하지 않으므로(비용 0원 정책), 기기를 바꾸거나
 * 브라우저 데이터를 지우기 전에 사용자가 직접 백업할 수 있어야 한다.
 * 형식은 사람이 읽을 수 있는 JSON이며, 다른 서비스로 전송되지 않는다.
 */

export const BACKUP_FORMAT = 'd-log-backup';
/**
 * 앱 이름을 바꾸기 전(Mellow Diary)에 내보낸 백업도 계속 복원할 수 있어야 한다.
 * 이름이 바뀌었다고 사용자가 이미 저장해 둔 일기를 못 읽으면 안 된다.
 */
export const LEGACY_BACKUP_FORMATS = ['mellow-diary-backup'] as const;
export const BACKUP_VERSION = 1;

const photoSchema = z.object({
  id: z.string(),
  uri: z.string(),
  isCover: z.boolean(),
  createdAt: z.string(),
});

const entrySchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  title: z.string().default(''),
  originalText: z.string().default(''),
  correctedText: z.string().nullable().default(null),
  finalText: z.string(),
  translationKo: z.string().nullable().default(null),
  localDate: z.string(),
  emotion: z.string().default('neutral'),
  weather: z.string().default('none'),
  tags: z.array(z.string()).default([]),
  photos: z.array(photoSchema).default([]),
  visibility: z.string().default('private'),
  isFavorite: z.boolean().default(false),
  language: z.enum(['en', 'ja']),
  inputMethod: z.string().default('typed'),
  conversationId: z.string().nullable().default(null),
  status: z.string().default('saved'),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable().default(null),
});

const expressionSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  expression: z.string(),
  meaningKo: z.string().default(''),
  example: z.string().default(''),
  language: z.enum(['en', 'ja']),
  sourceDiaryId: z.string().nullable().default(null),
  isFavorite: z.boolean().default(false),
  nextReviewDate: z.string(),
  reviewCount: z.number().default(0),
  createdAt: z.string(),
});

export const backupSchema = z.object({
  format: z.enum([BACKUP_FORMAT, ...LEGACY_BACKUP_FORMATS]),
  version: z.number(),
  exportedAt: z.string(),
  app: z.string().optional(),
  profile: z.unknown().optional(),
  settings: z.unknown().optional(),
  diaries: z.array(entrySchema).default([]),
  expressions: z.array(expressionSchema).default([]),
});

export type BackupFile = z.infer<typeof backupSchema>;

export function buildBackup(input: {
  profile: unknown;
  settings: unknown;
  diaries: DiaryEntry[];
  expressions: SavedExpression[];
}): string {
  const payload = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    app: `${appConfig.appName} v${appConfig.version}`,
    profile: input.profile,
    settings: input.settings,
    diaries: input.diaries,
    expressions: input.expressions,
  };
  return JSON.stringify(payload, null, 2);
}

export type ImportResult =
  | {
      ok: true;
      diaries: DiaryEntry[];
      expressions: SavedExpression[];
      /** 이미 있던 항목이라 건너뛴 수 */
      skipped: number;
    }
  | { ok: false; reason: 'invalid-json' | 'not-a-backup' | 'invalid-content' };

/**
 * 백업 텍스트를 검증하고, 기존 데이터와 병합할 항목만 골라낸다.
 * 같은 id가 이미 있으면 건너뛴다 (덮어쓰지 않아 기존 일기를 잃지 않는다).
 */
export function parseBackup(
  text: string,
  existing: { diaries: DiaryEntry[]; expressions: SavedExpression[] },
): ImportResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'invalid-json' };
  }
  const format = typeof raw === 'object' && raw !== null ? (raw as { format?: string }).format : undefined;
  const known: readonly string[] = [BACKUP_FORMAT, ...LEGACY_BACKUP_FORMATS];
  if (format === undefined || !known.includes(format)) {
    return { ok: false, reason: 'not-a-backup' };
  }
  const parsed = backupSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, reason: 'invalid-content' };

  const existingDiaryIds = new Set(existing.diaries.map((d) => d.id));
  const existingExpressionIds = new Set(existing.expressions.map((e) => e.id));

  const diaries = parsed.data.diaries.filter((d) => !existingDiaryIds.has(d.id)) as DiaryEntry[];
  const expressions = parsed.data.expressions.filter(
    (e) => !existingExpressionIds.has(e.id),
  ) as SavedExpression[];
  const skipped =
    parsed.data.diaries.length - diaries.length + (parsed.data.expressions.length - expressions.length);

  return { ok: true, diaries, expressions, skipped };
}
