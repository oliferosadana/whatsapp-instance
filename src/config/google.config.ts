import { google } from 'googleapis';
import { config } from './env.config';
import { logger } from './logger.config';
import fs from 'fs';

let driveClient: any = null;

export const initGoogleDrive = () => {
  try {
    // Check if credentials file exists
    if (!fs.existsSync(config.googleCredentialsPath)) {
      throw new Error(
        `Google credentials file not found at: ${config.googleCredentialsPath}`
      );
    }

    // Load credentials
    const credentials = JSON.parse(
      fs.readFileSync(config.googleCredentialsPath, 'utf-8')
    );

    // Create auth client
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: [
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/drive',
      ],
    });

    // Create Drive client
    driveClient = google.drive({ version: 'v3', auth });

    logger.info('Google Drive client initialized successfully');
    return driveClient;
  } catch (error) {
    logger.error('Failed to initialize Google Drive client:', error);
    throw error;
  }
};

export const getDriveClient = () => {
  if (!driveClient) {
    return initGoogleDrive();
  }
  return driveClient;
};
