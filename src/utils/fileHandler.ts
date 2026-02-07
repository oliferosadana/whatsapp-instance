import axios from 'axios';
import { logger } from '../config/logger.config';

/**
 * Download file from URL and return as Buffer
 */
export const downloadFromUrl = async (url: string): Promise<Buffer> => {
  try {
    logger.info(`Downloading file from: ${url}`);

    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 60000, // 60 seconds timeout
      maxContentLength: 100 * 1024 * 1024, // 100MB max
    });

    const buffer = Buffer.from(response.data);
    logger.info(`File downloaded successfully, size: ${buffer.length} bytes`);

    return buffer;
  } catch (error: any) {
    logger.error(`Failed to download file from ${url}:`, error.message);
    throw new Error(`Download failed: ${error.message}`);
  }
};

/**
 * Convert base64 string to Buffer
 */
export const base64ToBuffer = (base64String: string): Buffer => {
  try {
    // Remove data URL prefix if present (e.g., "data:image/jpeg;base64,")
    const base64Data = base64String.replace(/^data:.*?;base64,/, '');
    
    const buffer = Buffer.from(base64Data, 'base64');
    logger.info(`Base64 converted to buffer, size: ${buffer.length} bytes`);

    return buffer;
  } catch (error: any) {
    logger.error('Failed to convert base64 to buffer:', error.message);
    throw new Error(`Base64 conversion failed: ${error.message}`);
  }
};

/**
 * Sanitize filename to be safe for file systems
 */
export const sanitizeFilename = (filename: string): string => {
  // Replace invalid characters
  let sanitized = filename.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_');
  
  // Remove leading/trailing dots and spaces
  sanitized = sanitized.replace(/^[.\s]+|[.\s]+$/g, '');
  
  // Limit length to 255 characters
  if (sanitized.length > 255) {
    const ext = getFileExtension(sanitized);
    const nameWithoutExt = sanitized.substring(0, 255 - ext.length - 1);
    sanitized = `${nameWithoutExt}.${ext}`;
  }
  
  return sanitized || 'unnamed_file';
};

/**
 * Get file extension from filename
 */
export const getFileExtension = (filename: string): string => {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) return '';
  return filename.substring(lastDot + 1);
};

/**
 * Get file extension from MIME type
 */
export const getMimeTypeExtension = (mimeType: string): string => {
  const mimeToExt: Record<string, string> = {
    // Images
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
    'image/bmp': 'bmp',
    
    // Videos
    'video/mp4': 'mp4',
    'video/mpeg': 'mpeg',
    'video/quicktime': 'mov',
    'video/x-msvideo': 'avi',
    'video/webm': 'webm',
    
    // Audio
    'audio/mpeg': 'mp3',
    'audio/ogg': 'ogg',
    'audio/wav': 'wav',
    'audio/webm': 'webm',
    'audio/aac': 'aac',
    
    // Documents
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'application/vnd.ms-powerpoint': 'ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
    'text/plain': 'txt',
    
    // Archives
    'application/zip': 'zip',
    'application/x-rar-compressed': 'rar',
    'application/x-7z-compressed': '7z',
  };

  return mimeToExt[mimeType] || 'bin';
};

/**
 * Generate a unique filename with timestamp
 */
export const generateUniqueFilename = (
  originalName: string,
  mimeType: string,
  caption?: string
): string => {
  const timestamp = Date.now();
  const ext = getFileExtension(originalName) || getMimeTypeExtension(mimeType);
  
  let baseName = originalName;
  if (baseName.includes('.')) {
    baseName = baseName.substring(0, baseName.lastIndexOf('.'));
  }
  
  // Include caption in filename if provided
  if (caption && caption.trim()) {
    const sanitizedCaption = sanitizeFilename(caption.trim()).substring(0, 50);
    baseName = `${baseName}_${sanitizedCaption}`;
  }
  
  baseName = sanitizeFilename(baseName);
  
  return `${timestamp}_${baseName}.${ext}`;
};

/**
 * Format file size to human readable format
 */
export const formatFileSize = (bytes: number): string => {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Bytes';
  
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = (bytes / Math.pow(1024, i)).toFixed(2);
  
  return `${size} ${sizes[i]}`;
};

/**
 * Validate file type against allowed types
 */
export const isFileTypeAllowed = (
  mimeType: string,
  allowedTypes: string[]
): boolean => {
  if (allowedTypes.length === 0) return true; // No restrictions
  return allowedTypes.includes(mimeType);
};

/**
 * Validate file size
 */
export const isFileSizeValid = (
  fileSize: number,
  maxSize: number
): boolean => {
  return fileSize <= maxSize;
};
