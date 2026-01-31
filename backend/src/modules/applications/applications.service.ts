import { prisma } from '../../common/utils/prisma';
import type {
  CreateApplicationRequest,
  UpdateApplicationRequest,
  CreateEnvironmentInput,
  UpdateEnvironmentRequest,
} from './applications.types';

export class ApplicationsService {
  /**
   * Create a new application
   */
  async createApplication(data: CreateApplicationRequest, userId: string) {
    const application = await prisma.application.create({
      data: {
        name: data.name,
        description: data.description,
        type: data.type,
        environments: data.environments
          ? {
              create: data.environments.map((env) => ({
                name: env.name,
                baseUrl: env.baseUrl,
                isActive: env.isActive ?? true,
              })),
            }
          : undefined,
      },
      include: {
        environments: true,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: 'application.create',
        entityType: 'Application',
        entityId: application.id,
        userId,
        details: { name: application.name, type: application.type },
      },
    });

    return application;
  }

  /**
   * List all applications
   */
  async listApplications(filters?: { type?: string; search?: string }) {
    const where: any = {};

    if (filters?.type) {
      where.type = filters.type;
    }

    if (filters?.search) {
      where.name = {
        contains: filters.search,
        mode: 'insensitive',
      };
    }

    const applications = await prisma.application.findMany({
      where,
      include: {
        environments: {
          select: {
            id: true,
            name: true,
            baseUrl: true,
            isActive: true,
          },
        },
        _count: {
          select: {
            testSuites: true,
            credentials: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Get last execution for each app
    const appsWithLastExecution = await Promise.all(
      applications.map(async (app) => {
        const lastExecution = await prisma.execution.findFirst({
          where: {
            testSuite: {
              applicationId: app.id,
            },
          },
          orderBy: {
            completedAt: 'desc',
          },
          select: {
            id: true,
            status: true,
            completedAt: true,
            summary: true,
          },
        });

        return {
          ...app,
          testCount: app._count.testSuites,
          credentialCount: app._count.credentials,
          lastExecution,
        };
      })
    );

    return appsWithLastExecution;
  }

  /**
   * Get application by ID
   */
  async getApplicationById(id: string) {
    const application = await prisma.application.findUnique({
      where: { id },
      include: {
        environments: {
          orderBy: { name: 'asc' },
        },
        testSuites: {
          select: {
            id: true,
            name: true,
            isActive: true,
            tags: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            testSuites: true,
            credentials: true,
          },
        },
      },
    });

    if (!application) {
      throw new Error('Application not found');
    }

    // Get recent executions
    const recentExecutions = await prisma.execution.findMany({
      where: {
        testSuite: {
          applicationId: id,
        },
      },
      take: 10,
      orderBy: {
        startedAt: 'desc',
      },
      select: {
        id: true,
        status: true,
        startedAt: true,
        completedAt: true,
        duration: true,
        summary: true,
        testSuite: {
          select: {
            id: true,
            name: true,
          },
        },
        environment: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return {
      ...application,
      testCount: application._count.testSuites,
      credentialCount: application._count.credentials,
      tests: application.testSuites,
      recentExecutions,
    };
  }

  /**
   * Update an application
   */
  async updateApplication(id: string, data: UpdateApplicationRequest, userId: string) {
    const application = await prisma.application.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        type: data.type,
      },
      include: {
        environments: true,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: 'application.update',
        entityType: 'Application',
        entityId: id,
        userId,
        details: data,
      },
    });

    return application;
  }

  /**
   * Delete an application
   */
  async deleteApplication(id: string, userId: string) {
    // Check if application exists
    const app = await prisma.application.findUnique({
      where: { id },
      select: { name: true },
    });

    if (!app) {
      throw new Error('Application not found');
    }

    // Delete (cascade will handle related records)
    await prisma.application.delete({
      where: { id },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: 'application.delete',
        entityType: 'Application',
        entityId: id,
        userId,
        details: { name: app.name },
      },
    });

    return { success: true };
  }

  /**
   * Get application health status
   */
  async getApplicationHealth(id: string) {
    const application = await prisma.application.findUnique({
      where: { id },
      include: {
        environments: true,
      },
    });

    if (!application) {
      throw new Error('Application not found');
    }

    // Get last execution per environment
    const environmentsHealth = await Promise.all(
      application.environments.map(async (env) => {
        const lastExecution = await prisma.execution.findFirst({
          where: {
            environmentId: env.id,
          },
          orderBy: {
            completedAt: 'desc',
          },
          select: {
            status: true,
            completedAt: true,
            summary: true,
          },
        });

        let status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown' = 'unknown';

        if (lastExecution) {
          if (lastExecution.status === 'PASSED') {
            status = 'healthy';
          } else if (lastExecution.status === 'FAILED') {
            const summary = lastExecution.summary as any;
            const passRate = summary?.passed / summary?.total || 0;
            status = passRate >= 0.8 ? 'degraded' : 'unhealthy';
          } else {
            status = 'unhealthy';
          }
        }

        return {
          environmentId: env.id,
          environmentName: env.name,
          status,
          lastChecked: lastExecution?.completedAt || null,
          summary: lastExecution?.summary || null,
        };
      })
    );

    // Overall status
    const statuses = environmentsHealth.map((e) => e.status);
    let overall: 'healthy' | 'degraded' | 'unhealthy' | 'unknown' = 'healthy';

    if (statuses.includes('unhealthy')) {
      overall = 'unhealthy';
    } else if (statuses.includes('degraded')) {
      overall = 'degraded';
    } else if (statuses.every((s) => s === 'unknown')) {
      overall = 'unknown';
    }

    return {
      applicationId: id,
      applicationName: application.name,
      overall,
      environments: environmentsHealth,
    };
  }

  // ============== ENVIRONMENTS ==============

  /**
   * Create environment for an application
   */
  async createEnvironment(applicationId: string, data: CreateEnvironmentInput, userId: string) {
    // Check if application exists
    const app = await prisma.application.findUnique({
      where: { id: applicationId },
    });

    if (!app) {
      throw new Error('Application not found');
    }

    const environment = await prisma.environment.create({
      data: {
        applicationId,
        name: data.name,
        baseUrl: data.baseUrl,
        isActive: data.isActive ?? true,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: 'environment.create',
        entityType: 'Environment',
        entityId: environment.id,
        userId,
        details: { applicationId, name: data.name },
      },
    });

    return environment;
  }

  /**
   * Update environment
   */
  async updateEnvironment(id: string, data: UpdateEnvironmentRequest, userId: string) {
    const environment = await prisma.environment.update({
      where: { id },
      data: {
        name: data.name,
        baseUrl: data.baseUrl,
        isActive: data.isActive,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: 'environment.update',
        entityType: 'Environment',
        entityId: id,
        userId,
        details: data,
      },
    });

    return environment;
  }

  /**
   * Delete environment
   */
  async deleteEnvironment(id: string, userId: string) {
    const env = await prisma.environment.findUnique({
      where: { id },
      select: { name: true, applicationId: true },
    });

    if (!env) {
      throw new Error('Environment not found');
    }

    await prisma.environment.delete({
      where: { id },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: 'environment.delete',
        entityType: 'Environment',
        entityId: id,
        userId,
        details: { name: env.name },
      },
    });

    return { success: true };
  }
}

export const applicationsService = new ApplicationsService();
