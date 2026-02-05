import * as crypto from 'crypto';
import { SessionStore } from './session-store.interface';
import { SessionData, SsoConfig } from './types';

/**
 * Service de gestion des sessions SSO
 */
export class SessionService {
  private readonly defaultTtlSeconds = 86400; // 24 heures
  private readonly slidingWindow = true;

  constructor(
    private readonly config: SsoConfig,
    private readonly store: SessionStore,
  ) {}

  /**
   * Génère un ID de session sécurisé
   */
  generateSessionId(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  /**
   * Crée une nouvelle session
   */
  async createSession(params: {
    userId: string;
    email: string;
    name: string;
    groups: string[];
    availableRoles: string[];
    accessToken: string;
    idToken: string;
    refreshToken?: string;
    tokenExpiresIn?: number;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, any>;
  }): Promise<SessionData> {
    const sessionId = this.generateSessionId();
    const now = Date.now();

    // Auto-sélectionne le rôle si un seul disponible
    let currentRole: string | undefined;
    let roleSelected = false;
    if (params.availableRoles.length === 1) {
      currentRole = params.availableRoles[0];
      roleSelected = true;
    }

    const session: SessionData = {
      sessionId,
      userId: params.userId,
      email: params.email,
      name: params.name,
      groups: params.groups,
      availableRoles: params.availableRoles,
      currentRole,
      roleSelected,
      accessToken: params.accessToken,
      refreshToken: params.refreshToken,
      idToken: params.idToken,
      tokenExpiresAt: params.tokenExpiresIn ? now + params.tokenExpiresIn * 1000 : undefined,
      createdAt: now,
      lastActivity: now,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      metadata: params.metadata || {},
    };

    const ttl = this.config.sessionTtlSeconds || this.defaultTtlSeconds;
    await this.store.set(sessionId, session, ttl);

    console.log(`Session created for user ${params.email} (session: ${sessionId})`);
    return session;
  }

  /**
   * Récupère une session par son ID
   */
  async getSession(sessionId: string): Promise<SessionData | null> {
    const session = await this.store.get(sessionId);

    if (!session) {
      return null;
    }

    // Sliding window: met à jour l'activité et prolonge le TTL
    if (this.slidingWindow) {
      session.lastActivity = Date.now();
      const ttl = this.config.sessionTtlSeconds || this.defaultTtlSeconds;
      await this.store.set(sessionId, session, ttl);
    }

    return session;
  }

  /**
   * Sélectionne un rôle pour la session
   */
  async selectRole(sessionId: string, role: string): Promise<SessionData> {
    const session = await this.store.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (!session.availableRoles.includes(role)) {
      throw new Error(`Role '${role}' is not available for this user`);
    }

    session.currentRole = role;
    session.roleSelected = true;
    session.lastActivity = Date.now();

    const ttl = this.config.sessionTtlSeconds || this.defaultTtlSeconds;
    await this.store.set(sessionId, session, ttl);

    console.log(`Role '${role}' selected for session ${sessionId}`);
    return session;
  }

  /**
   * Met à jour les tokens de la session
   */
  async updateTokens(
    sessionId: string,
    accessToken: string,
    idToken: string,
    refreshToken?: string,
    expiresIn?: number,
  ): Promise<SessionData> {
    const session = await this.store.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    session.accessToken = accessToken;
    session.idToken = idToken;
    if (refreshToken) {
      session.refreshToken = refreshToken;
    }
    session.tokenExpiresAt = expiresIn ? Date.now() + expiresIn * 1000 : undefined;
    session.lastActivity = Date.now();

    const ttl = this.config.sessionTtlSeconds || this.defaultTtlSeconds;
    await this.store.set(sessionId, session, ttl);

    return session;
  }

  /**
   * Révoque une session
   */
  async revokeSession(sessionId: string): Promise<void> {
    await this.store.delete(sessionId);
    console.log(`Session ${sessionId} revoked`);
  }

  /**
   * Révoque toutes les sessions d'un utilisateur
   */
  async revokeAllSessions(userId: string): Promise<number> {
    const sessionIds = await this.store.findByUserId(userId);
    for (const sessionId of sessionIds) {
      await this.store.delete(sessionId);
    }
    console.log(`All sessions revoked for user ${userId} (${sessionIds.length} sessions)`);
    return sessionIds.length;
  }

  /**
   * Liste les sessions d'un utilisateur
   */
  async listUserSessions(userId: string): Promise<SessionData[]> {
    const sessionIds = await this.store.findByUserId(userId);
    const sessions: SessionData[] = [];

    for (const sessionId of sessionIds) {
      const session = await this.store.get(sessionId);
      if (session) {
        sessions.push(session);
      }
    }

    return sessions;
  }

  /**
   * Vérifie si le token de la session est expiré
   */
  isTokenExpired(session: SessionData, bufferSeconds: number = 60): boolean {
    if (!session.tokenExpiresAt) {
      return true;
    }
    return Date.now() >= session.tokenExpiresAt - bufferSeconds * 1000;
  }

  /**
   * Retourne les options pour le cookie de session
   */
  getCookieOptions(): {
    name: string;
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'strict' | 'lax' | 'none';
    maxAge: number;
  } {
    const cookieName = this.config.sessionCookieName || 'sso_session';
    const ttl = this.config.sessionTtlSeconds || this.defaultTtlSeconds;

    return {
      name: cookieName,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: ttl * 1000,
    };
  }
}
