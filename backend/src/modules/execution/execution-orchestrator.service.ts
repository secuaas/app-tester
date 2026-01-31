import { prisma } from '../../common/utils/prisma';
import { httpService } from './http.service';
import { assertionService } from './assertion.service';
import { variableExtractorService } from './variable-extractor.service';
import { credentialsService } from '../credentials/credentials.service';
import type {
  ExecutionContext,
  StepExecutionResult,
  ExecutionSummary,
  Assertion,
  VariableExtractor,
} from './execution.types';

export class ExecutionOrchestrator {
  /**
   * Execute a test suite
   */
  async executeTestSuite(executionId: string, userId: string): Promise<void> {
    try {
      // Get execution details
      const execution = await prisma.execution.findUnique({
        where: { id: executionId },
        include: {
          testSuite: {
            include: {
              steps: {
                orderBy: { order: 'asc' },
              },
            },
          },
          environment: true,
          credential: true,
        },
      });

      if (!execution) {
        throw new Error('Execution not found');
      }

      // Update status to RUNNING
      await prisma.execution.update({
        where: { id: executionId },
        data: {
          status: 'RUNNING',
          startedAt: new Date(),
        },
      });

      // Build execution context
      const context: ExecutionContext = {
        executionId,
        testSuiteId: execution.testSuiteId,
        environmentId: execution.environmentId,
        credentialId: execution.credentialId || undefined,
        baseUrl: execution.environment.baseUrl,
        variables: (execution.variables as Record<string, any>) || {},
        headers: {},
      };

      // Apply credentials if provided
      if (execution.credential) {
        const credentialWithData = await credentialsService.getCredentialWithData(
          execution.credential.id,
          userId
        );

        context.headers = httpService.applyCredential(
          context.headers,
          credentialWithData.type,
          credentialWithData.data
        );
      }

      // Execute all steps
      const stepResults: StepExecutionResult[] = [];
      let failedSteps = 0;
      let passedSteps = 0;
      let skippedSteps = 0;

      for (const step of execution.testSuite.steps) {
        try {
          const result = await this.executeStep(step, context);
          stepResults.push(result);

          // Update context with extracted variables
          Object.assign(context.variables, result.extractedVariables);

          // Save step result to database
          await prisma.stepResult.create({
            data: {
              executionId,
              testStepId: step.id,
              status: result.status,
              startedAt: result.startedAt,
              completedAt: result.completedAt,
              duration: result.duration,
              request: result.request as any,
              response: result.response as any,
              assertions: result.assertions as any,
              extractedVariables: result.extractedVariables,
              error: result.error,
            },
          });

          if (result.status === 'PASSED') {
            passedSteps++;
          } else if (result.status === 'FAILED') {
            failedSteps++;
          } else {
            skippedSteps++;
          }
        } catch (error: any) {
          // Step execution failed catastrophically
          const result: StepExecutionResult = {
            stepId: step.id,
            stepName: step.name,
            status: 'FAILED',
            startedAt: new Date(),
            completedAt: new Date(),
            duration: 0,
            request: {
              method: step.method,
              url: '',
              headers: {},
            },
            assertions: [],
            extractedVariables: {},
            error: error.message,
          };

          stepResults.push(result);
          failedSteps++;

          await prisma.stepResult.create({
            data: {
              executionId,
              testStepId: step.id,
              status: result.status,
              startedAt: result.startedAt,
              completedAt: result.completedAt,
              duration: result.duration,
              request: result.request as any,
              error: result.error,
            },
          });
        }
      }

      // Calculate summary
      const summary: ExecutionSummary = {
        total: execution.testSuite.steps.length,
        passed: passedSteps,
        failed: failedSteps,
        skipped: skippedSteps,
        duration: stepResults.reduce((sum, r) => sum + r.duration, 0),
      };

      // Determine overall status
      const overallStatus = failedSteps > 0 ? 'FAILED' : 'PASSED';

      // Update execution with final status
      await prisma.execution.update({
        where: { id: executionId },
        data: {
          status: overallStatus,
          completedAt: new Date(),
          duration: summary.duration,
          summary: summary as any,
        },
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          action: 'execution.complete',
          entityType: 'Execution',
          entityId: executionId,
          userId,
          details: {
            status: overallStatus,
            summary,
          },
        },
      });
    } catch (error: any) {
      // Execution failed
      await prisma.execution.update({
        where: { id: executionId },
        data: {
          status: 'ERROR',
          completedAt: new Date(),
          summary: {
            error: error.message,
          } as any,
        },
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          action: 'execution.error',
          entityType: 'Execution',
          entityId: executionId,
          userId,
          details: {
            error: error.message,
          },
        },
      });

      throw error;
    }
  }

  /**
   * Execute a single test step
   */
  private async executeStep(
    step: any,
    context: ExecutionContext
  ): Promise<StepExecutionResult> {
    const startTime = new Date();

    try {
      // Build request URL
      const url = httpService.buildUrl(context.baseUrl, step.endpoint);

      // Replace variables in endpoint, headers, and body
      const endpoint = httpService.replaceVariables(step.endpoint, context.variables);
      const finalUrl = httpService.buildUrl(context.baseUrl, endpoint);

      let headers = step.headers || {};
      headers = httpService.replaceVariables(headers, context.variables);
      headers = httpService.mergeHeaders(context.headers, headers);

      let body = step.body;
      if (body) {
        body = httpService.replaceVariables(body, context.variables);
      }

      // Execute HTTP request
      const response = await httpService.executeRequest({
        method: step.method,
        url: finalUrl,
        headers,
        body,
      });

      // Validate assertions
      const assertions = step.assertions || [];
      const assertionResults = assertionService.validateAssertions(
        assertions as Assertion[],
        response
      );

      // Extract variables
      const extractors = step.extractVariables || [];
      const extractedVariables = variableExtractorService.extractVariables(
        extractors as VariableExtractor[],
        response
      );

      // Determine step status
      const failedAssertions = assertionResults.filter((a) => !a.passed);
      const status = failedAssertions.length > 0 ? 'FAILED' : 'PASSED';

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      return {
        stepId: step.id,
        stepName: step.name,
        status,
        startedAt: startTime,
        completedAt: endTime,
        duration,
        request: {
          method: step.method,
          url: finalUrl,
          headers,
          body,
        },
        response: {
          status: response.status,
          headers: response.headers,
          body: response.body,
          time: response.time,
        },
        assertions: assertionResults,
        extractedVariables,
      };
    } catch (error: any) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      return {
        stepId: step.id,
        stepName: step.name,
        status: 'FAILED',
        startedAt: startTime,
        completedAt: endTime,
        duration,
        request: {
          method: step.method,
          url: '',
          headers: {},
        },
        assertions: [],
        extractedVariables: {},
        error: error.message,
      };
    }
  }
}

export const executionOrchestrator = new ExecutionOrchestrator();
