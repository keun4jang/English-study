import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Linking, Platform, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { LockSettings } from '@/components/ui/LockSettings';
import { OptionGroup } from '@/components/ui/OptionGroup';
import { Screen } from '@/components/ui/Screen';
import { Toggle } from '@/components/ui/Toggle';
import { TextField } from '@/components/ui/TextField';
import { VersionFooter } from '@/components/ui/VersionFooter';
import { isBuiltInAI } from '@/ai';
import { appConfig, getAppEnv, isSupabaseConfigured } from '@/config/appConfig';
import { buildBackup, parseBackup } from '@/lib/backup';
import { backupFileName, canShareFiles, exportBackupFile } from '@/lib/exportFile';
import { applyWebUpdate, checkForUpdate, resetAppCache } from '@/lib/updates';
import { getUsageLimits } from '@/lib/usageLimits';
import { useAuth } from '@/state/useAuth';
import { useChat } from '@/state/useChat';
import { useDiary } from '@/state/useDiary';
import { useExpressions } from '@/state/useExpressions';
import { useSettings } from '@/state/useSettings';
import { useUsage } from '@/state/useUsage';
import { spacing } from '@/theme/tokens';

function SectionTitle({ children }: { children: string }) {
  return (
    <AppText variant="label" color="secondary" style={{ marginTop: spacing.md }}>
      {children}
    </AppText>
  );
}

function ToggleRow({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 52 }}>
      <View style={{ flex: 1 }}>
        <AppText variant="body">{label}</AppText>
        {description ? (
          <AppText variant="caption" color="secondary">
            {description}
          </AppText>
        ) : null}
      </View>
      <Toggle value={value} onValueChange={onChange} accessibilityLabel={label} />
    </View>
  );
}

export default function SettingsTab() {
  const settings = useSettings();
  const auth = useAuth();
  const diary = useDiary();
  const chat = useChat();
  const expressions = useExpressions();
  const usage = useUsage();

  const [nicknameEdit, setNicknameEdit] = useState('');
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState(false);
  const [exportCopied, setExportCopied] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);
  const [updateReady, setUpdateReady] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [restoreText, setRestoreText] = useState('');
  const [restoreStatus, setRestoreStatus] = useState<string | null>(null);
  const limits = getUsageLimits();

  const runUpdateCheck = async () => {
    setCheckingUpdate(true);
    setUpdateReady(false);
    const result = await checkForUpdate();
    if (result.status === 'update-available' && result.latest) {
      setUpdateStatus(
        `새 버전 v${result.latest.version}이(가) 있어요! 업데이트가 필요해요. (현재 v${result.current})`,
      );
      setUpdateReady(true);
    } else if (result.status === 'up-to-date') {
      setUpdateStatus(`최신 버전을 사용 중이에요 (v${result.current})`);
    } else {
      setUpdateStatus('업데이트 서버에 연결할 수 없어요. 네트워크를 확인하거나 나중에 다시 시도해 주세요.');
    }
    setCheckingUpdate(false);
  };

  /** 백업 내용 만들기 — 동기다. 공유 직전에 await를 끼우면 사용자 제스처가 끊긴다. */
  const makeBackupText = () =>
    buildBackup({
      profile: auth.user,
      settings: {
        learning: settings.learning,
        diary: settings.diary,
        design: settings.design,
        notifications: settings.notifications,
      },
      diaries: diary.entries,
      expressions: expressions.expressions,
    });

  /**
   * 백업 파일 내보내기 — 폰의 공유 시트로 넘긴다.
   *
   * 우리가 구글 드라이브에 직접 올리는 게 아니라, 파일을 폰에 건네주고 사용자가 드라이브든
   * 메일이든 고르게 한다. 그래서 새 API 키도, 계정 연결도, 비용도 없다.
   */
  const exportFile = () => {
    if (exporting) return;
    /*
     * **누르자마자 곧바로 시작한다.** setState를 먼저 하면 렌더가 끼어들면서 브라우저가
     * 이걸 "사용자가 방금 누른 동작"으로 보지 않을 수 있고, 그러면 공유 시트가 열리지
     * 않는다(NotAllowedError). exportBackupFile은 공유를 부를 때까지 동기로 돌기 때문에
     * 이 호출을 첫 줄에 두면 제스처가 그대로 이어진다.
     */
    // 파일 이름은 한 번만 만들어 두고 안내 문구에도 같은 값을 쓴다.
    // 다시 부르면 자정을 넘기는 순간 화면에 적힌 이름과 실제 파일 이름이 달라진다.
    const fileName = backupFileName();
    const running = exportBackupFile({ text: makeBackupText(), fileName });

    setExporting(true);
    setExportStatus(null);

    running
      .then((result) => {
        if (result.ok) {
          /*
           * 성공을 단정하지 않는다.
           *
           * 공유가 resolve해도 그건 "고른 앱에 넘겼다"는 뜻이지 드라이브 업로드가 끝났다는
           * 뜻이 아니다. 다운로드는 아예 성공을 알 방법이 없다(브라우저에 완료 이벤트가 없다).
           * 여기서 "저장됐어요"라고 단정하면 사용자가 백업된 줄 알고 앱 데이터를 지운다 —
           * 이 앱에서 나올 수 있는 최악의 실패다.
           */
          setExportStatus(
            result.via === 'share'
              ? '보냈어요 — 고른 앱에서 저장이 끝났는지 한 번 확인해 주세요.'
              : `파일을 내려받았어요. 폰의 "내 파일 → 다운로드"에서 ${fileName} 이 있는지 확인해 주세요. 안 보이면 아래 "JSON 복사하기"를 써 주세요.`,
          );
          return;
        }
        // 사용자가 공유 시트를 직접 닫은 경우에만 조용히 넘어간다
        if (result.reason === 'cancelled') return;
        // 그 외에는 반드시 무언가를 말한다 — 아무 반응이 없으면 버튼이 고장 난 줄 안다
        setExportStatus(
          result.reason === 'failed'
            ? `이 기기에서는 파일로 내보내지 못했어요 (${result.message}). 아래 "JSON 복사하기"로 저장해 주세요.`
            : '이 기기에서는 파일로 내보낼 수 없어요. 아래 "JSON 복사하기"로 저장해 주세요.',
        );
      })
      .catch((error: unknown) => {
        setExportStatus(
          `내보내는 중 문제가 생겼어요 (${error instanceof Error ? error.name : '알 수 없음'}). 아래 "JSON 복사하기"로 저장해 주세요.`,
        );
      })
      .finally(() => setExporting(false));
  };

  /** 예전 방식 — 파일이 안 되는 환경을 위해 남겨 둔다 */
  const exportData = async () => {
    await Clipboard.setStringAsync(makeBackupText());
    setExportCopied(true);
    setExportStatus(null);
    setTimeout(() => setExportCopied(false), 2500);
  };

  /** 백업 가져오기 — 기존 일기는 그대로 두고 없는 것만 추가 */
  const restoreData = () => {
    const result = parseBackup(restoreText, {
      diaries: diary.entries,
      expressions: expressions.expressions,
    });
    if (!result.ok) {
      const messages = {
        'invalid-json': '백업 내용을 읽을 수 없어요. 복사한 내용 전체를 붙여넣었는지 확인해 주세요.',
        'not-a-backup': '이 앱의 백업 파일이 아니에요. 내보내기로 만든 내용을 붙여넣어 주세요.',
        'invalid-content': '백업 내용이 손상된 것 같아요. 다른 백업으로 시도해 주세요.',
      };
      setRestoreStatus(messages[result.reason]);
      return;
    }
    diary.importEntries(result.diaries);
    expressions.importExpressions(result.expressions);
    setRestoreStatus(
      `일기 ${result.diaries.length}개와 표현 ${result.expressions.length}개를 가져왔어요.` +
        (result.skipped > 0 ? ` 이미 있던 ${result.skipped}개는 그대로 뒀어요.` : ''),
    );
    setRestoreText('');
  };

  const deleteAccount = () => {
    diary.wipeAll();
    chat.wipeAll();
    expressions.wipeAll();
    usage.wipeAll();
    auth.deleteAccount();
    settings.resetAll();
    router.replace('/onboarding');
  };

  const sendFeedback = () => {
    // 예전에는 자리표시자 주소(feedback@example.com)로 메일 앱을 열었다. 아무도 받지
    // 않는 주소라 의견이 그냥 사라졌다. 실제로 도착하는 저장소 이슈로 보낸다.
    const title = encodeURIComponent(`[의견] ${appConfig.appName} v${appConfig.version}`);
    Linking.openURL(`${appConfig.repositoryUrl}/issues/new?title=${title}`).catch(() => {});
  };

  return (
    <Screen>
      <View style={{ gap: spacing.lg }}>
        {/* 계정 */}
        <SectionTitle>계정</SectionTitle>
        <Card style={{ gap: spacing.md }}>
          <AppText variant="body">
            {auth.user?.nickname}{' '}
            <AppText variant="caption" color="secondary">
              ({auth.method === 'demo' ? 'Demo 모드 · 이 기기에만 저장' : '온라인 계정'})
            </AppText>
          </AppText>
          <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-end' }}>
            <View style={{ flex: 1 }}>
              <TextField placeholder="새 닉네임" value={nicknameEdit} onChangeText={setNicknameEdit} maxLength={20} />
            </View>
            <Button
              small
              variant="secondary"
              label="변경"
              disabled={!nicknameEdit.trim()}
              onPress={() => {
                auth.updateNickname(nicknameEdit);
                setNicknameEdit('');
              }}
            />
          </View>
          <Button
            small
            icon="share"
            label={
              exporting
                ? '준비하는 중…'
                : canShareFiles()
                  ? '백업 파일 내보내기'
                  : '백업 파일로 저장하기'
            }
            loading={exporting}
            onPress={exportFile}
          />
          <AppText variant="caption" color="secondary">
            {canShareFiles()
              ? '백업 파일을 만들어 폰의 공유 화면으로 넘겨요. 거기서 구글 드라이브·메일·카카오톡·파일 앱 중에 골라 저장하면 돼요. D-log가 직접 어딘가에 올리는 건 아니에요.'
              : '백업 파일을 내려받아요. 받은 파일을 구글 드라이브에 올리거나 메일에 첨부해 두면 돼요.'}
          </AppText>
          {exportStatus ? (
            <AppText variant="caption" color="accent">
              {exportStatus}
            </AppText>
          ) : null}
          <Button
            small
            variant="ghost"
            icon={exportCopied ? 'check' : 'copy'}
            label={exportCopied ? '복사됨 (메모장에 붙여넣어 보관하세요)' : 'JSON 복사하기'}
            onPress={exportData}
          />
          <AppText variant="caption" color="secondary">
            일기는 이 기기에만 저장돼요. 앱을 지우거나 폰을 바꾸면 사라지니, 가끔 백업해 두면
            안심할 수 있어요. 백업 파일에는 일기 내용이 그대로 들어 있으니 아무 데나 올리지는 마세요.
          </AppText>
          {!restoreOpen ? (
            <Button
              small
              variant="ghost"
              icon="upload"
              label="백업 가져오기"
              onPress={() => setRestoreOpen(true)}
            />
          ) : (
            <Card variant="soft" style={{ gap: spacing.sm }}>
              <AppText variant="bodySmall" color="secondary">
                백업 내용을 붙여넣어 주세요. 지금 있는 일기는 지워지지 않고, 없는 것만 추가돼요.
              </AppText>
              <TextField
                placeholder="백업 JSON 붙여넣기"
                value={restoreText}
                onChangeText={setRestoreText}
                multiline
                autoCapitalize="none"
                style={{ minHeight: 90, textAlignVertical: 'top' }}
              />
              {restoreStatus ? (
                <AppText variant="caption" color="secondary" accessibilityLiveRegion="polite">
                  {restoreStatus}
                </AppText>
              ) : null}
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <Button
                  small
                  icon="check"
                  label="가져오기"
                  disabled={restoreText.trim().length === 0}
                  onPress={restoreData}
                />
                <Button
                  small
                  variant="ghost"
                  label="닫기"
                  onPress={() => {
                    setRestoreOpen(false);
                    setRestoreStatus(null);
                    setRestoreText('');
                  }}
                />
              </View>
            </Card>
          )}
          <Button
            small
            variant="ghost"
            label="로그아웃"
            onPress={() => {
              auth.signOut();
              router.replace('/login');
            }}
          />
          {!confirmDeleteAccount ? (
            // 되돌릴 수 없는 동작이 로그아웃·백업과 똑같은 회색 버튼이면 위험도가 안 보인다
            <Button
              small
              variant="ghost"
              icon="trash-2"
              label="계정 및 데이터 삭제"
              onPress={() => setConfirmDeleteAccount(true)}
              accessibilityHint="되돌릴 수 없어요. 누르면 한 번 더 확인합니다"
            />
          ) : (
            <Card soft style={{ gap: spacing.sm }}>
              <AppText variant="bodySmall" color="error">
                모든 일기, 대화, 단어장이 이 기기에서 완전히 삭제돼요. 되돌릴 수 없어요.
              </AppText>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <Button small variant="danger" label="삭제할게요" onPress={deleteAccount} />
                <Button small variant="ghost" label="취소" onPress={() => setConfirmDeleteAccount(false)} />
              </View>
            </Card>
          )}
        </Card>

        {/* 학습 */}
        <SectionTitle>학습</SectionTitle>
        <Card style={{ gap: spacing.lg }}>
          <OptionGroup
            title="학습 언어"
            options={[
              { value: 'en', label: '영어' },
              { value: 'ja', label: '일본어' },
            ]}
            value={settings.learning.language}
            onChange={(language) => settings.updateLearning({ language })}
          />
          <OptionGroup
            title="내 실력"
            options={[
              { value: 'beginner-zero', label: '처음 시작' },
              { value: 'beginner', label: '초급' },
              { value: 'intermediate', label: '중급' },
              { value: 'advanced', label: '고급' },
            ]}
            value={settings.learning.level}
            onChange={(level) => settings.updateLearning({ level })}
          />
          <OptionGroup
            title="교정 강도"
            options={[
              { value: 'gentle', label: '부드럽게' },
              { value: 'balanced', label: '보통' },
              { value: 'thorough', label: '꼼꼼하게' },
            ]}
            value={settings.learning.correctionIntensity}
            onChange={(correctionIntensity) => settings.updateLearning({ correctionIntensity })}
          />
          <OptionGroup
            title="교정 타이밍"
            options={[
              { value: 'every-turn', label: '말할 때마다' },
              { value: 'major-only', label: '중요한 오류만' },
              { value: 'after-conversation', label: '대화 끝난 후' },
            ]}
            value={settings.learning.correctionTiming}
            onChange={(correctionTiming) => settings.updateLearning({ correctionTiming })}
          />
          {settings.learning.language === 'ja' ? (
            <>
              <OptionGroup
                title="일본어 말투"
                options={[
                  { value: 'polite', label: '정중체 (です/ます)' },
                  { value: 'casual', label: '캐주얼' },
                ]}
                value={settings.learning.japanesePoliteness}
                onChange={(japanesePoliteness) => settings.updateLearning({ japanesePoliteness })}
              />
              <ToggleRow
                label="읽기 도움 (히라가나)"
                value={settings.learning.japaneseReadingHelp}
                onChange={(japaneseReadingHelp) => settings.updateLearning({ japaneseReadingHelp })}
              />
            </>
          ) : null}
          <OptionGroup
            title="하루 목표 (문장 수)"
            options={[
              { value: '1', label: '1문장', description: '하루 한 문장이면 충분해요.' },
              { value: '3', label: '3문장' },
              { value: '5', label: '5문장' },
              { value: '10', label: '10문장' },
            ]}
            value={String(settings.learning.dailyGoalSentences) as '1' | '3' | '5' | '10'}
            onChange={(v) => settings.updateLearning({ dailyGoalSentences: Number(v) })}
          />
          <OptionGroup
            title="재말하기 통과 기준"
            options={[
              { value: '0.6', label: '너그럽게' },
              { value: '0.75', label: '보통' },
              { value: '0.85', label: '엄격하게' },
            ]}
            value={String(settings.learning.similarityThreshold) as '0.6' | '0.75' | '0.85'}
            onChange={(v) => settings.updateLearning({ similarityThreshold: Number(v) })}
          />
        </Card>

        {/* 음성 */}
        <SectionTitle>음성</SectionTitle>
        <Card style={{ gap: spacing.lg }}>
          <OptionGroup
            title="AI 말하기 속도"
            options={[
              { value: 'slow', label: '느리게' },
              { value: 'normal', label: '보통' },
              { value: 'fast', label: '빠르게' },
            ]}
            value={settings.voice.speechRate}
            onChange={(speechRate) => settings.updateVoice({ speechRate })}
          />
          <ToggleRow
            label="AI 답변 자동 재생"
            value={settings.voice.autoPlayAiReply}
            onChange={(autoPlayAiReply) => settings.updateVoice({ autoPlayAiReply })}
          />
          <ToggleRow
            label="음성 원본 저장"
            description="기본값은 저장 안 함이에요. 음성은 텍스트 변환에만 사용돼요."
            value={settings.voice.storeVoiceRecordings}
            onChange={(storeVoiceRecordings) => settings.updateVoice({ storeVoiceRecordings })}
          />
        </Card>

        {/* 일기 */}
        <SectionTitle>일기</SectionTitle>
        <Card style={{ gap: spacing.lg }}>
          <OptionGroup
            title="기본 공개 범위"
            options={[
              { value: 'private', label: '나만 보기', description: '기본값이에요. 공유는 일기별로 직접 선택해요.' },
              { value: 'selected-friends', label: '선택한 친구' },
            ]}
            value={settings.diary.defaultVisibility === 'private' ? 'private' : 'selected-friends'}
            onChange={(v) => settings.updateDiary({ defaultVisibility: v })}
          />
          <ToggleRow
            label="한국어 번역 표시"
            value={settings.diary.showKoreanTranslation}
            onChange={(showKoreanTranslation) => settings.updateDiary({ showKoreanTranslation })}
          />
          {/* 학습 통계는 홈에서 옮겨 왔다. 홈은 오늘 쓰는 화면이고 숫자는 여기가 제자리다 */}
          <Button
            small
            variant="secondary"
            icon="bar-chart-2"
            label="학습 통계 보기"
            onPress={() => router.push('/stats')}
          />
          <Button small variant="secondary" icon="trash-2" label="휴지통 보기" onPress={() => router.push('/trash')} />
        </Card>

        {/* 디자인 */}
        <SectionTitle>디자인</SectionTitle>
        <Card style={{ gap: spacing.lg }}>
          <OptionGroup
            title="테마"
            options={[
              { value: 'system', label: '시스템 연동' },
              { value: 'light', label: '라이트' },
              { value: 'dark', label: '다크' },
            ]}
            value={settings.design.themeMode}
            onChange={(themeMode) => settings.updateDesign({ themeMode })}
          />
          <OptionGroup
            title="글자 크기"
            options={[
              { value: 'small', label: '작게' },
              { value: 'normal', label: '보통' },
              { value: 'large', label: '크게' },
            ]}
            value={settings.design.fontScale}
            onChange={(fontScale) => settings.updateDesign({ fontScale })}
          />
          <ToggleRow
            label="햅틱 진동"
            value={settings.design.hapticsEnabled}
            onChange={(hapticsEnabled) => settings.updateDesign({ hapticsEnabled })}
          />
          <ToggleRow
            label="달력을 월요일부터 시작"
            value={settings.design.calendarStartsOnMonday}
            onChange={(calendarStartsOnMonday) => settings.updateDesign({ calendarStartsOnMonday })}
          />
        </Card>

        {/* 알림 */}
        <SectionTitle>알림</SectionTitle>
        <Card style={{ gap: spacing.lg }}>
          <ToggleRow
            label="일기 작성 알림"
            description="기기 로컬 알림으로 제공될 예정이에요 (Phase 2). 죄책감을 주는 문구는 쓰지 않아요."
            value={settings.notifications.writingReminderEnabled}
            onChange={(writingReminderEnabled) => settings.updateNotifications({ writingReminderEnabled })}
          />
        </Card>

        {/* 개인정보 */}
        <SectionTitle>개인정보</SectionTitle>
        <LockSettings />
        <Card style={{ gap: spacing.md }}>
          <AppText variant="bodySmall" color="secondary">
            · 일기는 기본으로 비공개예요.{'\n'}· 음성 원본은 기본적으로 저장하지 않아요.{'\n'}· 사진은
            압축 후 위치 정보(EXIF)가 제거돼요.{'\n'}· 교정과 예시는 <AppText variant="bodySmall" weight="700">
            기기 안에서만</AppText> 계산돼요. 쓴 글이 서버나 외부 AI로 나가지 않고, 인터넷이
            없어도 동작해요.{'\n'}· 일기 본문은 암호화되어 있지 않아요. 기기를 잃어버렸을 때를
            대비하려면 앱 잠금과 폰 자체 잠금을 함께 쓰는 게 좋아요.
          </AppText>
        </Card>

        {/* 의견 보내기 & 정보 */}
        <SectionTitle>지원</SectionTitle>
        <Card style={{ gap: spacing.md }}>
          <Button
            small
            variant="secondary"
            icon="refresh-cw"
            label={checkingUpdate ? '확인 중…' : '업데이트 확인'}
            loading={checkingUpdate}
            onPress={runUpdateCheck}
          />
          {updateStatus ? (
            <AppText variant="caption" color="secondary">
              {updateStatus}
            </AppText>
          ) : null}
          {updateReady ? (
            <Button small label="지금 업데이트" onPress={() => applyWebUpdate()} />
          ) : null}
          {Platform.OS === 'web' ? (
            <>
              <Button
                size="compact"
                variant="ghost"
                icon="rotate-ccw"
                label="앱 파일 새로 받기"
                onPress={() => resetAppCache()}
                accessibilityHint="저장된 앱 파일만 지우고 다시 받습니다. 일기와 설정은 지워지지 않습니다"
              />
              <AppText variant="caption" color="secondary">
                업데이트를 눌러도 앱 이름·아이콘이나 화면이 그대로라면 눌러 주세요. 저장된 앱
                파일만 지우고 새로 받습니다 — 일기와 설정은 지워지지 않아요.
              </AppText>
            </>
          ) : null}
          <Button small variant="secondary" icon="mail" label="의견 보내기" onPress={sendFeedback} />
          <Button small variant="secondary" icon="info" label="앱 정보 및 버전" onPress={() => router.push('/about')} />
        </Card>

        {/* 개발자/관리자 */}
        <SectionTitle>개발 설정</SectionTitle>
        <Card style={{ gap: spacing.md }}>
          <AppText variant="bodySmall" color="secondary">
            환경: {getAppEnv()} · AI 엔진: {isBuiltInAI() ? '내장 AI (무료·오프라인)' : '외부 AI (유료)'} ·
            Supabase: {isSupabaseConfigured() ? '연결됨' : '미연결'}
          </AppText>
          <AppText variant="caption" color="secondary">
            일일 한도 — AI 대화 {limits.dailyAiTurns}턴 · 일기 완성 {limits.dailyDiaryGenerations}회 ·
            입력 {limits.maxInputChars.toLocaleString()}자
          </AppText>
          <ToggleRow
            label="상세 오류 표시 (개발용)"
            value={settings.dev.showDetailedErrors}
            onChange={(showDetailedErrors) => settings.updateDev({ showDetailedErrors })}
          />
        </Card>
      </View>
      <VersionFooter />
    </Screen>
  );
}
