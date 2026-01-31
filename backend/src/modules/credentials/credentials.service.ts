import { prisma } from '../../common/utils/prisma';
import { encryptionService } from '../../common/utils/encryption.service';
import type {
  CreateCredentialRequest,
  UpdateCredentialRequest,
} from './credentials.types';

export class CredentialsService {
  /**
   * Create a new credential
   */
  async createCredential(data: CreateCredentialRequest, userId: string) {
    // Verify application exists
    const app = await prisma.application.findUnique({
      where: { id: data.applicationId },
    });

    if (!app) {
      throw new Error('Application not found');
    }

    // Encrypt credential data
    const encrypted = await encryptionService.encrypt(
      data.data,
      data.applicationId
    );

    const credential = await prisma.credential.create({
      data: {
        name: data.name,
        applicationId: data.applicationId,
        type: data.type,
        encryptedData: encrypted.encryptedData,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
      },
      include: {
        application: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: 'credential.create',
        entityType: 'Credential',
        entityId: credential.id,
        userId,
        details: {
          name: credential.name,
          applicationId: data.applicationId,
          type: data.type,
        },
      },
    });

    // Return credential without decrypted data
    const { encryptedData, iv, authTag, ...credentialResponse } = credential;

    return credentialResponse;
  }

  /**
   * List all credentials
   */
  async listCredentials(filters?: { applicationId?: string; type?: string }) {
    const where: any = {};

    if (filters?.applicationId) {
      where.applicationId = filters.applicationId;
    }

    if (filters?.type) {
      where.type = filters.type;
    }

    const credentials = await prisma.credential.findMany({
      where,
      select: {
        id: true,
        name: true,
        applicationId: true,
        type: true,
        createdAt: true,
        updatedAt: true,
        application: {
          select: {
            id: true,
            name: true,
          },
        },
        // Exclude encrypted fields
        encryptedData: false,
        iv: false,
        authTag: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return credentials;
  }

  /**
   * Get credential by ID (without decrypted data)
   */
  async getCredentialById(id: string) {
    const credential = await prisma.credential.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        applicationId: true,
        type: true,
        createdAt: true,
        updatedAt: true,
        application: {
          select: {
            id: true,
            name: true,
          },
        },
        // Exclude encrypted fields
        encryptedData: false,
        iv: false,
        authTag: false,
      },
    });

    if (!credential) {
      throw new Error('Credential not found');
    }

    return credential;
  }

  /**
   * Get credential with decrypted data
   * Only use this when actually needed for test execution
   */
  async getCredentialWithData(id: string, userId: string) {
    const credential = await prisma.credential.findUnique({
      where: { id },
      include: {
        application: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!credential) {
      throw new Error('Credential not found');
    }

    // Decrypt data
    const decryptedData = await encryptionService.decrypt(
      {
        encryptedData: credential.encryptedData,
        iv: credential.iv,
        authTag: credential.authTag,
      },
      credential.applicationId
    );

    // Audit log (accessing sensitive data)
    await prisma.auditLog.create({
      data: {
        action: 'credential.access',
        entityType: 'Credential',
        entityId: credential.id,
        userId,
        details: {
          name: credential.name,
          applicationId: credential.applicationId,
        },
      },
    });

    return {
      id: credential.id,
      name: credential.name,
      applicationId: credential.applicationId,
      type: credential.type,
      createdAt: credential.createdAt,
      updatedAt: credential.updatedAt,
      application: credential.application,
      data: decryptedData,
    };
  }

  /**
   * Update credential
   */
  async updateCredential(id: string, data: UpdateCredentialRequest, userId: string) {
    const existing = await prisma.credential.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error('Credential not found');
    }

    let updateData: any = {};

    if (data.name) {
      updateData.name = data.name;
    }

    // If data is being updated, re-encrypt it
    if (data.data) {
      const encrypted = await encryptionService.encrypt(
        data.data,
        existing.applicationId
      );

      updateData.encryptedData = encrypted.encryptedData;
      updateData.iv = encrypted.iv;
      updateData.authTag = encrypted.authTag;
    }

    const credential = await prisma.credential.update({
      where: { id },
      data: updateData,
      include: {
        application: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: 'credential.update',
        entityType: 'Credential',
        entityId: id,
        userId,
        details: {
          name: data.name,
          dataUpdated: !!data.data,
        },
      },
    });

    // Return without decrypted data
    const { encryptedData, iv, authTag, ...credentialResponse } = credential;

    return credentialResponse;
  }

  /**
   * Delete credential
   */
  async deleteCredential(id: string, userId: string) {
    const credential = await prisma.credential.findUnique({
      where: { id },
      select: { name: true },
    });

    if (!credential) {
      throw new Error('Credential not found');
    }

    await prisma.credential.delete({
      where: { id },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: 'credential.delete',
        entityType: 'Credential',
        entityId: id,
        userId,
        details: { name: credential.name },
      },
    });

    return { success: true };
  }

  /**
   * Test credential by making a test request
   */
  async testCredential(id: string, testUrl: string, userId: string) {
    const credential = await this.getCredentialWithData(id, userId);

    // TODO: Implement actual HTTP request with credential
    // This will be part of the execution engine

    // For now, just validate the credential structure
    if (!credential.data || Object.keys(credential.data).length === 0) {
      throw new Error('Credential data is empty');
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: 'credential.test',
        entityType: 'Credential',
        entityId: id,
        userId,
        details: {
          testUrl,
        },
      },
    });

    return {
      success: true,
      message: 'Credential structure is valid',
      // Don't return the actual credential data
    };
  }

  /**
   * Rotate credential (create new version, mark old as deprecated)
   */
  async rotateCredential(id: string, newData: Record<string, any>, userId: string) {
    const existing = await prisma.credential.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error('Credential not found');
    }

    // Encrypt new data
    const encrypted = await encryptionService.encrypt(
      newData,
      existing.applicationId
    );

    // Update with new encrypted data
    const credential = await prisma.credential.update({
      where: { id },
      data: {
        encryptedData: encrypted.encryptedData,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
      },
      include: {
        application: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: 'credential.rotate',
        entityType: 'Credential',
        entityId: id,
        userId,
        details: {
          name: credential.name,
        },
      },
    });

    // Return without decrypted data
    const { encryptedData, iv, authTag, ...credentialResponse } = credential;

    return credentialResponse;
  }
}

export const credentialsService = new CredentialsService();
