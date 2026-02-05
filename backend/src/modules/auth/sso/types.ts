/**
 * Types pour le module SSO JumpCloud
 * Adapté de Module-SSO-Jumpcloud pour Fastify
 */

export interface TokenResponse {
  access_token: string;
  id_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

export interface UserInfo {
  sub: string;
  email: string;
  name: string;
  given_name?: string;
  family_name?: string;
  groups: string[];
  raw_claims: Record<string, any>;
}

export interface SessionData {
  sessionId: string;
  userId: string;
  email: string;
  name: string;
  groups: string[];
  availableRoles: string[];
  currentRole?: string;
  roleSelected: boolean;
  accessToken: string;
  refreshToken?: string;
  idToken: string;
  tokenExpiresAt?: number;
  createdAt: number;
  lastActivity: number;
  ipAddress?: string;
  userAgent?: string;
  metadata: Record<string, any>;
}

export interface SsoUser {
  userId: string;
  email: string;
  name: string;
  groups: string[];
  availableRoles: string[];
  currentRole?: string;
  roleSelected: boolean;
  sessionId: string;
}

export interface PkceData {
  codeVerifier: string;
  codeChallenge: string;
  codeChallengeMethod: string;
}

export interface AuthorizationUrlResult {
  url: string;
  state: string;
  codeVerifier: string;
}

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  USER = 'USER',
}

export enum AuditEventType {
  LOGIN_INITIATED = 'login_initiated',
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILED = 'login_failed',
  LOGOUT = 'logout',
  ROLE_SELECTED = 'role_selected',
  SESSION_CREATED = 'session_created',
  SESSION_REFRESHED = 'session_refreshed',
  SESSION_REVOKED = 'session_revoked',
  ALL_SESSIONS_REVOKED = 'all_sessions_revoked',
  TOKEN_REFRESHED = 'token_refreshed',
  TOKEN_REFRESH_FAILED = 'token_refresh_failed',
  ACCESS_DENIED = 'access_denied',
  PERMISSION_DENIED = 'permission_denied',
}

export interface AuditEvent {
  eventType: AuditEventType;
  timestamp: number;
  userId?: string;
  email?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  role?: string;
  resource?: string;
  action?: string;
  success: boolean;
  errorMessage?: string;
  metadata: Record<string, any>;
}

export interface SsoConfig {
  clientId: string;
  clientSecret: string;
  orgId: string;
  callbackUrl: string;
  issuer: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  userInfoEndpoint: string;
  endSessionEndpoint?: string;
  revocationEndpoint?: string;
  jwksUri: string;
  scopes: string[];
  roleMapping?: Record<string, string>;
  roleHierarchy?: string[];
  defaultRole?: string;
  allowRoleSelection?: boolean;
  sessionTtlSeconds?: number;
  sessionCookieName?: string;
}

export interface RoleOption {
  name: string;
  displayName: string;
  description: string;
}

export interface OidcDiscoveryResponse {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  jwks_uri: string;
  end_session_endpoint?: string;
  revocation_endpoint?: string;
  scopes_supported: string[];
  response_types_supported: string[];
  grant_types_supported: string[];
  subject_types_supported: string[];
  id_token_signing_alg_values_supported: string[];
  token_endpoint_auth_methods_supported: string[];
}
