import type { CredentialType } from '@prisma/client';

// ============== CREDENTIALS ==============

export interface CreateCredentialRequest {
  name: string;
  applicationId: string;
  type: CredentialType;
  data: Record<string, any>;
}

export interface UpdateCredentialRequest {
  name?: string;
  data?: Record<string, any>;
}

export interface CredentialResponse {
  id: string;
  name: string;
  applicationId: string;
  type: CredentialType;
  createdAt: Date;
  updatedAt: Date;
  // Note: encrypted data is never returned in responses
}

export interface CredentialDetailResponse extends CredentialResponse {
  application: {
    id: string;
    name: string;
  };
  // Decrypted data is only returned when explicitly requested
  data?: Record<string, any>;
}

// ============== CREDENTIAL TYPES ==============

export interface ApiKeyCredential {
  apiKey: string;
  headerName?: string; // Default: X-API-Key
}

export interface BasicAuthCredential {
  username: string;
  password: string;
}

export interface BearerTokenCredential {
  token: string;
}

export interface OAuth2Credential {
  clientId: string;
  clientSecret: string;
  accessToken?: string;
  refreshToken?: string;
  tokenUrl?: string;
  scope?: string;
}

export interface CustomHeadersCredential {
  headers: Record<string, string>;
}

// Union type for all credential data types
export type CredentialData =
  | ApiKeyCredential
  | BasicAuthCredential
  | BearerTokenCredential
  | OAuth2Credential
  | CustomHeadersCredential;
