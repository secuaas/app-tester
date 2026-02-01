import fp from 'fastify-plugin';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import { FastifyInstance } from 'fastify';

export default fp(async (fastify: FastifyInstance) => {
  await fastify.register(swagger, {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'TestForge API',
        description: 'Automated Testing Platform - REST API Documentation',
        version: '1.0.0',
        contact: {
          name: 'SecuAAS',
          email: 'support@secuaas.ca',
          url: 'https://secuaas.ca',
        },
        license: {
          name: 'Proprietary',
        },
      },
      servers: [
        {
          url: 'http://localhost:3000',
          description: 'Development server',
        },
        {
          url: 'https://testforge-backend.k8s-dev.secuaas.ca',
          description: 'Development environment',
        },
        {
          url: 'https://testforge-backend.k8s-prod.secuaas.ca',
          description: 'Production environment',
        },
      ],
      tags: [
        { name: 'Authentication', description: 'Auth endpoints (JWT, API Keys)' },
        { name: 'Applications', description: 'Application management' },
        { name: 'Environments', description: 'Environment configuration' },
        { name: 'Tests', description: 'Test suite management' },
        { name: 'Test Steps', description: 'Test step configuration' },
        { name: 'Executions', description: 'Test execution and results' },
        { name: 'Credentials', description: 'Secure credential storage (AES-256-GCM)' },
        { name: 'Health', description: 'Health check and monitoring' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'JWT token obtained from /auth/login',
          },
          apiKey: {
            type: 'apiKey',
            name: 'X-API-Key',
            in: 'header',
            description: 'API Key for service-to-service authentication',
          },
        },
        schemas: {
          Error: {
            type: 'object',
            properties: {
              statusCode: { type: 'number' },
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
          User: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              email: { type: 'string', format: 'email' },
              name: { type: 'string' },
              role: { type: 'string', enum: ['ADMIN', 'USER', 'VIEWER'] },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
          Application: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              name: { type: 'string' },
              description: { type: 'string', nullable: true },
              url: { type: 'string', format: 'uri' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
          Test: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              name: { type: 'string' },
              description: { type: 'string', nullable: true },
              type: { type: 'string', enum: ['API', 'E2E'] },
              isActive: { type: 'boolean' },
              applicationId: { type: 'string', format: 'uuid' },
              tags: { type: 'array', items: { type: 'string' } },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
          Execution: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              status: { type: 'string', enum: ['PENDING', 'RUNNING', 'SUCCESS', 'FAILED', 'CANCELLED'] },
              startedAt: { type: 'string', format: 'date-time', nullable: true },
              completedAt: { type: 'string', format: 'date-time', nullable: true },
              duration: { type: 'number', nullable: true },
              stepsTotal: { type: 'number' },
              stepsCompleted: { type: 'number' },
              stepsFailed: { type: 'number' },
              error: { type: 'string', nullable: true },
            },
          },
        },
      },
      security: [
        { bearerAuth: [] },
        { apiKey: [] },
      ],
    },
  });

  await fastify.register(swaggerUI, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
      defaultModelsExpandDepth: 3,
      defaultModelExpandDepth: 3,
      displayRequestDuration: true,
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
  });
});
