import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { config } from './config';

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: config.logLevel,
      transport:
        config.nodeEnv === 'development'
          ? {
              target: 'pino-pretty',
              options: {
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
              },
            }
          : undefined,
    },
  });

  // CORS
  await app.register(cors, {
    origin: config.cors.origin,
    credentials: true,
  });

  // JWT
  await app.register(jwt, {
    secret: config.jwt.secret,
  });

  // Cookie (pour sessions SSO)
  await app.register(cookie, {
    secret: config.jwt.secret,
  });

  // Swagger
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'TestForge API',
        description: 'API for TestForge automated testing platform',
        version: '1.0.0',
      },
      servers: [
        {
          url: 'http://localhost:3000',
          description: 'Development',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
          apiKeyAuth: {
            type: 'apiKey',
            in: 'header',
            name: 'X-API-Key',
          },
        },
      },
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    },
  });

  // Health check
  app.get('/health', async () => {
    return {
      status: 'healthy',
      version: '1.0.0',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  });

  // API Routes
  app.get('/api/v1', async () => {
    return {
      message: 'TestForge API v1',
      docs: '/docs',
    };
  });

  // Register module routes
  const { authRoutes } = await import('./modules/auth/auth.routes');
  await app.register(authRoutes, { prefix: '/api/v1' });

  // SSO Routes (sans prefix /api/v1 car utilisées pour redirections OAuth)
  const { ssoRoutes } = await import('./modules/auth/sso.routes');
  await app.register(ssoRoutes);

  const { applicationsRoutes } = await import('./modules/applications/applications.routes');
  await app.register(applicationsRoutes, { prefix: '/api/v1' });

  const { testsRoutes } = await import('./modules/tests/tests.routes');
  await app.register(testsRoutes, { prefix: '/api/v1' });

  const { credentialsRoutes } = await import('./modules/credentials/credentials.routes');
  await app.register(credentialsRoutes, { prefix: '/api/v1' });

  // Error handler
  app.setErrorHandler((error, request, reply) => {
    request.log.error(error);
    reply.status(error.statusCode || 500).send({
      error: error.name,
      message: error.message,
      statusCode: error.statusCode || 500,
    });
  });

  return app;
}
