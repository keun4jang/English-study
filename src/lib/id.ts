import * as Crypto from 'expo-crypto';

/**
 * UUID v4 생성 (파일 경로/식별자에 개인정보를 넣지 않기 위해 사용).
 *
 * **빈 값이 나오면 안 된다.** 이 값은 일기·대화·표현의 id로 쓰이는데, 두 항목이 같은 id를
 * 갖게 되면 하나를 지울 때 다른 것까지 지워진다. 실제로 테스트 환경에서 randomUUID가
 * null을 돌려줘서 대화 두 개가 같은 id를 갖는 상황을 만났다. 보안 컨텍스트가 아니거나
 * 오래된 브라우저에서도 같은 일이 생길 수 있어서 아래로 내려가는 길을 만들어 둔다.
 */
export function newId(): string {
  try {
    const uuid = Crypto.randomUUID();
    if (uuid) return uuid;
  } catch {
    // 아래 대체 경로로 간다
  }
  return fallbackUuid();
}

/** randomUUID를 못 쓸 때 — 난수 16바이트로 UUID v4를 직접 만든다 */
function fallbackUuid(): string {
  const bytes = randomBytes(16);
  // v4: 13번째 자리를 4로, 17번째 자리를 8~b로 고정한다
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function randomBytes(length: number): Uint8Array {
  try {
    const bytes = Crypto.getRandomBytes(length);
    if (bytes?.length === length) return Uint8Array.from(bytes);
  } catch {
    // 아래로
  }
  const webCrypto = globalThis.crypto;
  if (typeof webCrypto?.getRandomValues === 'function') {
    return webCrypto.getRandomValues(new Uint8Array(length));
  }
  // 난수원이 아예 없는 환경. 보안용이 아니라 **충돌만 피하면 되는** 값이라 이걸로도 충분하다.
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  return bytes;
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
