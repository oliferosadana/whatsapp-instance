import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/env.config';
import { logger } from './config/logger.config';
import { initGoogleDrive } from './config/google.config';
import { webhookController } from './controllers/webhook.controller';
import {
  validateWebhook,
  validatePayload,
} from './middleware/validation.middleware';
import { startWorker } from './jobs/uploadWorker';

class App {
  public app: Application;

  constructor() {
    this.app = express();
    this.initializeMiddlewares();
    this.initializeServices();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddlewares(): void {
    // Security middleware
    this.app.use(helmet());

    // CORS
    this.app.use(
      cors({
        origin: '*', // Configure as needed
        methods: ['GET', 'POST'],
      })
    );

    // Body parser
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));

    // Request logging
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });
      next();
    });
  }

  private initializeServices(): void {
    try {
      // Initialize Google Drive
      initGoogleDrive();
      logger.info('Google Drive initialized');

      // Start worker
      startWorker();
      logger.info('Upload worker started');
    } catch (error) {
      logger.error('Failed to initialize services:', error);
      throw error;
    }
  }

  private initializeRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req: Request, res: Response) => {
      webhookController.healthCheck(req, res);
    });

    // Stats endpoint
    this.app.get('/stats', (req: Request, res: Response) => {
      webhookController.getStats(req, res);
    });

    // Webhook endpoint
    this.app.post(
      '/webhook',
      validateWebhook,
      validatePayload,
      (req: Request, res: Response) => {
        webhookController.handleWebhook(req, res);
      }
    );

    // Root endpoint
    this.app.get('/', (req: Request, res: Response) => {
      res.json({
        success: true,
        message: 'WhatsApp to Google Drive Uploader API',
        version: '1.0.0',
        endpoints: {
          health: 'GET /health',
          stats: 'GET /stats',
          webhook: 'POST /webhook',
        },
      });
    });

    // 404 handler
    this.app.use((req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        error: 'Endpoint not found',
      });
    });
  }

  private initializeErrorHandling(): void {
    this.app.use(
      (error: Error, req: Request, res: Response, next: NextFunction) => {
        logger.error('Unhandled error:', error);
        res.status(500).json({
          success: false,
          error: 'Internal server error',
          message:
            config.nodeEnv === 'development' ? error.message : undefined,
        });
      }
    );
  }

  public listen(): void {
    this.app.listen(config.port, () => {
      logger.info(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   WhatsApp to Google Drive Uploader                      ║
║                                                           ║
║   Server running on port ${config.port}                          ║
║   Environment: ${config.nodeEnv}                            ║
║   Webhook URL: http://localhost:${config.port}/webhook           ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
      `);
    });
  }
}

// Create and start application
const application = new App();
application.listen();

// Graceful shutdown
const gracefulShutdown = () => {
  logger.info('Received shutdown signal, closing server...');
  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason: any) => {
  logger.error('Unhandled rejection:', reason);
  process.exit(1);
});

export default application;
