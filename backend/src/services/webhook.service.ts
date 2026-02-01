import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { logger } from '../common/logger';
import crypto from 'crypto';

export interface WebhookPayload {
  event: string;
  timestamp: string;
  data: any;
}

export class WebhookService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async sendWebhook(webhook: any, payload: WebhookPayload) {
    try {
      const signature = this.generateSignature(payload, webhook.secret);

      const response = await axios.post(webhook.url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-TestForge-Signature': signature,
          'X-TestForge-Event': payload.event,
          'User-Agent': 'TestForge-Webhook/1.0',
        },
        timeout: 10000, // 10 seconds timeout
      });

      // Log successful webhook
      await this.prisma.webhookLog.create({
        data: {
          webhookId: webhook.id,
          event: payload.event,
          status: 'SUCCESS',
          statusCode: response.status,
          requestPayload: payload,
          responseBody: response.data,
        },
      });

      logger.info(`Webhook sent successfully: ${webhook.url} (${payload.event})`);
      return true;
    } catch (error: any) {
      // Log failed webhook
      await this.prisma.webhookLog.create({
        data: {
          webhookId: webhook.id,
          event: payload.event,
          status: 'FAILED',
          statusCode: error.response?.status || 0,
          requestPayload: payload,
          responseBody: error.response?.data || error.message,
          error: error.message,
        },
      });

      logger.error(`Webhook failed: ${webhook.url}`, error.message);
      return false;
    }
  }

  async notifyExecutionStarted(execution: any) {
    const webhooks = await this.getActiveWebhooks('execution.started');

    const payload: WebhookPayload = {
      event: 'execution.started',
      timestamp: new Date().toISOString(),
      data: {
        execution: {
          id: execution.id,
          testId: execution.testId,
          testName: execution.test?.name,
          environmentId: execution.environmentId,
          status: execution.status,
          startedAt: execution.startedAt,
        },
      },
    };

    for (const webhook of webhooks) {
      await this.sendWebhook(webhook, payload);
    }
  }

  async notifyExecutionCompleted(execution: any) {
    const webhooks = await this.getActiveWebhooks('execution.completed');

    const payload: WebhookPayload = {
      event: 'execution.completed',
      timestamp: new Date().toISOString(),
      data: {
        execution: {
          id: execution.id,
          testId: execution.testId,
          testName: execution.test?.name,
          environmentId: execution.environmentId,
          status: execution.status,
          startedAt: execution.startedAt,
          completedAt: execution.completedAt,
          duration: execution.duration,
          stepsTotal: execution.stepsTotal,
          stepsCompleted: execution.stepsCompleted,
          stepsFailed: execution.stepsFailed,
          error: execution.error,
        },
      },
    };

    for (const webhook of webhooks) {
      await this.sendWebhook(webhook, payload);
    }
  }

  async notifyExecutionFailed(execution: any) {
    const webhooks = await this.getActiveWebhooks('execution.failed');

    const payload: WebhookPayload = {
      event: 'execution.failed',
      timestamp: new Date().toISOString(),
      data: {
        execution: {
          id: execution.id,
          testId: execution.testId,
          testName: execution.test?.name,
          environmentId: execution.environmentId,
          status: execution.status,
          startedAt: execution.startedAt,
          completedAt: execution.completedAt,
          duration: execution.duration,
          stepsTotal: execution.stepsTotal,
          stepsCompleted: execution.stepsCompleted,
          stepsFailed: execution.stepsFailed,
          error: execution.error,
        },
      },
    };

    for (const webhook of webhooks) {
      await this.sendWebhook(webhook, payload);
    }
  }

  private async getActiveWebhooks(event: string) {
    return this.prisma.webhook.findMany({
      where: {
        isActive: true,
        events: {
          has: event,
        },
      },
    });
  }

  private generateSignature(payload: WebhookPayload, secret: string): string {
    const payloadString = JSON.stringify(payload);
    return crypto
      .createHmac('sha256', secret)
      .update(payloadString)
      .digest('hex');
  }

  async createWebhook(data: {
    name: string;
    url: string;
    events: string[];
    secret?: string;
    isActive?: boolean;
  }) {
    const secret = data.secret || crypto.randomBytes(32).toString('hex');

    return this.prisma.webhook.create({
      data: {
        name: data.name,
        url: data.url,
        events: data.events,
        secret,
        isActive: data.isActive ?? true,
      },
    });
  }

  async updateWebhook(
    id: string,
    data: {
      name?: string;
      url?: string;
      events?: string[];
      isActive?: boolean;
    }
  ) {
    return this.prisma.webhook.update({
      where: { id },
      data,
    });
  }

  async deleteWebhook(id: string) {
    return this.prisma.webhook.delete({ where: { id } });
  }

  async getWebhookLogs(webhookId: string, limit = 50) {
    return this.prisma.webhookLog.findMany({
      where: { webhookId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
