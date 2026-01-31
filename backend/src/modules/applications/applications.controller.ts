import type { FastifyRequest, FastifyReply } from 'fastify';
import { applicationsService } from './applications.service';
import type {
  CreateApplicationRequest,
  UpdateApplicationRequest,
  CreateEnvironmentInput,
  UpdateEnvironmentRequest,
} from './applications.types';

export class ApplicationsController {
  /**
   * GET /applications
   */
  async listApplications(
    request: FastifyRequest<{
      Querystring: { type?: string; search?: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      await request.jwtVerify();

      const applications = await applicationsService.listApplications({
        type: request.query.type,
        search: request.query.search,
      });

      return reply.send({ data: applications });
    } catch (error: any) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: error.message,
      });
    }
  }

  /**
   * POST /applications
   */
  async createApplication(
    request: FastifyRequest<{ Body: CreateApplicationRequest }>,
    reply: FastifyReply
  ) {
    try {
      await request.jwtVerify();
      const userId = (request.user as any).sub;

      const application = await applicationsService.createApplication(
        request.body,
        userId
      );

      return reply.status(201).send(application);
    } catch (error: any) {
      if (error.code === 'P2002') {
        return reply.status(409).send({
          error: 'Conflict',
          message: 'An application with this name already exists',
        });
      }
      return reply.status(400).send({
        error: 'Bad Request',
        message: error.message,
      });
    }
  }

  /**
   * GET /applications/:id
   */
  async getApplication(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    try {
      await request.jwtVerify();

      const application = await applicationsService.getApplicationById(
        request.params.id
      );

      return reply.send(application);
    } catch (error: any) {
      if (error.message === 'Application not found') {
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
   * PUT /applications/:id
   */
  async updateApplication(
    request: FastifyRequest<{
      Params: { id: string };
      Body: UpdateApplicationRequest;
    }>,
    reply: FastifyReply
  ) {
    try {
      await request.jwtVerify();
      const userId = (request.user as any).sub;

      const application = await applicationsService.updateApplication(
        request.params.id,
        request.body,
        userId
      );

      return reply.send(application);
    } catch (error: any) {
      if (error.code === 'P2025') {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Application not found',
        });
      }
      if (error.code === 'P2002') {
        return reply.status(409).send({
          error: 'Conflict',
          message: 'An application with this name already exists',
        });
      }
      return reply.status(400).send({
        error: 'Bad Request',
        message: error.message,
      });
    }
  }

  /**
   * DELETE /applications/:id
   */
  async deleteApplication(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    try {
      await request.jwtVerify();
      const userId = (request.user as any).sub;

      await applicationsService.deleteApplication(request.params.id, userId);

      return reply.status(204).send();
    } catch (error: any) {
      if (error.message === 'Application not found') {
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
   * GET /applications/:id/health
   */
  async getApplicationHealth(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    try {
      await request.jwtVerify();

      const health = await applicationsService.getApplicationHealth(
        request.params.id
      );

      return reply.send(health);
    } catch (error: any) {
      if (error.message === 'Application not found') {
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

  // ============== ENVIRONMENTS ==============

  /**
   * POST /applications/:applicationId/environments
   */
  async createEnvironment(
    request: FastifyRequest<{
      Params: { applicationId: string };
      Body: CreateEnvironmentInput;
    }>,
    reply: FastifyReply
  ) {
    try {
      await request.jwtVerify();
      const userId = (request.user as any).sub;

      const environment = await applicationsService.createEnvironment(
        request.params.applicationId,
        request.body,
        userId
      );

      return reply.status(201).send(environment);
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
          message: 'An environment with this name already exists for this application',
        });
      }
      return reply.status(400).send({
        error: 'Bad Request',
        message: error.message,
      });
    }
  }

  /**
   * PUT /environments/:id
   */
  async updateEnvironment(
    request: FastifyRequest<{
      Params: { id: string };
      Body: UpdateEnvironmentRequest;
    }>,
    reply: FastifyReply
  ) {
    try {
      await request.jwtVerify();
      const userId = (request.user as any).sub;

      const environment = await applicationsService.updateEnvironment(
        request.params.id,
        request.body,
        userId
      );

      return reply.send(environment);
    } catch (error: any) {
      if (error.code === 'P2025') {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Environment not found',
        });
      }
      return reply.status(400).send({
        error: 'Bad Request',
        message: error.message,
      });
    }
  }

  /**
   * DELETE /environments/:id
   */
  async deleteEnvironment(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    try {
      await request.jwtVerify();
      const userId = (request.user as any).sub;

      await applicationsService.deleteEnvironment(request.params.id, userId);

      return reply.status(204).send();
    } catch (error: any) {
      if (error.message === 'Environment not found') {
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

export const applicationsController = new ApplicationsController();
