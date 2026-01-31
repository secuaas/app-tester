import type { FastifyRequest, FastifyReply } from 'fastify';
import { credentialsService } from './credentials.service';
import type {
  CreateCredentialRequest,
  UpdateCredentialRequest,
} from './credentials.types';

export class CredentialsController {
  /**
   * GET /credentials
   */
  async listCredentials(
    request: FastifyRequest<{
      Querystring: { applicationId?: string; type?: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      await request.jwtVerify();

      const credentials = await credentialsService.listCredentials(request.query);

      return reply.send({ data: credentials });
    } catch (error: any) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: error.message,
      });
    }
  }

  /**
   * POST /credentials
   */
  async createCredential(
    request: FastifyRequest<{ Body: CreateCredentialRequest }>,
    reply: FastifyReply
  ) {
    try {
      await request.jwtVerify();
      const userId = (request.user as any).sub;

      const credential = await credentialsService.createCredential(
        request.body,
        userId
      );

      return reply.status(201).send(credential);
    } catch (error: any) {
      if (error.message === 'Application not found') {
        return reply.status(404).send({
          error: 'Not Found',
          message: error.message,
        });
      }
      if (error.code === 'P2002') {
        return reply.status(409).send({
          error: 'Conflict',
          message: 'A credential with this name already exists for this application',
        });
      }
      return reply.status(400).send({
        error: 'Bad Request',
        message: error.message,
      });
    }
  }

  /**
   * GET /credentials/:id
   */
  async getCredential(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    try {
      await request.jwtVerify();

      const credential = await credentialsService.getCredentialById(
        request.params.id
      );

      return reply.send(credential);
    } catch (error: any) {
      if (error.message === 'Credential not found') {
        return reply.status(404).send({
          error: 'Not Found',
          message: error.message,
        });
      }
      return reply.status(400).send({
        error: 'Bad Request',
        message: error.message,
      });
    }
  }

  /**
   * GET /credentials/:id/decrypt
   * SENSITIVE: Returns credential with decrypted data
   */
  async getCredentialWithData(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    try {
      await request.jwtVerify();
      const userId = (request.user as any).sub;

      // Only admins can decrypt credentials
      const userRole = (request.user as any).role;
      if (userRole !== 'ADMIN') {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Only administrators can decrypt credentials',
        });
      }

      const credential = await credentialsService.getCredentialWithData(
        request.params.id,
        userId
      );

      return reply.send(credential);
    } catch (error: any) {
      if (error.message === 'Credential not found') {
        return reply.status(404).send({
          error: 'Not Found',
          message: error.message,
        });
      }
      return reply.status(400).send({
        error: 'Bad Request',
        message: error.message,
      });
    }
  }

  /**
   * PUT /credentials/:id
   */
  async updateCredential(
    request: FastifyRequest<{
      Params: { id: string };
      Body: UpdateCredentialRequest;
    }>,
    reply: FastifyReply
  ) {
    try {
      await request.jwtVerify();
      const userId = (request.user as any).sub;

      const credential = await credentialsService.updateCredential(
        request.params.id,
        request.body,
        userId
      );

      return reply.send(credential);
    } catch (error: any) {
      if (error.message === 'Credential not found') {
        return reply.status(404).send({
          error: 'Not Found',
          message: error.message,
        });
      }
      return reply.status(400).send({
        error: 'Bad Request',
        message: error.message,
      });
    }
  }

  /**
   * DELETE /credentials/:id
   */
  async deleteCredential(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    try {
      await request.jwtVerify();
      const userId = (request.user as any).sub;

      await credentialsService.deleteCredential(request.params.id, userId);

      return reply.status(204).send();
    } catch (error: any) {
      if (error.message === 'Credential not found') {
        return reply.status(404).send({
          error: 'Not Found',
          message: error.message,
        });
      }
      return reply.status(400).send({
        error: 'Bad Request',
        message: error.message,
      });
    }
  }

  /**
   * POST /credentials/:id/test
   */
  async testCredential(
    request: FastifyRequest<{
      Params: { id: string };
      Body: { testUrl: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      await request.jwtVerify();
      const userId = (request.user as any).sub;

      const result = await credentialsService.testCredential(
        request.params.id,
        request.body.testUrl,
        userId
      );

      return reply.send(result);
    } catch (error: any) {
      if (error.message === 'Credential not found') {
        return reply.status(404).send({
          error: 'Not Found',
          message: error.message,
        });
      }
      return reply.status(400).send({
        error: 'Bad Request',
        message: error.message,
      });
    }
  }

  /**
   * POST /credentials/:id/rotate
   */
  async rotateCredential(
    request: FastifyRequest<{
      Params: { id: string };
      Body: { data: Record<string, any> };
    }>,
    reply: FastifyReply
  ) {
    try {
      await request.jwtVerify();
      const userId = (request.user as any).sub;

      // Only admins can rotate credentials
      const userRole = (request.user as any).role;
      if (userRole !== 'ADMIN') {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Only administrators can rotate credentials',
        });
      }

      const credential = await credentialsService.rotateCredential(
        request.params.id,
        request.body.data,
        userId
      );

      return reply.send(credential);
    } catch (error: any) {
      if (error.message === 'Credential not found') {
        return reply.status(404).send({
          error: 'Not Found',
          message: error.message,
        });
      }
      return reply.status(400).send({
        error: 'Bad Request',
        message: error.message,
      });
    }
  }
}

export const credentialsController = new CredentialsController();
