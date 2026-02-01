#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import axios, { AxiosInstance } from 'axios';
import { z } from 'zod';

// Configuration
const API_URL = process.env.TESTFORGE_API_URL || 'http://localhost:3000/api/v1';
const API_KEY = process.env.TESTFORGE_API_KEY || '';

// Axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    ...(API_KEY && { 'X-API-Key': API_KEY }),
  },
});

// Tool definitions
const tools: Tool[] = [
  {
    name: 'list_applications',
    description: 'List all applications registered in TestForge',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'create_application',
    description: 'Create a new application in TestForge',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Application name' },
        description: { type: 'string', description: 'Application description' },
        url: { type: 'string', description: 'Application base URL' },
      },
      required: ['name', 'url'],
    },
  },
  {
    name: 'list_tests',
    description: 'List all test suites in TestForge',
    inputSchema: {
      type: 'object',
      properties: {
        applicationId: { type: 'string', description: 'Filter by application ID' },
        type: { type: 'string', enum: ['API', 'E2E'], description: 'Filter by test type' },
      },
    },
  },
  {
    name: 'create_test',
    description: 'Create a new test suite in TestForge',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Test suite name' },
        description: { type: 'string', description: 'Test suite description' },
        applicationId: { type: 'string', description: 'Application ID' },
        type: { type: 'string', enum: ['API', 'E2E'], description: 'Test type' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Tags' },
      },
      required: ['name', 'applicationId', 'type'],
    },
  },
  {
    name: 'add_test_step',
    description: 'Add a step to a test suite',
    inputSchema: {
      type: 'object',
      properties: {
        testId: { type: 'string', description: 'Test suite ID' },
        name: { type: 'string', description: 'Step name' },
        type: {
          type: 'string',
          enum: ['HTTP_REQUEST', 'ASSERTION', 'WAIT', 'NAVIGATE', 'CLICK', 'TYPE', 'SCREENSHOT'],
          description: 'Step type',
        },
        order: { type: 'number', description: 'Step order' },
        config: { type: 'object', description: 'Step configuration (JSON object)' },
      },
      required: ['testId', 'name', 'type', 'order', 'config'],
    },
  },
  {
    name: 'execute_test',
    description: 'Execute a test suite',
    inputSchema: {
      type: 'object',
      properties: {
        testId: { type: 'string', description: 'Test suite ID' },
        environmentId: { type: 'string', description: 'Environment ID (optional)' },
      },
      required: ['testId'],
    },
  },
  {
    name: 'get_execution_results',
    description: 'Get execution results for a test run',
    inputSchema: {
      type: 'object',
      properties: {
        executionId: { type: 'string', description: 'Execution ID' },
      },
      required: ['executionId'],
    },
  },
  {
    name: 'list_executions',
    description: 'List recent test executions',
    inputSchema: {
      type: 'object',
      properties: {
        applicationId: { type: 'string', description: 'Filter by application ID' },
        testId: { type: 'string', description: 'Filter by test ID' },
        status: {
          type: 'string',
          enum: ['SUCCESS', 'FAILED', 'RUNNING', 'PENDING', 'CANCELLED'],
          description: 'Filter by status',
        },
        limit: { type: 'number', description: 'Limit results (default: 10)' },
      },
    },
  },
  {
    name: 'create_credential',
    description: 'Create a new encrypted credential',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Credential name' },
        description: { type: 'string', description: 'Credential description' },
        type: {
          type: 'string',
          enum: ['API_KEY', 'PASSWORD', 'TOKEN', 'SECRET'],
          description: 'Credential type',
        },
        value: { type: 'string', description: 'Credential value (will be encrypted)' },
        applicationId: { type: 'string', description: 'Application ID' },
      },
      required: ['name', 'type', 'value', 'applicationId'],
    },
  },
];

// Tool handlers
async function handleListApplications() {
  const response = await api.get('/applications');
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(response.data, null, 2),
      },
    ],
  };
}

async function handleCreateApplication(args: any) {
  const response = await api.post('/applications', args);
  return {
    content: [
      {
        type: 'text' as const,
        text: `Application created successfully:\n${JSON.stringify(response.data, null, 2)}`,
      },
    ],
  };
}

async function handleListTests(args: any) {
  const params = new URLSearchParams();
  if (args.applicationId) params.append('applicationId', args.applicationId);
  if (args.type) params.append('type', args.type);

  const response = await api.get(`/tests?${params.toString()}`);
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(response.data, null, 2),
      },
    ],
  };
}

async function handleCreateTest(args: any) {
  const response = await api.post('/tests', args);
  return {
    content: [
      {
        type: 'text' as const,
        text: `Test suite created successfully:\n${JSON.stringify(response.data, null, 2)}`,
      },
    ],
  };
}

async function handleAddTestStep(args: any) {
  const { testId, ...stepData } = args;
  const response = await api.post(`/tests/${testId}/steps`, stepData);
  return {
    content: [
      {
        type: 'text' as const,
        text: `Test step added successfully:\n${JSON.stringify(response.data, null, 2)}`,
      },
    ],
  };
}

async function handleExecuteTest(args: any) {
  const { testId, ...executeData } = args;
  const response = await api.post(`/tests/${testId}/execute`, executeData);
  return {
    content: [
      {
        type: 'text' as const,
        text: `Test execution started:\n${JSON.stringify(response.data, null, 2)}`,
      },
    ],
  };
}

async function handleGetExecutionResults(args: any) {
  const response = await api.get(`/executions/${args.executionId}/results`);
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(response.data, null, 2),
      },
    ],
  };
}

async function handleListExecutions(args: any) {
  const params = new URLSearchParams();
  if (args.applicationId) params.append('applicationId', args.applicationId);
  if (args.testId) params.append('testId', args.testId);
  if (args.status) params.append('status', args.status);
  if (args.limit) params.append('limit', args.limit.toString());

  const response = await api.get(`/executions?${params.toString()}`);
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(response.data, null, 2),
      },
    ],
  };
}

async function handleCreateCredential(args: any) {
  const response = await api.post('/credentials', args);
  return {
    content: [
      {
        type: 'text' as const,
        text: `Credential created successfully (encrypted):\n${JSON.stringify(response.data, null, 2)}`,
      },
    ],
  };
}

// Main server setup
const server = new Server(
  {
    name: 'testforge',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    switch (name) {
      case 'list_applications':
        return await handleListApplications();

      case 'create_application':
        return await handleCreateApplication(args);

      case 'list_tests':
        return await handleListTests(args);

      case 'create_test':
        return await handleCreateTest(args);

      case 'add_test_step':
        return await handleAddTestStep(args);

      case 'execute_test':
        return await handleExecuteTest(args);

      case 'get_execution_results':
        return await handleGetExecutionResults(args);

      case 'list_executions':
        return await handleListExecutions(args);

      case 'create_credential':
        return await handleCreateCredential(args);

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
    const errorDetails = error.response?.data || {};

    return {
      content: [
        {
          type: 'text' as const,
          text: `Error: ${errorMessage}\n\nDetails: ${JSON.stringify(errorDetails, null, 2)}`,
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('TestForge MCP Server running on stdio');
  console.error(`API URL: ${API_URL}`);
  console.error(`API Key configured: ${!!API_KEY}`);
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
