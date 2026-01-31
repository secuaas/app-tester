import type { ExecutionStatus } from '@prisma/client';

// ============== EXECUTION ENGINE ==============

export interface ExecutionContext {
  executionId: string;
  testSuiteId: string;
  environmentId: string;
  credentialId?: string;
  baseUrl: string;
  variables: Record<string, any>;
  headers: Record<string, string>;
}

export interface StepExecutionResult {
  stepId: string;
  stepName: string;
  status: 'PASSED' | 'FAILED' | 'ERROR';
  startedAt: Date;
  completedAt: Date;
  duration: number;
  request: {
    method: string;
    url: string;
    headers: Record<string, string>;
    body?: any;
  };
  response?: {
    status: number;
    headers: Record<string, string>;
    body: any;
    time: number;
  };
  assertions: AssertionResult[];
  extractedVariables: Record<string, any>;
  error?: string;
}

export interface AssertionResult {
  type: string;
  field?: string;
  operator: string;
  expected: any;
  actual: any;
  passed: boolean;
  message: string;
}

export interface ExecutionSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
}

// ============== HTTP CLIENT ==============

export interface HttpRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: any;
  timeout?: number;
}

export interface HttpResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: any;
  time: number;
}

// ============== ASSERTIONS ==============

export interface Assertion {
  type: 'status' | 'header' | 'body' | 'jsonPath' | 'responseTime';
  field?: string;
  operator: 'equals' | 'contains' | 'greaterThan' | 'lessThan' | 'exists' | 'matches';
  value: any;
}

// ============== VARIABLE EXTRACTION ==============

export interface VariableExtractor {
  name: string;
  source: 'header' | 'body' | 'jsonPath';
  path?: string;
}
