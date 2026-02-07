import { googleDriveService } from './googleDrive.service';
import { config } from '../config/env.config';
import { logger } from '../config/logger.config';

class FolderManagerService {
  /**
   * Sanitize folder name to be safe for Google Drive
   */
  private sanitizeFolderName(name: string): string {
    // Replace invalid characters with underscores
    return name.replace(/[<>:"/\\|?*]/g, '_').trim();
  }

  /**
   * Extract phone number from remoteJid
   * Example: "6281234567890@s.whatsapp.net" -> "6281234567890"
   */
  private extractPhoneNumber(remoteJid: string): string {
    return remoteJid.split('@')[0];
  }

  /**
   * Generate folder name for a sender
   * Format: "SenderName_PhoneNumber" or just "PhoneNumber" if name is empty
   */
  private generateFolderName(phoneNumber: string, senderName?: string): string {
    if (senderName && senderName.trim()) {
      const sanitizedName = this.sanitizeFolderName(senderName);
      return `${sanitizedName}_${phoneNumber}`;
    }
    return phoneNumber;
  }

  /**
   * Get or create folder for a specific sender
   * Creates folder with pattern: "SenderName_PhoneNumber"
   */
  async getOrCreateSenderFolder(
    remoteJid: string,
    senderName?: string
  ): Promise<string> {
    try {
      const phoneNumber = this.extractPhoneNumber(remoteJid);
      const folderName = this.generateFolderName(phoneNumber, senderName);

      logger.info(`Getting/creating folder for sender: ${folderName}`);

      const folderId = await googleDriveService.getOrCreateFolder(
        folderName,
        config.googleDriveParentFolderId
      );

      return folderId;
    } catch (error: any) {
      logger.error(
        `Failed to get/create sender folder for ${remoteJid}:`,
        error.message
      );
      throw error;
    }
  }

  /**
   * Get folder for a sender by phone number pattern
   * Searches for folders matching the phone number
   */
  async findSenderFolder(phoneNumber: string): Promise<string | null> {
    try {
      // Try to find folder that contains the phone number
      // This is a simplified version - in production you might want to use Drive API search
      const folderName = phoneNumber;
      return await googleDriveService.findFolder(
        folderName,
        config.googleDriveParentFolderId
      );
    } catch (error: any) {
      logger.error(
        `Failed to find sender folder for ${phoneNumber}:`,
        error.message
      );
      return null;
    }
  }
}

export const folderManagerService = new FolderManagerService();
