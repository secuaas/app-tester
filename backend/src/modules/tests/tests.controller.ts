import type { FastifyRequest, FastifyReply } from 'fastify';
import { testsService } from './tests.service';
import type {
  CreateTestSuiteRequest,
  UpdateTestSuiteRequest,
  CreateTestStepInput,
  UpdateTestStepRequest,
  ExecuteTestRequest,
  ImportTestSuiteRequest,
} from './tests.types';

export class TestsController {
  // ============== TEST SUITES ==============

  /**
   * GET /tests
   */
  async listTestSuites(
    request: FastifyRequest<{
      Querystring: {
        applicationId?: string;
        type?: string;
        isActive?: string;
        tags?: string;
      };
    }>,
    reply: FastifyReply
  ) {
    try {
      await request.jwtVerify();

      const filters: any = {};

      if (request.query.applicationId) {
        filters.applicationId = request.query.applicationId;
      }

      if (request.query.type) {
        filters.type = request.query.type;
      }

      if (request.query.isActive !== undefined) {
        filters.isActive = request.query.isActive === 'true';
      }

      if (request.query.tags) {
        filters.tags = request.query.tags.split(',');
      }

      const testSuites = await testsService.listTestSuites(filters);

      return reply.send({ data: testSuites });
    } catch (error: any) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: error.message,
      });
    }
  }

  /**
   * POST /tests
   */
  async createTestSuite(
    request: FastifyRequest<{ Body: CreateTestSuiteRequest }>,
    reply: FastifyReply
  ) {
    try {
      await request.jwtVerify();
      const userId = (request.user as any).sub;

      const testSuite = await testsService.createTestSuite(request.body, userId);

      return reply.status(201).send(testSuite);
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
          message: 'A test suite with this name already exists',
        });
      }
      return reply.status(400).send({
        error: 'Bad Request',
        message: error.message,
      });
    }
  }

  /**
   * GET /tests/:id
   */
  async getTestSuite(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    try {
      await request.jwtVerify();

      const testSuite = await testsService.getTestSuiteById(request.params.id);

      return reply.send(testSuite);
    } catch (error: any) {
      if (error.message === 'Test suite not found') {
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
   * PUT /tests/:id
   */
  async updateTestSuite(
    request: FastifyRequest<{
      Params: { id: string };
      Body: UpdateTestSuiteRequest;
    }>,
    reply: FastifyReply
  ) {
    try {
      await request.jwtVerify();
      const userId = (request.user as any).sub;

      const testSuite = await testsService.updateTestSuite(
        request.params.id,
        request.body,
        userId
      );

      return reply.send(testSuite);
    } catch (error: any) {
      if (error.code === 'P2025') {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Test suite not found',
        });
      }
      return reply.status(400).send({
        error: 'Bad Request',
        message: error.message,
      });
    }
  }

  /**
   * DELETE /tests/:id
   */
  async deleteTestSuite(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    try {
      await request.jwtVerify();
      const userId = (request.user as any).sub;

      await testsService.deleteTestSuite(request.params.id, userId);

      return reply.status(204).send();
    } catch (error: any) {
      if (error.message === 'Test suite not found') {
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
   * POST /tests/:id/duplicate
   */
  async duplicateTestSuite(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    try {
      await request.jwtVerify();
      const userId = (request.user as any).sub;

      const duplicate = await testsService.duplicateTestSuite(
        request.params.id,
        userId
      );

      return reply.status(201).send(duplicate);
    } catch (error: any) {
      if (error.message === 'Test suite not found') {
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

  // ============== TEST STEPS ==============

  /**
   * POST /tests/:testSuiteId/steps
   */
  async createTestStep(
    request: FastifyRequest<{
      Params: { testSuiteId: string };
      Body: CreateTestStepInput;
    }>,
    reply: FastifyReply
  ) {
    try {
      await request.jwtVerify();
      const userId = (request.user as any).sub;

      const step = await testsService.createTestStep(
        request.params.testSuiteId,
        request.body,
        userId
      );

      return reply.status(201).send(step);
    } catch (error: any) {
      if (error.message === 'Test suite not found') {
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
   * PUT /steps/:id
   */
  async updateTestStep(
    request: FastifyRequest<{
      Params: { id: string };
      Body: UpdateTestStepRequest;
    }>,
    reply: FastifyReply
  ) {
    try {
      await request.jwtVerify();
      const userId = (request.user as any).sub;

      const step = await testsService.updateTestStep(
        request.params.id,
        request.body,
        userId
      );

      return reply.send(step);
    } catch (error: any) {
      if (error.code === 'P2025') {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Test step not found',
        });
      }
      return reply.status(400).send({
        error: 'Bad Request',
        message: error.message,
      });
    }
  }

  /**
   * DELETE /steps/:id
   */
  async deleteTestStep(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    try {
      await request.jwtVerify();
      const userId = (request.user as any).sub;

      await testsService.deleteTestStep(request.params.id, userId);

      return reply.status(204).send();
    } catch (error: any) {
      if (error.message === 'Test step not found') {
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
   * PUT /tests/:testSuiteId/steps/reorder
   */
  async reorderTestSteps(
    request: FastifyRequest<{
      Params: { testSuiteId: string };
      Body: { stepIds: string[] };
    }>,
    reply: FastifyReply
  ) {
    try {
      await request.jwtVerify();
      const userId = (request.user as any).sub;

      await testsService.reorderTestSteps(
        request.params.testSuiteId,
        request.body.stepIds,
        userId
      );

      return reply.send({ success: true });
    } catch (error: any) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: error.message,
      });
    }
  }

  // ============== IMPORT/EXPORT ==============

  /**
   * GET /tests/:id/export
   */
  async exportTestSuite(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    try {
      await request.jwtVerify();

      const yaml = await testsService.exportTestSuite(request.params.id);

      return reply
        .header('Content-Type', 'application/x-yaml')
        .header(
          'Content-Disposition',
          `attachment; filename="test-suite-${request.params.id}.yaml"`
        )
        .send(yaml);
    } catch (error: any) {
      if (error.message === 'Test suite not found') {
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
   * POST /tests/import
   */
  async importTestSuite(
    request: FastifyRequest<{ Body: ImportTestSuiteRequest }>,
    reply: FastifyReply
  ) {
    try {
      await request.jwtVerify();
      const userId = (request.user as any).sub;

      const testSuite = await testsService.importTestSuite(request.body, userId);

      return reply.status(201).send(testSuite);
    } catch (error: any) {
      if (error.message.includes('Invalid YAML')) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: error.message,
        });
      }
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

  // ============== TEST EXECUTION ==============

  /**
   * POST /tests/:id/execute
   */
  async executeTestSuite(
    request: FastifyRequest<{
      Params: { id: string };
      Body: ExecuteTestRequest;
    }>,
    reply: FastifyReply
  ) {
    try {
      await request.jwtVerify();
      const userId = (request.user as any).sub;

      const execution = await testsService.executeTestSuite(
        request.params.id,
        request.body,
        userId
      );

      return reply.status(202).send(execution);
    } catch (error: any) {
      if (
        error.message === 'Test suite not found' ||
        error.message === 'Environment not found'
      ) {
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
   * GET /executions/:id
   */
  async getExecution(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    try {
      await request.jwtVerify();

      const execution = await testsService.getExecution(request.params.id);

      return reply.send(execution);
    } catch (error: any) {
      if (error.message === 'Execution not found') {
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
   * GET /executions
   */
  async listExecutions(
    request: FastifyRequest<{
      Querystring: {
        testSuiteId?: string;
        environmentId?: string;
        status?: string;
      };
    }>,
    reply: FastifyReply
  ) {
    try {
      await request.jwtVerify();

      const executions = await testsService.listExecutions(request.query);

      return reply.send({ data: executions });
    } catch (error: any) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: error.message,
      });
    }
  }
}

export const testsController = new TestsController();
