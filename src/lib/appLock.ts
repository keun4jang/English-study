/**
 * 앱 잠금에 쓰는 PIN 해시.
 *
 * PIN을 그대로 저장하지 않는다. 저장된 값을 봐도 PIN을 알 수 없도록 PBKDF2로 늘려서
 * 해시만 남긴다. 기기 안에서만 계산하므로 비용도, 네트워크도 없다 (Web Crypto).
 *
 * **이 잠금이 무엇이고 무엇이 아닌지는 분명히 해 둔다.**
 * 일기 본문은 암호화하지 않는다. 즉 폰을 넘겨준 채로 브라우저 개발자 도구를 열 줄 아는
 * 사람은 읽을 수 있다. 이 잠금은 "폰을 잠깐 빌려줬을 때 누가 눌러 보는 것"을 막는 용도다.
 * 본문까지 암호화하면 PIN을 잊는 순간 일기가 영영 사라지는데, 일기 앱에서 그건
 * 지켜주는 것보다 잃는 게 크다.
 */

const ITERATIONS = 120_000;

function subtle(): SubtleCrypto | null {
  const target = globalThis.crypto?.subtle;
  return target ?? null;
}

/** 이 기기에서 잠금을 쓸 수 있는지 (Web Crypto가 없으면 못 쓴다) */
export function isLockSupported(): boolean {
  return subtle() !== null && typeof globalThis.crypto?.getRandomValues === 'function';
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return globalThis.btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = globalThis.atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function makeSalt(): string {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return toBase64(bytes);
}

export async function hashPin(pin: string, saltB64: string): Promise<string> {
  const crypto = subtle();
  if (!crypto) throw new Error('이 기기에서는 잠금을 쓸 수 없어요.');
  const key = await crypto.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const bits = await crypto.deriveBits(
    { name: 'PBKDF2', salt: fromBase64(saltB64) as unknown as BufferSource, iterations: ITERATIONS, hash: 'SHA-256' },
    key,
    256,
  );
  return toBase64(new Uint8Array(bits));
}

/**
 * 시간이 일정한 비교.
 * 앞에서부터 다른 곳이 나오면 바로 끝내면, 걸린 시간으로 몇 자리까지 맞았는지가 새어 나간다.
 */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export const PIN_LENGTH = 4;

export function isValidPin(pin: string): boolean {
  return new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin);
}
