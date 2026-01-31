import type { FastifyInstance } from 'fastify';
import { credentialsController } from './credentials.controller';

export async function credentialsRoutes(app: FastifyInstance) {
  // Credentials CRUD
  app.get('/credentials', credentialsController.listCredentials.bind(credentialsController));
  app.post('/credentials', credentialsController.createCredential.bind(credentialsController));
  app.get('/credentials/:id', credentialsController.getCredential.bind(credentialsController));
  app.put('/credentials/:id', credentialsController.updateCredential.bind(credentialsController));
  app.delete('/credentials/:id', credentialsController.deleteCredential.bind(credentialsController));

  // Sensitive operations
  app.get('/credentials/:id/decrypt', credentialsController.getCredentialWithData.bind(credentialsController));
  app.post('/credentials/:id/test', credentialsController.testCredential.bind(credentialsController));
  app.post('/credentials/:id/rotate', credentialsController.rotateCredential.bind(credentialsController));
}
