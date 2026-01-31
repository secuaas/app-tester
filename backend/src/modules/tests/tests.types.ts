import type { TestType, HttpMethod } from '@prisma/client';

// ============== TEST SUITES ==============

export interface CreateTestSuiteRequest {
  name: string;
  description?: string;
  applicationId: string;
  type: TestType;
  isActive?: boolean;
  tags?: string[];
  steps?: CreateTestStepInput[];
}

export interface UpdateTestSuiteRequest {
  name?: string;
  description?: string;
  isActive?: boolean;
  tags?: string[];
}

export interface TestSuiteResponse {
  id: string;
  name: string;
  description: string | null;
  applicationId: string;
  type: TestType;
  isActive: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TestSuiteDetailResponse extends TestSuiteResponse {
  application: {
    id: string;
    name: string;
  };
  steps: TestStepResponse[];
  stepCount: number;
  lastExecution?: {
    id: string;
    status: string;
    completedAt: Date | null;
    summary: any;
  };
}

// ============== TEST STEPS ==============

export interface CreateTestStepInput {
  name: string;
  description?: string;
  order: number;
  endpoint: string;
  method: HttpMethod;
  headers?: Record<string, string>;
  body?: any;
  assertions?: AssertionInput[];
  extractVariables?: ExtractVariableInput[];
}

export interface UpdateTestStepRequest {
  name?: string;
  description?: string;
  order?: number;
  endpoint?: string;
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: any;
  assertions?: AssertionInput[];
  extractVariables?: ExtractVariableInput[];
}

export interface TestStepResponse {
  id: string;
  testSuiteId: string;
  name: string;
  description: string | null;
  order: number;
  endpoint: string;
  method: HttpMethod;
  headers: Record<string, string> | null;
  body: any;
  assertions: AssertionInput[];
  extractVariables: ExtractVariableInput[];
  createdAt: Date;
  updatedAt: Date;
}

// ============== ASSERTIONS ==============

export interface AssertionInput {
  type: 'status' | 'header' | 'body' | 'jsonPath' | 'responseTime';
  field?: string;
  operator: 'equals' | 'contains' | 'greaterThan' | 'lessThan' | 'exists' | 'matches';
  value: any;
}

// ============== VARIABLE EXTRACTION ==============

export interface ExtractVariableInput {
  name: string;
  source: 'header' | 'body' | 'jsonPath';
  path?: string;
}

// ============== TEST EXECUTION ==============

export interface ExecuteTestRequest {
  environmentId: string;
  credentialId?: string;
  variables?: Record<string, any>;
}

export interface ExecutionResponse {
  id: string;
  testSuiteId: string;
  environmentId: string;
  status: 'PENDING' | 'RUNNING' | 'PASSED' | 'FAILED' | 'ERROR';
  startedAt: Date;
  completedAt: Date | null;
  duration: number | null;
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  } | null;
}

// ============== IMPORT/EXPORT ==============

export interface TestSuiteExport {
  version: string;
  testSuite: {
    name: string;
    description?: string;
    type: TestType;
    tags?: string[];
    steps: CreateTestStepInput[];
  };
}

export interface ImportTestSuiteRequest {
  yaml: string;
  applicationId: string;
}
