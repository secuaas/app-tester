import type { FastifyRequest, FastifyReply } from 'fastify';
import { authService } from './auth.service';
import type { LoginRequest, CreateApiKeyRequest } from './auth.types';

export class AuthController {
  /**
   * POST /auth/login
   */
  async login(
    request: FastifyRequest<{ Body: LoginRequest }>,
    reply: FastifyReply
  ) {
    try {
      const user = await authService.login(request.body);

      // Sign JWT token
      const accessToken = request.server.jwt.sign(
        { sub: user.id, email: user.email, role: user.role },
        { expiresIn: '1h' }
      );

      const refreshToken = request.server.jwt.sign(
        { sub: user.id, type: 'refresh' },
        { expiresIn: '7d' }
      );

      return reply.send({
        accessToken,
        refreshToken,
        expiresIn: 3600, // 1 hour in seconds
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      });
    } catch (error: any) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: error.message,
      });
    }
  }

  /**
   * POST /auth/refresh
   */
  async refresh(
    request: FastifyRequest<{ Body: { refreshToken: string } }>,
    reply: FastifyReply
  ) {
    try {
      const decoded = request.server.jwt.verify(request.body.refreshToken) as any;

      if (decoded.type !== 'refresh') {
        throw new Error('Invalid refresh token');
      }

      const user = await authService.getUserById(decoded.sub);

      const accessToken = request.server.jwt.sign(
        { sub: user.id, email: user.email, role: user.role },
        { expiresIn: '1h' }
      );

      const refreshToken = request.server.jwt.sign(
        { sub: user.id, type: 'refresh' },
        { expiresIn: '7d' }
      );

      return reply.send({
        accessToken,
        refreshToken,
        expiresIn: 3600,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      });
    } catch (error: any) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Invalid or expired refresh token',
      });
    }
  }

  /**
   * GET /auth/me
   */
  async me(request: FastifyRequest, reply: FastifyReply) {
    try {
      await request.jwtVerify();
      const userId = (request.user as any).sub;

      const user = await authService.getUserById(userId);

      return reply.send({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      });
    } catch (error: any) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Invalid or missing token',
      });
    }
  }

  /**
   * GET /api-keys
   */
  async listApiKeys(request: FastifyRequest, reply: FastifyReply) {
    try {
      await request.jwtVerify();
      const userId = (request.user as any).sub;

      const keys = await authService.listApiKeys(userId);

      return reply.send(keys);
    } catch (error: any) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Invalid or missing token',
      });
    }
  }

  /**
   * POST /api-keys
   */
  async createApiKey(
    request: FastifyRequest<{ Body: CreateApiKeyRequest }>,
    reply: FastifyReply
  ) {
    try {
      await request.jwtVerify();
      const userId = (request.user as any).sub;

      const apiKey = await authService.createApiKey(userId, request.body);

      return reply.status(201).send(apiKey);
    } catch (error: any) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Invalid or missing token',
      });
    }
  }

  /**
   * DELETE /api-keys/:id
   */
  async revokeApiKey(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    try {
      await request.jwtVerify();
      const userId = (request.user as any).sub;

      await authService.revokeApiKey(request.params.id, userId);

      return reply.status(204).send();
    } catch (error: any) {
      if (error.message === 'API key not found') {
        return reply.status(404).send({ error: 'Not Found', message: error.message });
      }
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Invalid or missing token',
      });
    }
  }
}

export const authController = new AuthController();
