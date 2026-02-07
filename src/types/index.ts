export interface WhatsAppMessage {
  key: {
    remoteJid: string;
    fromMe: boolean;
    id: string;
  };
  message: {
    imageMessage?: MediaMessage;
    videoMessage?: MediaMessage;
    documentMessage?: MediaMessage;
    audioMessage?: MediaMessage;
    stickerMessage?: MediaMessage;
  };
  messageType: string;
  messageTimestamp: number;
  pushName?: string;
}

export interface MediaMessage {
  mimetype: string;
  caption?: string;
  mediaUrl?: string;
  base64?: string;
  fileLength?: number;
  fileName?: string;
}

export interface WebhookPayload {
  event: string;
  instance: string;
  data: WhatsAppMessage;
}

export interface UploadJobData {
  messageId: string;
  sender: string;
  senderName: string;
  messageType: string;
  timestamp: number;
  mimeType: string;
  fileName: string;
  caption?: string;
  mediaUrl?: string;
  base64?: string;
  fileSize?: number;
}

export interface UploadResult {
  success: boolean;
  fileId?: string;
  folderId?: string;
  error?: string;
  fileName?: string;
  uploadedAt?: string;
}
