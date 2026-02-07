import { Request, Response } from 'express';
import { fileUploadQueue } from '../config/queue.config';
import { logger } from '../config/logger.config';
import { WebhookPayload, UploadJobData, MediaMessage } from '../types';

class WebhookController {
  /**
   * Extract media message from WhatsApp message
   */
  private extractMediaMessage(message: any): MediaMessage | null {
    const mediaTypes = [
      'imageMessage',
      'videoMessage',
      'documentMessage',
      'audioMessage',
      'stickerMessage',
    ];

    for (const type of mediaTypes) {
      if (message[type]) {
        return message[type];
      }
    }

    return null;
  }

  /**
   * Check if message contains media
   */
  private hasMedia(messageType: string): boolean {
    const mediaTypes = [
      'imageMessage',
      'videoMessage',
      'documentMessage',
      'audioMessage',
      'stickerMessage',
    ];
    return mediaTypes.includes(messageType);
  }

  /**
   * Handle webhook POST request from Evolution API
   */
  async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      const payload: WebhookPayload = req.body;
      const { event, instance, data } = payload;

      logger.info(`Webhook received - Event: ${event}, Instance: ${instance}`);

      // Only process MESSAGES_UPSERT event
      if (event !== 'messages.upsert') {
        logger.info(`Ignoring event: ${event}`);
        res.status(200).json({
          success: true,
          message: 'Event ignored',
        });
        return;
      }

      // Check if message is from others (not from me)
      if (data.key.fromMe) {
        logger.info('Ignoring message from self');
        res.status(200).json({
          success: true,
          message: 'Self message ignored',
        });
        return;
      }

      // Check if message has media
      if (!this.hasMedia(data.messageType)) {
        logger.info(`No media in message type: ${data.messageType}`);
        res.status(200).json({
          success: true,
          message: 'No media to process',
        });
        return;
      }

      // Extract media message
      const mediaMessage = this.extractMediaMessage(data.message);

      if (!mediaMessage) {
        logger.warn('Failed to extract media message');
        res.status(200).json({
          success: true,
          message: 'No media found',
        });
        return;
      }

      // Check if we have either mediaUrl or base64
      if (!mediaMessage.mediaUrl && !mediaMessage.base64) {
        logger.warn('No mediaUrl or base64 found in message');
        res.status(200).json({
          success: true,
          message: 'No media source available',
        });
        return;
      }

      // Prepare job data
      const jobData: UploadJobData = {
        messageId: data.key.id,
        sender: data.key.remoteJid,
        senderName: data.pushName || 'Unknown',
        messageType: data.messageType,
        timestamp: data.messageTimestamp,
        mimeType: mediaMessage.mimetype,
        fileName: mediaMessage.fileName || `file_${Date.now()}`,
        caption: mediaMessage.caption,
        mediaUrl: mediaMessage.mediaUrl,
        base64: mediaMessage.base64,
        fileSize: mediaMessage.fileLength,
      };

      // Add job to queue
      const job = await fileUploadQueue.add('upload-to-drive', jobData, {
        jobId: `${instance}_${data.key.id}`,
      });

      logger.info(`Job added to queue: ${job.id}`, {
        jobId: job.id,
        sender: jobData.sender,
        messageType: jobData.messageType,
        fileName: jobData.fileName,
      });

      res.status(200).json({
        success: true,
        message: 'File queued for upload',
        jobId: job.id,
      });
    } catch (error: any) {
      logger.error('Error handling webhook:', error);
      
      // Still return 200 to Evolution API to acknowledge receipt
      res.status(200).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Health check endpoint
   */
  async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      // Get queue stats
      const waiting = await fileUploadQueue.getWaitingCount();
      const active = await fileUploadQueue.getActiveCount();
      const completed = await fileUploadQueue.getCompletedCount();
      const failed = await fileUploadQueue.getFailedCount();

      res.status(200).json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        queue: {
          waiting,
          active,
          completed,
          failed,
        },
      });
    } catch (error: any) {
      logger.error('Health check failed:', error);
      res.status(500).json({
        success: false,
        status: 'unhealthy',
        error: error.message,
      });
    }
  }

  /**
   * Get queue statistics
   */
  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const waiting = await fileUploadQueue.getWaitingCount();
      const active = await fileUploadQueue.getActiveCount();
      const completed = await fileUploadQueue.getCompletedCount();
      const failed = await fileUploadQueue.getFailedCount();
      const delayed = await fileUploadQueue.getDelayedCount();

      const waitingJobs = await fileUploadQueue.getWaiting(0, 10);
      const activeJobs = await fileUploadQueue.getActive(0, 10);
      const failedJobs = await fileUploadQueue.getFailed(0, 10);

      res.status(200).json({
        success: true,
        stats: {
          counts: {
            waiting,
            active,
            completed,
            failed,
            delayed,
          },
          recentJobs: {
            waiting: waitingJobs.map((j) => ({
              id: j.id,
              data: j.data,
              timestamp: j.timestamp,
            })),
            active: activeJobs.map((j) => ({
              id: j.id,
              data: j.data,
              timestamp: j.timestamp,
            })),
            failed: failedJobs.map((j) => ({
              id: j.id,
              data: j.data,
              failedReason: j.failedReason,
              timestamp: j.timestamp,
            })),
          },
        },
      });
    } catch (error: any) {
      logger.error('Error getting stats:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
}

export const webhookController = new WebhookController();
