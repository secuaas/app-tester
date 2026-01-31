import type { FastifyInstance } from 'fastify';
import { authController } from './auth.controller';

export async function authRoutes(app: FastifyInstance) {
  // Authentication endpoints
  app.post('/auth/login', authController.login.bind(authController));
  app.post('/auth/refresh', authController.refresh.bind(authController));
  app.get('/auth/me', authController.me.bind(authController));

  // API Keys management
  app.get('/api-keys', authController.listApiKeys.bind(authController));
  app.post('/api-keys', authController.createApiKey.bind(authController));
  app.delete('/api-keys/:id', authController.revokeApiKey.bind(authController));
}
