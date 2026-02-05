import { AuditEvent, AuditEventType, SsoConfig } from './types';

/**
 * Service d'audit pour les événements SSO
 */
export class AuditService {
  constructor(private readonly config: SsoConfig) {}

  /**
   * Log un événement d'audit
   */
  async log(params: {
    eventType: AuditEventType;
    userId?: string;
    email?: string;
    sessionId?: string;
    ipAddress?: string;
    userAgent?: string;
    role?: string;
    resource?: string;
    action?: string;
    success?: boolean;
    errorMessage?: string;
    metadata?: Record<string, any>;
  }): Promise<AuditEvent> {
    const event: AuditEvent = {
      eventType: params.eventType,
      timestamp: Date.now(),
      userId: params.userId,
      email: params.email,
      sessionId: params.sessionId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      role: params.role,
      resource: params.resource,
      action: params.action,
      success: params.success ?? true,
      errorMessage: params.errorMessage,
      metadata: params.metadata || {},
    };

    // Log to console
    const level = event.success ? 'log' : 'warn';
    const prefix = event.success ? '✅' : '❌';
    console[level](
      `${prefix} [AUDIT] ${event.eventType} - User: ${event.email || 'unknown'} - Success: ${event.success}`,
      event.metadata,
    );

    // TODO: Stocker dans une base de données ou envoyer à un service d'audit externe
    // Pour l'instant, on log juste dans la console

    return event;
  }

  /**
   * Log une connexion réussie
   */
  async logLoginSuccess(params: {
    userId: string;
    email: string;
    sessionId: string;
    ipAddress?: string;
    userAgent?: string;
    role?: string;
  }): Promise<AuditEvent> {
    return this.log({
      eventType: AuditEventType.LOGIN_SUCCESS,
      ...params,
      success: true,
    });
  }

  /**
   * Log une tentative de connexion échouée
   */
  async logLoginFailed(params: {
    email?: string;
    ipAddress?: string;
    userAgent?: string;
    errorMessage: string;
  }): Promise<AuditEvent> {
    return this.log({
      eventType: AuditEventType.LOGIN_FAILED,
      ...params,
      success: false,
    });
  }

  /**
   * Log une déconnexion
   */
  async logLogout(params: {
    userId: string;
    email?: string;
    sessionId: string;
    ipAddress?: string;
  }): Promise<AuditEvent> {
    return this.log({
      eventType: AuditEventType.LOGOUT,
      ...params,
      success: true,
    });
  }

  /**
   * Log un accès refusé
   */
  async logAccessDenied(params: {
    userId: string;
    sessionId: string;
    resource: string;
    requiredRole: string;
    currentRole?: string;
    ipAddress?: string;
  }): Promise<AuditEvent> {
    return this.log({
      eventType: AuditEventType.ACCESS_DENIED,
      userId: params.userId,
      sessionId: params.sessionId,
      resource: params.resource,
      role: params.currentRole,
      ipAddress: params.ipAddress,
      success: false,
      errorMessage: `Required role: ${params.requiredRole}`,
    });
  }

  /**
   * Log une sélection de rôle
   */
  async logRoleSelected(params: {
    userId: string;
    email: string;
    sessionId: string;
    role: string;
    ipAddress?: string;
  }): Promise<AuditEvent> {
    return this.log({
      eventType: AuditEventType.ROLE_SELECTED,
      ...params,
      success: true,
      metadata: { selectedRole: params.role },
    });
  }

  /**
   * Log un refresh de token
   */
  async logTokenRefresh(params: {
    userId: string;
    sessionId: string;
    success: boolean;
    errorMessage?: string;
  }): Promise<AuditEvent> {
    return this.log({
      eventType: AuditEventType.TOKEN_REFRESHED,
      ...params,
    });
  }

  /**
   * Log une révocation de session
   */
  async logSessionRevoked(params: {
    userId: string;
    sessionId: string;
    reason?: string;
  }): Promise<AuditEvent> {
    return this.log({
      eventType: AuditEventType.SESSION_REVOKED,
      ...params,
      success: true,
      metadata: { reason: params.reason },
    });
  }
}
