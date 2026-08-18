/** 앱 인터페이스 문자열 (한국어 — 기본 언어) */
export const ko = {
  common: {
    save: '저장하기',
    cancel: '취소',
    next: '다음',
    back: '이전',
    done: '완료',
    skip: '건너뛰기',
    close: '닫기',
    retry: '다시 시도',
    delete: '삭제',
    edit: '수정',
  },
  tabs: {
    today: '오늘',
    calendar: '달력',
    write: '쓰기',
    friends: '친구',
    settings: '설정',
  },
  errors: {
    network: '네트워크 연결이 불안정해요. 잠시 후 다시 시도해 주세요.',
    aiUnavailable: 'AI가 잠시 응답하지 못했어요. 일반 일기 모드로 계속 쓸 수 있어요.',
    micPermission: '마이크 사용 권한이 필요해요. 설정에서 허용해 주세요.',
    photoPermission: '사진 접근 권한이 필요해요. 설정에서 허용해 주세요.',
    sttNotSupported: '이 기기에서는 음성 인식을 사용할 수 없어요. 텍스트로 입력해 주세요.',
  },
} as const;

export type TranslationShape = typeof ko;
