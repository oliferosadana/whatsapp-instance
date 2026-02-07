import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

interface EnvConfig {
  // Server
  port: number;
  nodeEnv: string;

  // Evolution API
  evolutionApiUrl: string;
  evolutionApiKey: string;
  evolutionInstance: string;

  // Webhook
  webhookSecret: string;

  // Google Drive
  googleCredentialsPath: string;
  googleDriveParentFolderId: string;

  // Redis
  redisHost: string;
  redisPort: number;
  redisPassword?: string;
  redisDb: number;

  // File Upload
  maxFileSize: number;
  allowedFileTypes: string[];

  // Queue
  queueConcurrency: number;
  queueMaxAttempts: number;

  // Logging
  logLevel: string;
}

const validateEnv = (): EnvConfig => {
  const requiredEnvVars = [
    'EVOLUTION_API_URL',
    'EVOLUTION_API_KEY',
    'EVOLUTION_INSTANCE',
    'WEBHOOK_SECRET',
    'GOOGLE_APPLICATION_CREDENTIALS',
    'GOOGLE_DRIVE_PARENT_FOLDER_ID',
  ];

  const missing = requiredEnvVars.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }

  return {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',

    evolutionApiUrl: process.env.EVOLUTION_API_URL!,
    evolutionApiKey: process.env.EVOLUTION_API_KEY!,
    evolutionInstance: process.env.EVOLUTION_INSTANCE!,

    webhookSecret: process.env.WEBHOOK_SECRET!,

    googleCredentialsPath: path.resolve(
      process.env.GOOGLE_APPLICATION_CREDENTIALS!
    ),
    googleDriveParentFolderId: process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID!,

    redisHost: process.env.REDIS_HOST || 'localhost',
    redisPort: parseInt(process.env.REDIS_PORT || '6379', 10),
    redisPassword: process.env.REDIS_PASSWORD || undefined,
    redisDb: parseInt(process.env.REDIS_DB || '0', 10),

    maxFileSize: parseInt(
      process.env.MAX_FILE_SIZE || '52428800', // 50MB default
      10
    ),
    allowedFileTypes: process.env.ALLOWED_FILE_TYPES
      ? process.env.ALLOWED_FILE_TYPES.split(',')
      : [],

    queueConcurrency: parseInt(process.env.QUEUE_CONCURRENCY || '5', 10),
    queueMaxAttempts: parseInt(process.env.QUEUE_MAX_ATTEMPTS || '3', 10),

    logLevel: process.env.LOG_LEVEL || 'info',
  };
};

export const config = validateEnv();
