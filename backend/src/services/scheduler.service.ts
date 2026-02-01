import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { logger } from '../common/logger';

export class SchedulerService {
  private tasks: Map<string, cron.ScheduledTask> = new Map();
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async start() {
    logger.info('Starting scheduler service...');

    // Load all schedules from database
    const schedules = await this.prisma.testSchedule.findMany({
      where: { isActive: true },
      include: { test: true },
    });

    for (const schedule of schedules) {
      this.scheduleTest(schedule);
    }

    logger.info(`Loaded ${schedules.length} active schedules`);
  }

  scheduleTest(schedule: any) {
    if (!cron.validate(schedule.cronExpression)) {
      logger.error(`Invalid cron expression for schedule ${schedule.id}: ${schedule.cronExpression}`);
      return;
    }

    const task = cron.schedule(schedule.cronExpression, async () => {
      logger.info(`Running scheduled test: ${schedule.test.name} (${schedule.id})`);

      try {
        // Create execution
        const execution = await this.prisma.execution.create({
          data: {
            testId: schedule.testId,
            environmentId: schedule.environmentId,
            status: 'PENDING',
            stepsTotal: 0,
            stepsCompleted: 0,
            stepsFailed: 0,
            triggeredBy: 'SCHEDULE',
          },
        });

        logger.info(`Created scheduled execution: ${execution.id}`);

        // Update last run timestamp
        await this.prisma.testSchedule.update({
          where: { id: schedule.id },
          data: {
            lastRunAt: new Date(),
            nextRunAt: this.getNextRunTime(schedule.cronExpression),
          },
        });
      } catch (error: any) {
        logger.error(`Failed to execute scheduled test ${schedule.id}:`, error);

        // Update error count
        await this.prisma.testSchedule.update({
          where: { id: schedule.id },
          data: {
            errorCount: { increment: 1 },
            lastError: error.message,
          },
        });
      }
    });

    this.tasks.set(schedule.id, task);
    logger.info(`Scheduled test: ${schedule.test.name} with cron: ${schedule.cronExpression}`);
  }

  cancelSchedule(scheduleId: string) {
    const task = this.tasks.get(scheduleId);
    if (task) {
      task.stop();
      this.tasks.delete(scheduleId);
      logger.info(`Cancelled schedule: ${scheduleId}`);
    }
  }

  async createSchedule(data: {
    testId: string;
    environmentId: string;
    cronExpression: string;
    isActive?: boolean;
  }) {
    if (!cron.validate(data.cronExpression)) {
      throw new Error('Invalid cron expression');
    }

    const schedule = await this.prisma.testSchedule.create({
      data: {
        ...data,
        isActive: data.isActive ?? true,
        nextRunAt: this.getNextRunTime(data.cronExpression),
        errorCount: 0,
      },
      include: { test: true },
    });

    if (schedule.isActive) {
      this.scheduleTest(schedule);
    }

    return schedule;
  }

  async updateSchedule(id: string, data: {
    cronExpression?: string;
    isActive?: boolean;
    environmentId?: string;
  }) {
    const schedule = await this.prisma.testSchedule.update({
      where: { id },
      data: {
        ...data,
        ...(data.cronExpression && {
          nextRunAt: this.getNextRunTime(data.cronExpression),
        }),
      },
      include: { test: true },
    });

    // Cancel existing schedule
    this.cancelSchedule(id);

    // Re-schedule if active
    if (schedule.isActive) {
      this.scheduleTest(schedule);
    }

    return schedule;
  }

  async deleteSchedule(id: string) {
    this.cancelSchedule(id);
    await this.prisma.testSchedule.delete({ where: { id } });
  }

  private getNextRunTime(cronExpression: string): Date {
    // Simple approximation - in production, use a proper cron parser
    const now = new Date();
    now.setMinutes(now.getMinutes() + 1);
    return now;
  }

  stop() {
    for (const [id, task] of this.tasks) {
      task.stop();
    }
    this.tasks.clear();
    logger.info('Stopped all scheduled tasks');
  }

  getActiveSchedules() {
    return Array.from(this.tasks.keys());
  }
}
