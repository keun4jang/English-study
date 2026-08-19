import * as Crypto from 'expo-crypto';

/** UUID v4 생성 (파일 경로/식별자에 개인정보를 넣지 않기 위해 사용) */
export function newId(): string {
  return Crypto.randomUUID();
}

/** 친구 코드의 접두사. 옛 이름(Mellow)에서 온 MLW- 코드는 실행 시 자동으로 교체된다. */
export const FRIEND_CODE_PREFIX = 'DLOG';

/** 사람이 읽기 쉬운 친구 코드 생성 (예: DLOG-4F7K2Q) */
export function newFriendCode(): string {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const bytes = Crypto.getRandomBytes(6);
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += alphabet[bytes[i] % alphabet.length];
  }
  return `${FRIEND_CODE_PREFIX}-${code}`;
}
