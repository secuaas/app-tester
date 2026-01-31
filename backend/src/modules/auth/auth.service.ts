import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { prisma } from '../../common/utils/prisma';
import { config } from '../../config';
import type { LoginRequest, CreateUserRequest, CreateApiKeyRequest, ApiKeyResponse } from './auth.types';

export class AuthService {
  /**
   * Hash a password using bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, config.security.bcryptRounds);
  }

  /**
   * Verify password against hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Authenticate user with email/password
   */
  async login(data: LoginRequest) {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user || !user.isActive) {
      throw new Error('Invalid credentials');
    }

    const isValid = await this.verifyPassword(data.password, user.password);
    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }

  /**
   * Create a new user
   */
  async createUser(data: CreateUserRequest) {
    const hashedPassword = await this.hashPassword(data.password);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        password: hashedPassword,
        role: data.role || 'USER',
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    return user;
  }

  /**
   * Get user by ID
   */
  async getUserById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  /**
   * Create an API key
   */
  async createApiKey(userId: string, data: CreateApiKeyRequest): Promise<ApiKeyResponse> {
    // Generate API key: tf_live_<32 random chars>
    const randomBytes = crypto.randomBytes(24);
    const key = `tf_live_${randomBytes.toString('base64url')}`;

    // Hash the key for storage
    const keyHash = crypto.createHash('sha256').update(key).digest('hex');
    const prefix = key.substring(0, 12); // For identification

    const apiKey = await prisma.apiKey.create({
      data: {
        userId,
        name: data.name,
        keyHash,
        prefix,
        permissions: data.permissions,
        expiresAt: data.expiresAt,
      },
    });

    return {
      id: apiKey.id,
      name: apiKey.name,
      key, // Only returned once
      prefix: apiKey.prefix,
      permissions: apiKey.permissions,
      expiresAt: apiKey.expiresAt,
      createdAt: apiKey.createdAt,
    };
  }

  /**
   * Verify an API key
   */
  async verifyApiKey(key: string) {
    const keyHash = crypto.createHash('sha256').update(key).digest('hex');

    const apiKey = await prisma.apiKey.findUnique({
      where: { keyHash },
      include: { user: true },
    });

    if (!apiKey || !apiKey.isActive || !apiKey.user.isActive) {
      return null;
    }

    // Check expiration
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      return null;
    }

    // Update last used timestamp
    await prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    });

    return {
      id: apiKey.user.id,
      email: apiKey.user.email,
      name: apiKey.user.name,
      role: apiKey.user.role,
      permissions: apiKey.permissions,
    };
  }

  /**
   * List API keys for a user
   */
  async listApiKeys(userId: string) {
    const keys = await prisma.apiKey.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        prefix: true,
        permissions: true,
        lastUsedAt: true,
        expiresAt: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return keys;
  }

  /**
   * Revoke an API key
   */
  async revokeApiKey(keyId: string, userId: string) {
    const apiKey = await prisma.apiKey.findFirst({
      where: { id: keyId, userId },
    });

    if (!apiKey) {
      throw new Error('API key not found');
    }

    await prisma.apiKey.delete({
      where: { id: keyId },
    });

    return { success: true };
  }
}

export const authService = new AuthService();
