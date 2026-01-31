import type { FastifyInstance } from 'fastify';
import { applicationsController } from './applications.controller';

export async function applicationsRoutes(app: FastifyInstance) {
  // Applications
  app.get('/applications', applicationsController.listApplications.bind(applicationsController));
  app.post('/applications', applicationsController.createApplication.bind(applicationsController));
  app.get('/applications/:id', applicationsController.getApplication.bind(applicationsController));
  app.put('/applications/:id', applicationsController.updateApplication.bind(applicationsController));
  app.delete('/applications/:id', applicationsController.deleteApplication.bind(applicationsController));
  app.get('/applications/:id/health', applicationsController.getApplicationHealth.bind(applicationsController));

  // Environments
  app.post(
    '/applications/:applicationId/environments',
    applicationsController.createEnvironment.bind(applicationsController)
  );
  app.put('/environments/:id', applicationsController.updateEnvironment.bind(applicationsController));
  app.delete('/environments/:id', applicationsController.deleteEnvironment.bind(applicationsController));
}
