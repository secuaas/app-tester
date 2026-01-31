import type { AppType } from '@prisma/client';

export interface CreateApplicationRequest {
  name: string;
  description?: string;
  type: AppType;
  environments?: CreateEnvironmentInput[];
}

export interface UpdateApplicationRequest {
  name?: string;
  description?: string;
  type?: AppType;
}

export interface CreateEnvironmentInput {
  name: string;
  baseUrl: string;
  isActive?: boolean;
}

export interface UpdateEnvironmentRequest {
  name?: string;
  baseUrl?: string;
  isActive?: boolean;
}

export interface ApplicationResponse {
  id: string;
  name: string;
  description: string | null;
  type: AppType;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApplicationDetailResponse extends ApplicationResponse {
  environments: EnvironmentResponse[];
  testCount: number;
  credentialCount: number;
  lastExecution?: {
    id: string;
    status: string;
    completedAt: Date | null;
    summary: any;
  };
}

export interface EnvironmentResponse {
  id: string;
  name: string;
  baseUrl: string;
  isActive: boolean;
  applicationId: string;
}
