import Redis from 'ioredis';
import { Queue, Worker } from 'bullmq';
import { config } from './env.config';
import { logger } from './logger.config';

// Redis connection
export const redisConnection = new Redis({
  host: config.redisHost,
  port: config.redisPort,
  password: config.redisPassword,
  db: config.redisDb,
  maxRetriesPerRequest: null,
});

redisConnection.on('connect', () => {
  logger.info('Redis connected successfully');
});

redisConnection.on('error', (error) => {
  logger.error('Redis connection error:', error);
});

// Queue configuration
export const QUEUE_NAME = 'file-upload-queue';

export const queueConfig = {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: config.queueMaxAttempts,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 86400, // Keep completed jobs for 24 hours
      count: 1000,
    },
    removeOnFail: {
      age: 604800, // Keep failed jobs for 7 days
    },
  },
};

// Create queue instance
export const fileUploadQueue = new Queue(QUEUE_NAME, queueConfig);

logger.info(`Queue "${QUEUE_NAME}" initialized`);
