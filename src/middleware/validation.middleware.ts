import { Request, Response, NextFunction } from 'express';
import { config } from '../config/env.config';
import { logger } from '../config/logger.config';

/**
 * Middleware to validate webhook requests
 * Checks for webhook secret in headers
 */
export const validateWebhook = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const webhookSecret = req.headers['x-webhook-secret'] || req.headers['authorization'];

    if (!webhookSecret) {
      logger.warn('Webhook request received without secret');
      res.status(401).json({
        success: false,
        error: 'Unauthorized: Missing webhook secret',
      });
      return;
    }

    // Simple secret comparison
    const providedSecret = webhookSecret.toString().replace('Bearer ', '');
    
    if (providedSecret !== config.webhookSecret) {
      logger.warn('Webhook request with invalid secret');
      res.status(401).json({
        success: false,
        error: 'Unauthorized: Invalid webhook secret',
      });
      return;
    }

    next();
  } catch (error) {
    logger.error('Error in webhook validation:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

/**
 * Middleware to validate request payload
 */
export const validatePayload = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const { event, data } = req.body;

    if (!event || !data) {
      logger.warn('Invalid webhook payload structure');
      res.status(400).json({
        success: false,
        error: 'Invalid payload structure',
      });
      return;
    }

    next();
  } catch (error) {
    logger.error('Error in payload validation:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};
