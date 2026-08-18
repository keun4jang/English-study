import * as Crypto from 'expo-crypto';

/** UUID v4 생성 (파일 경로/식별자에 개인정보를 넣지 않기 위해 사용) */
export function newId(): string {
  return Crypto.randomUUID();
}

/** 사람이 읽기 쉬운 친구 코드 생성 (예: MLW-4F7K2Q) */
export function newFriendCode(): string {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const bytes = Crypto.getRandomBytes(6);
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += alphabet[bytes[i] % alphabet.length];
  }
  return `MLW-${code}`;
}
