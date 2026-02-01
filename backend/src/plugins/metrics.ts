import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';
import client from 'prom-client';

// Create a Registry
const register = new client.Registry();

// Add default metrics
client.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
  registers: [register],
});

const httpRequestTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

const testExecutionsTotal = new client.Counter({
  name: 'test_executions_total',
  help: 'Total number of test executions',
  labelNames: ['status', 'test_type'],
  registers: [register],
});

const testExecutionDuration = new client.Histogram({
  name: 'test_execution_duration_seconds',
  help: 'Duration of test executions in seconds',
  labelNames: ['test_type', 'status'],
  buckets: [1, 5, 10, 30, 60, 120, 300],
  registers: [register],
});

const activeTests = new client.Gauge({
  name: 'active_tests_total',
  help: 'Number of currently active tests',
  registers: [register],
});

const credentialsTotal = new client.Gauge({
  name: 'credentials_total',
  help: 'Total number of stored credentials',
  labelNames: ['type'],
  registers: [register],
});

export default fp(async (fastify: FastifyInstance) => {
  // Add metrics endpoint
  fastify.get('/metrics', async (request, reply) => {
    reply.header('Content-Type', register.contentType);
    return register.metrics();
  });

  // Add request duration hook
  fastify.addHook('onRequest', async (request, reply) => {
    (request as any).startTime = Date.now();
  });

  fastify.addHook('onResponse', async (request, reply) => {
    const duration = (Date.now() - (request as any).startTime) / 1000;
    const route = request.routeOptions?.url || request.url;
    const method = request.method;
    const statusCode = reply.statusCode.toString();

    httpRequestDuration.observe(
      { method, route, status_code: statusCode },
      duration
    );

    httpRequestTotal.inc({ method, route, status_code: statusCode });
  });

  // Export metrics functions for use in other modules
  fastify.decorate('metrics', {
    register,
    httpRequestDuration,
    httpRequestTotal,
    testExecutionsTotal,
    testExecutionDuration,
    activeTests,
    credentialsTotal,
  });
});

declare module 'fastify' {
  interface FastifyInstance {
    metrics: {
      register: client.Registry;
      httpRequestDuration: client.Histogram;
      httpRequestTotal: client.Counter;
      testExecutionsTotal: client.Counter;
      testExecutionDuration: client.Histogram;
      activeTests: client.Gauge;
      credentialsTotal: client.Gauge;
    };
  }
}
