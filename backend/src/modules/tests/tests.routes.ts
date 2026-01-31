import type { FastifyInstance } from 'fastify';
import { testsController } from './tests.controller';

export async function testsRoutes(app: FastifyInstance) {
  // Test Suites
  app.get('/tests', testsController.listTestSuites.bind(testsController));
  app.post('/tests', testsController.createTestSuite.bind(testsController));
  app.get('/tests/:id', testsController.getTestSuite.bind(testsController));
  app.put('/tests/:id', testsController.updateTestSuite.bind(testsController));
  app.delete('/tests/:id', testsController.deleteTestSuite.bind(testsController));
  app.post('/tests/:id/duplicate', testsController.duplicateTestSuite.bind(testsController));

  // Import/Export
  app.get('/tests/:id/export', testsController.exportTestSuite.bind(testsController));
  app.post('/tests/import', testsController.importTestSuite.bind(testsController));

  // Test Steps
  app.post('/tests/:testSuiteId/steps', testsController.createTestStep.bind(testsController));
  app.put('/steps/:id', testsController.updateTestStep.bind(testsController));
  app.delete('/steps/:id', testsController.deleteTestStep.bind(testsController));
  app.put('/tests/:testSuiteId/steps/reorder', testsController.reorderTestSteps.bind(testsController));

  // Test Execution
  app.post('/tests/:id/execute', testsController.executeTestSuite.bind(testsController));
  app.get('/executions/:id', testsController.getExecution.bind(testsController));
  app.get('/executions', testsController.listExecutions.bind(testsController));
}
