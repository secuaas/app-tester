export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface CreateUserRequest {
  email: string;
  name: string;
  password: string;
  role?: 'ADMIN' | 'USER' | 'VIEWER';
}

export interface CreateApiKeyRequest {
  name: string;
  permissions: string[];
  expiresAt?: Date;
}

export interface ApiKeyResponse {
  id: string;
  name: string;
  key?: string; // Only returned on creation
  prefix: string;
  permissions: string[];
  expiresAt: Date | null;
  createdAt: Date;
}
