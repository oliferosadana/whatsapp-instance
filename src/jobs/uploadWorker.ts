import { Worker, Job } from 'bullmq';
import { QUEUE_NAME, queueConfig } from '../config/queue.config';
import { config } from '../config/env.config';
import { logger } from '../config/logger.config';
import { googleDriveService } from '../services/googleDrive.service';
import { folderManagerService } from '../services/folderManager.service';
import {
  downloadFromUrl,
  base64ToBuffer,
  generateUniqueFilename,
  isFileTypeAllowed,
  isFileSizeValid,
  formatFileSize,
} from '../utils/fileHandler';
import { UploadJobData, UploadResult } from '../types';

/**
 * Process file upload job
 */
const processUploadJob = async (job: Job<UploadJobData>): Promise<UploadResult> => {
  const {
    messageId,
    sender,
    senderName,
    messageType,
    timestamp,
    mimeType,
    fileName,
    caption,
    mediaUrl,
    base64,
    fileSize,
  } = job.data;

  logger.info(`Processing upload job: ${job.id}`, {
    jobId: job.id,
    sender,
    messageType,
    fileName,
  });

  try {
    // Step 1: Download or decode file
    let fileBuffer: Buffer;

    if (base64) {
      logger.info('Decoding file from base64');
      fileBuffer = base64ToBuffer(base64);
    } else if (mediaUrl) {
      logger.info(`Downloading file from URL: ${mediaUrl}`);
      fileBuffer = await downloadFromUrl(mediaUrl);
    } else {
      throw new Error('No media source available (base64 or mediaUrl)');
    }

    // Step 2: Validate file
    const actualFileSize = fileBuffer.length;
    
    // Validate file size
    if (!isFileSizeValid(actualFileSize, config.maxFileSize)) {
      throw new Error(
        `File size ${formatFileSize(actualFileSize)} exceeds maximum allowed size ${formatFileSize(config.maxFileSize)}`
      );
    }

    // Validate file type
    if (config.allowedFileTypes.length > 0 && !isFileTypeAllowed(mimeType, config.allowedFileTypes)) {
      throw new Error(`File type ${mimeType} is not allowed`);
    }

    logger.info(`File validated - Size: ${formatFileSize(actualFileSize)}, Type: ${mimeType}`);

    // Step 3: Get or create sender folder
    const folderId = await folderManagerService.getOrCreateSenderFolder(
      sender,
      senderName
    );

    logger.info(`Target folder ID: ${folderId}`);

    // Step 4: Generate unique filename
    const uniqueFileName = generateUniqueFilename(fileName, mimeType, caption);

    logger.info(`Generated filename: ${uniqueFileName}`);

    // Step 5: Upload to Google Drive
    const uploadedFileId = await googleDriveService.uploadFile({
      fileName: uniqueFileName,
      mimeType,
      folderId,
      buffer: fileBuffer,
      metadata: {
        sender,
        senderName,
        messageId,
        timestamp,
        caption,
      },
    });

    logger.info(`Upload completed successfully - File ID: ${uploadedFileId}`, {
      jobId: job.id,
      fileId: uploadedFileId,
      fileName: uniqueFileName,
      folderId,
      sender,
      senderName,
    });

    return {
      success: true,
      fileId: uploadedFileId,
      folderId,
      fileName: uniqueFileName,
      uploadedAt: new Date().toISOString(),
    };
  } catch (error: any) {
    logger.error(`Upload job failed: ${job.id}`, {
      jobId: job.id,
      error: error.message,
      stack: error.stack,
      sender,
      fileName,
    });

    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Create and start the worker
 */
export const startWorker = () => {
  const worker = new Worker<UploadJobData, UploadResult>(
    QUEUE_NAME,
    async (job) => {
      return await processUploadJob(job);
    },
    {
      connection: queueConfig.connection,
      concurrency: config.queueConcurrency,
      limiter: {
        max: 10,
        duration: 1000, // 10 jobs per second max
      },
    }
  );

  // Worker event handlers
  worker.on('ready', () => {
    logger.info(`Worker started and ready to process jobs (concurrency: ${config.queueConcurrency})`);
  });

  worker.on('active', (job) => {
    logger.info(`Job ${job.id} started processing`);
  });

  worker.on('completed', (job, result) => {
    if (result.success) {
      logger.info(`Job ${job.id} completed successfully`, {
        jobId: job.id,
        fileId: result.fileId,
        fileName: result.fileName,
      });
    } else {
      logger.warn(`Job ${job.id} completed with errors`, {
        jobId: job.id,
        error: result.error,
      });
    }
  });

  worker.on('failed', (job, error) => {
    if (job) {
      logger.error(`Job ${job.id} failed after ${job.attemptsMade} attempts`, {
        jobId: job.id,
        error: error.message,
        attemptsMade: job.attemptsMade,
        maxAttempts: config.queueMaxAttempts,
      });
    } else {
      logger.error('Job failed with unknown job reference', { error: error.message });
    }
  });

  worker.on('error', (error) => {
    logger.error('Worker error:', error);
  });

  worker.on('stalled', (jobId) => {
    logger.warn(`Job ${jobId} has stalled`);
  });

  // Graceful shutdown
  const gracefulShutdown = async () => {
    logger.info('Gracefully shutting down worker...');
    await worker.close();
    process.exit(0);
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);

  return worker;
};

// If this file is run directly, start the worker
if (require.main === module) {
  logger.info('Starting upload worker...');
  startWorker();
}
