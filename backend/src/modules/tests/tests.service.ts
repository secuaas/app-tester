import { prisma } from '../../common/utils/prisma';
import type {
  CreateTestSuiteRequest,
  UpdateTestSuiteRequest,
  CreateTestStepInput,
  UpdateTestStepRequest,
  ExecuteTestRequest,
  ImportTestSuiteRequest,
  TestSuiteExport,
} from './tests.types';
import * as yaml from 'js-yaml';

export class TestsService {
  // ============== TEST SUITES ==============

  /**
   * Create a new test suite
   */
  async createTestSuite(data: CreateTestSuiteRequest, userId: string) {
    // Verify application exists
    const app = await prisma.application.findUnique({
      where: { id: data.applicationId },
    });

    if (!app) {
      throw new Error('Application not found');
    }

    const testSuite = await prisma.testSuite.create({
      data: {
        name: data.name,
        description: data.description,
        applicationId: data.applicationId,
        type: data.type,
        isActive: data.isActive ?? true,
        tags: data.tags || [],
        steps: data.steps
          ? {
              create: data.steps.map((step) => ({
                name: step.name,
                description: step.description,
                order: step.order,
                endpoint: step.endpoint,
                method: step.method,
                headers: step.headers || {},
                body: step.body || null,
                assertions: (step.assertions || []) as any,
                extractVariables: (step.extractVariables || []) as any,
              })),
            }
          : undefined,
      },
      include: {
        steps: {
          orderBy: { order: 'asc' },
        },
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: 'testSuite.create',
        entityType: 'TestSuite',
        entityId: testSuite.id,
        userId,
        details: { name: testSuite.name, applicationId: data.applicationId },
      },
    });

    return testSuite;
  }

  /**
   * List all test suites
   */
  async listTestSuites(filters?: {
    applicationId?: string;
    type?: string;
    isActive?: boolean;
    tags?: string[];
  }) {
    const where: any = {};

    if (filters?.applicationId) {
      where.applicationId = filters.applicationId;
    }

    if (filters?.type) {
      where.type = filters.type;
    }

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters?.tags && filters.tags.length > 0) {
      where.tags = {
        hasSome: filters.tags,
      };
    }

    const testSuites = await prisma.testSuite.findMany({
      where,
      include: {
        application: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            steps: true,
            executions: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Get last execution for each test suite
    const testSuitesWithLastExecution = await Promise.all(
      testSuites.map(async (suite) => {
        const lastExecution = await prisma.execution.findFirst({
          where: {
            testSuiteId: suite.id,
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
          ...suite,
          stepCount: suite._count.steps,
          executionCount: suite._count.executions,
          lastExecution,
        };
      })
    );

    return testSuitesWithLastExecution;
  }

  /**
   * Get test suite by ID
   */
  async getTestSuiteById(id: string) {
    const testSuite = await prisma.testSuite.findUnique({
      where: { id },
      include: {
        application: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        steps: {
          orderBy: { order: 'asc' },
        },
        _count: {
          select: {
            steps: true,
            executions: true,
          },
        },
      },
    });

    if (!testSuite) {
      throw new Error('Test suite not found');
    }

    // Get recent executions
    const recentExecutions = await prisma.execution.findMany({
      where: {
        testSuiteId: id,
      },
      take: 10,
      orderBy: {
        startedAt: 'desc',
      },
      include: {
        environment: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return {
      ...testSuite,
      stepCount: testSuite._count.steps,
      executionCount: testSuite._count.executions,
      recentExecutions,
    };
  }

  /**
   * Update test suite
   */
  async updateTestSuite(id: string, data: UpdateTestSuiteRequest, userId: string) {
    const testSuite = await prisma.testSuite.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        isActive: data.isActive,
        tags: data.tags,
      },
      include: {
        steps: {
          orderBy: { order: 'asc' },
        },
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: 'testSuite.update',
        entityType: 'TestSuite',
        entityId: id,
        userId,
        details: data as any,
      },
    });

    return testSuite;
  }

  /**
   * Delete test suite
   */
  async deleteTestSuite(id: string, userId: string) {
    const testSuite = await prisma.testSuite.findUnique({
      where: { id },
      select: { name: true },
    });

    if (!testSuite) {
      throw new Error('Test suite not found');
    }

    await prisma.testSuite.delete({
      where: { id },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: 'testSuite.delete',
        entityType: 'TestSuite',
        entityId: id,
        userId,
        details: { name: testSuite.name },
      },
    });

    return { success: true };
  }

  /**
   * Duplicate test suite
   */
  async duplicateTestSuite(id: string, userId: string) {
    const original = await prisma.testSuite.findUnique({
      where: { id },
      include: {
        steps: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!original) {
      throw new Error('Test suite not found');
    }

    const duplicate = await prisma.testSuite.create({
      data: {
        name: `${original.name} (Copy)`,
        description: original.description,
        applicationId: original.applicationId,
        type: original.type,
        isActive: false,
        tags: original.tags,
        steps: {
          create: original.steps.map((step) => ({
            name: step.name,
            description: step.description,
            order: step.order,
            endpoint: step.endpoint,
            method: step.method,
            headers: step.headers as any,
            body: step.body as any,
            assertions: step.assertions as any,
            extractVariables: step.extractVariables as any,
          })),
        },
      },
      include: {
        steps: {
          orderBy: { order: 'asc' },
        },
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: 'testSuite.duplicate',
        entityType: 'TestSuite',
        entityId: duplicate.id,
        userId,
        details: { originalId: id, name: duplicate.name },
      },
    });

    return duplicate;
  }

  // ============== TEST STEPS ==============

  /**
   * Create test step
   */
  async createTestStep(testSuiteId: string, data: CreateTestStepInput, userId: string) {
    // Verify test suite exists
    const testSuite = await prisma.testSuite.findUnique({
      where: { id: testSuiteId },
    });

    if (!testSuite) {
      throw new Error('Test suite not found');
    }

    const step = await prisma.testStep.create({
      data: {
        testSuiteId,
        name: data.name,
        description: data.description,
        order: data.order,
        endpoint: data.endpoint,
        method: data.method,
        headers: (data.headers || {}) as any,
        body: data.body || null,
        assertions: (data.assertions || []) as any,
        extractVariables: (data.extractVariables || []) as any,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: 'testStep.create',
        entityType: 'TestStep',
        entityId: step.id,
        userId,
        details: { testSuiteId, name: step.name },
      },
    });

    return step;
  }

  /**
   * Update test step
   */
  async updateTestStep(id: string, data: UpdateTestStepRequest, userId: string) {
    const step = await prisma.testStep.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        order: data.order,
        endpoint: data.endpoint,
        method: data.method,
        headers: data.headers as any,
        body: data.body as any,
        assertions: data.assertions as any,
        extractVariables: data.extractVariables as any,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: 'testStep.update',
        entityType: 'TestStep',
        entityId: id,
        userId,
        details: data as any,
      },
    });

    return step;
  }

  /**
   * Delete test step
   */
  async deleteTestStep(id: string, userId: string) {
    const step = await prisma.testStep.findUnique({
      where: { id },
      select: { name: true },
    });

    if (!step) {
      throw new Error('Test step not found');
    }

    await prisma.testStep.delete({
      where: { id },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: 'testStep.delete',
        entityType: 'TestStep',
        entityId: id,
        userId,
        details: { name: step.name },
      },
    });

    return { success: true };
  }

  /**
   * Reorder test steps
   */
  async reorderTestSteps(testSuiteId: string, stepIds: string[], userId: string) {
    // Update order for each step
    await Promise.all(
      stepIds.map((stepId, index) =>
        prisma.testStep.update({
          where: { id: stepId },
          data: { order: index + 1 },
        })
      )
    );

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: 'testStep.reorder',
        entityType: 'TestSuite',
        entityId: testSuiteId,
        userId,
        details: { stepIds },
      },
    });

    return { success: true };
  }

  // ============== IMPORT/EXPORT ==============

  /**
   * Export test suite to YAML
   */
  async exportTestSuite(id: string): Promise<string> {
    const testSuite = await prisma.testSuite.findUnique({
      where: { id },
      include: {
        steps: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!testSuite) {
      throw new Error('Test suite not found');
    }

    const exportData: TestSuiteExport = {
      version: '1.0',
      testSuite: {
        name: testSuite.name,
        description: testSuite.description || undefined,
        type: testSuite.type,
        tags: testSuite.tags,
        steps: testSuite.steps.map((step) => ({
          name: step.name,
          description: step.description || undefined,
          order: step.order,
          endpoint: step.endpoint,
          method: step.method,
          headers: (step.headers as Record<string, string>) || undefined,
          body: step.body || undefined,
          assertions: step.assertions as any,
          extractVariables: step.extractVariables as any,
        })),
      },
    };

    return yaml.dump(exportData, {
      indent: 2,
      lineWidth: 120,
      noRefs: true,
    });
  }

  /**
   * Import test suite from YAML
   */
  async importTestSuite(data: ImportTestSuiteRequest, userId: string) {
    let parsed: TestSuiteExport;

    try {
      parsed = yaml.load(data.yaml) as TestSuiteExport;
    } catch (error: any) {
      throw new Error(`Invalid YAML format: ${error.message}`);
    }

    if (!parsed.testSuite || !parsed.testSuite.name) {
      throw new Error('Invalid test suite format');
    }

    // Verify application exists
    const app = await prisma.application.findUnique({
      where: { id: data.applicationId },
    });

    if (!app) {
      throw new Error('Application not found');
    }

    const testSuite = await this.createTestSuite(
      {
        name: parsed.testSuite.name,
        description: parsed.testSuite.description,
        applicationId: data.applicationId,
        type: parsed.testSuite.type,
        tags: parsed.testSuite.tags,
        steps: parsed.testSuite.steps,
      },
      userId
    );

    return testSuite;
  }

  // ============== TEST EXECUTION ==============

  /**
   * Execute test suite
   */
  async executeTestSuite(id: string, data: ExecuteTestRequest, userId: string) {
    // Verify test suite exists
    const testSuite = await prisma.testSuite.findUnique({
      where: { id },
      include: {
        steps: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!testSuite) {
      throw new Error('Test suite not found');
    }

    // Verify environment exists
    const environment = await prisma.environment.findUnique({
      where: { id: data.environmentId },
    });

    if (!environment) {
      throw new Error('Environment not found');
    }

    // Create execution record
    const execution = await prisma.execution.create({
      data: {
        testSuiteId: id,
        environmentId: data.environmentId,
        credentialId: data.credentialId,
        status: 'PENDING',
        startedAt: new Date(),
        variables: data.variables || {},
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: 'execution.create',
        entityType: 'Execution',
        entityId: execution.id,
        userId,
        details: {
          testSuiteId: id,
          environmentId: data.environmentId,
        },
      },
    });

    // Execute asynchronously (fire and forget)
    // Import dynamically to avoid circular dependencies
    import('../execution/execution-orchestrator.service').then(({ executionOrchestrator }) => {
      executionOrchestrator.executeTestSuite(execution.id, userId).catch((error) => {
        console.error(`Execution ${execution.id} failed:`, error);
      });
    });

    return execution;
  }

  /**
   * Get execution status
   */
  async getExecution(id: string) {
    const execution = await prisma.execution.findUnique({
      where: { id },
      include: {
        testSuite: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        environment: {
          select: {
            id: true,
            name: true,
            baseUrl: true,
          },
        },
        stepResults: {
          orderBy: { startedAt: 'asc' },
        },
        artifacts: true,
      },
    });

    if (!execution) {
      throw new Error('Execution not found');
    }

    return execution;
  }

  /**
   * List executions
   */
  async listExecutions(filters?: {
    testSuiteId?: string;
    environmentId?: string;
    status?: string;
  }) {
    const where: any = {};

    if (filters?.testSuiteId) {
      where.testSuiteId = filters.testSuiteId;
    }

    if (filters?.environmentId) {
      where.environmentId = filters.environmentId;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    const executions = await prisma.execution.findMany({
      where,
      include: {
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
      orderBy: {
        startedAt: 'desc',
      },
      take: 100,
    });

    return executions;
  }
}

export const testsService = new TestsService();
