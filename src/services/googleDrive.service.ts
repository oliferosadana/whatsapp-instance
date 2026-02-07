import { getDriveClient } from '../config/google.config';
import { logger } from '../config/logger.config';
import { Readable } from 'stream';

interface FileMetadata {
  name: string;
  mimeType: string;
  parents?: string[];
  description?: string;
}

interface UploadOptions {
  fileName: string;
  mimeType: string;
  folderId: string;
  buffer: Buffer;
  metadata?: {
    sender: string;
    senderName: string;
    messageId: string;
    timestamp: number;
    caption?: string;
  };
}

class GoogleDriveService {
  private drive: any;
  private folderCache: Map<string, string> = new Map();

  constructor() {
    this.drive = getDriveClient();
  }

  /**
   * Create a folder in Google Drive
   */
  async createFolder(
    folderName: string,
    parentId: string
  ): Promise<string> {
    try {
      const fileMetadata: FileMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentId],
      };

      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        fields: 'id, name',
      });

      const folderId = response.data.id;
      logger.info(`Folder created: ${folderName} (ID: ${folderId})`);

      // Cache the folder ID
      this.folderCache.set(`${parentId}_${folderName}`, folderId);

      return folderId;
    } catch (error: any) {
      logger.error(`Failed to create folder ${folderName}:`, error.message);
      throw error;
    }
  }

  /**
   * Find a folder by name within a parent folder
   */
  async findFolder(
    folderName: string,
    parentId: string
  ): Promise<string | null> {
    try {
      // Check cache first
      const cacheKey = `${parentId}_${folderName}`;
      if (this.folderCache.has(cacheKey)) {
        return this.folderCache.get(cacheKey)!;
      }

      const response = await this.drive.files.list({
        q: `name='${folderName}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id, name)',
        spaces: 'drive',
      });

      if (response.data.files && response.data.files.length > 0) {
        const folderId = response.data.files[0].id;
        // Cache the result
        this.folderCache.set(cacheKey, folderId);
        return folderId;
      }

      return null;
    } catch (error: any) {
      logger.error(`Failed to find folder ${folderName}:`, error.message);
      throw error;
    }
  }

  /**
   * Get or create a folder (find existing or create new)
   */
  async getOrCreateFolder(
    folderName: string,
    parentId: string
  ): Promise<string> {
    try {
      // Try to find existing folder
      const existingFolderId = await this.findFolder(folderName, parentId);

      if (existingFolderId) {
        logger.info(`Using existing folder: ${folderName}`);
        return existingFolderId;
      }

      // Create new folder if not found
      logger.info(`Creating new folder: ${folderName}`);
      return await this.createFolder(folderName, parentId);
    } catch (error: any) {
      logger.error(
        `Failed to get or create folder ${folderName}:`,
        error.message
      );
      throw error;
    }
  }

  /**
   * Upload a file to Google Drive using resumable upload
   */
  async uploadFile(options: UploadOptions): Promise<string> {
    try {
      const { fileName, mimeType, folderId, buffer, metadata } = options;

      // Create description from metadata
      const description = metadata
        ? JSON.stringify({
            whatsapp: {
              sender: metadata.sender,
              senderName: metadata.senderName,
              messageId: metadata.messageId,
              timestamp: metadata.timestamp,
              caption: metadata.caption,
            },
            uploadedAt: new Date().toISOString(),
          })
        : undefined;

      const fileMetadata: FileMetadata = {
        name: fileName,
        parents: [folderId],
        description,
      };

      // Convert buffer to stream
      const stream = Readable.from(buffer);

      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        media: {
          mimeType,
          body: stream,
        },
        fields: 'id, name, webViewLink, size',
      });

      const fileId = response.data.id;
      const fileSize = response.data.size;
      const webViewLink = response.data.webViewLink;

      logger.info(
        `File uploaded successfully: ${fileName} (ID: ${fileId}, Size: ${fileSize} bytes)`
      );

      // Log upload details
      logger.info('Upload details:', {
        fileId,
        fileName,
        webViewLink,
        sender: metadata?.sender,
        senderName: metadata?.senderName,
        messageId: metadata?.messageId,
      });

      return fileId;
    } catch (error: any) {
      logger.error(
        `Failed to upload file ${options.fileName}:`,
        error.message
      );
      
      // Handle specific Google Drive errors
      if (error.code === 403) {
        logger.error(
          'Permission denied. Check if service account has access to the folder.'
        );
      } else if (error.code === 404) {
        logger.error('Folder not found. Check folder ID.');
      } else if (error.code === 429) {
        logger.error('Rate limit exceeded. Will retry later.');
      }

      throw error;
    }
  }

  /**
   * Clear folder cache (useful for testing or manual refresh)
   */
  clearCache(): void {
    this.folderCache.clear();
    logger.info('Folder cache cleared');
  }
}

export const googleDriveService = new GoogleDriveService();
