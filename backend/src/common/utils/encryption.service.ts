import * as crypto from 'crypto';
import { config } from '../../config';

export interface EncryptedCredential {
  iv: Buffer;
  encryptedData: Buffer;
  authTag: Buffer;
}

export class EncryptionService {
  private readonly ALGORITHM = 'aes-256-gcm';
  private readonly IV_LENGTH = 12;
  private readonly AUTH_TAG_LENGTH = 16;
  private readonly SALT = 'testforge-credential-v1';
  private readonly masterKey: Buffer;

  constructor() {
    this.masterKey = config.security.masterKey;
    if (this.masterKey.length !== 32) {
      throw new Error('Master key must be 32 bytes');
    }
  }

  /**
   * Derive a key specific to the application using HKDF
   */
  private deriveKey(applicationId: string): Buffer {
    return Buffer.from(
      crypto.hkdfSync(
        'sha256',
        this.masterKey,
        this.SALT,
        applicationId,
        32
      )
    );
  }

  /**
   * Encrypt credential data
   */
  async encrypt(data: object, applicationId: string): Promise<EncryptedCredential> {
    const derivedKey = this.deriveKey(applicationId);
    const iv = crypto.randomBytes(this.IV_LENGTH);
    const plaintext = JSON.stringify(data);

    const cipher = crypto.createCipheriv(this.ALGORITHM, derivedKey, iv, {
      authTagLength: this.AUTH_TAG_LENGTH,
    });

    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    return {
      iv,
      encryptedData: encrypted,
      authTag,
    };
  }

  /**
   * Decrypt credential data
   */
  async decrypt(
    encrypted: EncryptedCredential,
    applicationId: string
  ): Promise<object> {
    const derivedKey = this.deriveKey(applicationId);

    const decipher = crypto.createDecipheriv(this.ALGORITHM, derivedKey, encrypted.iv, {
      authTagLength: this.AUTH_TAG_LENGTH,
    });
    decipher.setAuthTag(encrypted.authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted.encryptedData),
      decipher.final(),
    ]);

    return JSON.parse(decrypted.toString('utf8'));
  }
}

// Singleton instance
export const encryptionService = new EncryptionService();
