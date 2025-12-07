/**
 * 암호화/복호화 유틸리티
 * AES-256-GCM 알고리즘을 사용하여 비밀번호를 안전하게 저장합니다
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 초기화 벡터 길이
const AUTH_TAG_LENGTH = 16; // 인증 태그 길이

/**
 * 암호화 키 가져오기
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY is not defined in environment variables');
  }
  return Buffer.from(key, 'hex');
}

/**
 * 텍스트 암호화
 * @param text 암호화할 텍스트
 * @returns 암호화된 텍스트 (iv:authTag:encrypted 형식의 hex string)
 */
export function encrypt(text: string): string {
  if (!text) return '';

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // IV, 인증 태그, 암호화된 데이터를 결합하여 반환
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * 텍스트 복호화
 * @param encryptedText 암호화된 텍스트 (iv:authTag:encrypted 형식)
 * @returns 복호화된 원본 텍스트
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return '';

  try {
    const key = getEncryptionKey();
    const parts = encryptedText.split(':');

    if (parts.length !== 3) {
      throw new Error('Invalid encrypted text format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}
