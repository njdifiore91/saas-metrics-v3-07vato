import { createCipheriv, createDecipheriv, randomBytes, CipherGCM, DecipherGCM } from 'crypto'; // native
import bcrypt from 'bcrypt'; // ^5.1.1
import { jwt } from './config';

// Constants
const SALT_ROUNDS = 12;
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 16 bytes for AES
const AUTH_TAG_LENGTH = 16; // 16 bytes for GCM mode
const KEY_LENGTH = 32; // 32 bytes (256 bits) for AES-256

// Custom error types
class EncryptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EncryptionError';
  }
}

class DecryptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DecryptionError';
  }
}

/**
 * Hashes a plain text password using bcrypt with configurable salt rounds
 * @param password - Plain text password to hash
 * @returns Promise resolving to hashed password string
 * @throws Error if password hashing fails
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    return await bcrypt.hash(password, salt);
  } catch (error) {
    throw new Error(`Password hashing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Compares a plain text password with a hashed password
 * @param plainPassword - Plain text password to compare
 * @param hashedPassword - Previously hashed password
 * @returns Promise resolving to boolean indicating if passwords match
 * @throws Error if password comparison fails
 */
export async function comparePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
  try {
    return await bcrypt.compare(plainPassword, hashedPassword);
  } catch (error) {
    throw new Error(`Password comparison failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

interface EncryptedData {
  encrypted: string;
  iv: Buffer;
  tag: Buffer;
}

/**
 * Encrypts sensitive data using AES-256-GCM with authentication tag
 * @param data - String data to encrypt
 * @param key - 32-byte (256-bit) encryption key
 * @returns Object containing encrypted data, IV, and authentication tag
 * @throws EncryptionError if encryption fails or key is invalid
 */
export function encryptData(data: string, key: string): EncryptedData {
  if (Buffer.from(key).length !== KEY_LENGTH) {
    throw new EncryptionError(`Encryption key must be ${KEY_LENGTH} bytes`);
  }

  try {
    const iv = randomBytes(IV_LENGTH);
    const cipher: CipherGCM = createCipheriv(ENCRYPTION_ALGORITHM, Buffer.from(key), iv) as CipherGCM;
    
    const encrypted = Buffer.concat([
      cipher.update(data, 'utf8'),
      cipher.final()
    ]);

    return {
      encrypted: encrypted.toString('base64'),
      iv: iv,
      tag: cipher.getAuthTag()
    };
  } catch (error) {
    throw new EncryptionError(`Data encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Decrypts data encrypted with AES-256-GCM using authentication tag
 * @param encryptedData - Object containing encrypted data, IV, and authentication tag
 * @param key - 32-byte (256-bit) encryption key
 * @returns Decrypted string data
 * @throws DecryptionError if decryption fails or authentication fails
 */
export function decryptData(encryptedData: EncryptedData, key: string): string {
  if (Buffer.from(key).length !== KEY_LENGTH) {
    throw new DecryptionError(`Decryption key must be ${KEY_LENGTH} bytes`);
  }

  if (encryptedData.iv.length !== IV_LENGTH) {
    throw new DecryptionError(`IV must be ${IV_LENGTH} bytes`);
  }

  if (encryptedData.tag.length !== AUTH_TAG_LENGTH) {
    throw new DecryptionError(`Authentication tag must be ${AUTH_TAG_LENGTH} bytes`);
  }

  try {
    const decipher: DecipherGCM = createDecipheriv(
      ENCRYPTION_ALGORITHM,
      Buffer.from(key),
      encryptedData.iv
    ) as DecipherGCM;

    decipher.setAuthTag(encryptedData.tag);

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedData.encrypted, 'base64')),
      decipher.final()
    ]);

    return decrypted.toString('utf8');
  } catch (error) {
    throw new DecryptionError(`Data decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generates cryptographically secure random bytes
 * @param length - Number of random bytes to generate
 * @returns Buffer containing random bytes
 * @throws Error if random byte generation fails
 */
export function generateRandomBytes(length: number): Buffer {
  try {
    return randomBytes(length);
  } catch (error) {
    throw new Error(`Random bytes generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}