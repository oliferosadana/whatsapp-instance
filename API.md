# API Documentation

## Base URL

```
http://localhost:3000
```

For production, replace with your domain.

---

## Endpoints

### 1. Root

Get API information.

**Endpoint:** `GET /`

**Response:**
```json
{
  "success": true,
  "message": "WhatsApp to Google Drive Uploader API",
  "version": "1.0.0",
  "endpoints": {
    "health": "GET /health",
    "stats": "GET /stats",
    "webhook": "POST /webhook"
  }
}
```

---

### 2. Health Check

Check API and queue health status.

**Endpoint:** `GET /health`

**Response:**
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2026-02-06T10:30:00.000Z",
  "queue": {
    "waiting": 0,
    "active": 2,
    "completed": 150,
    "failed": 3
  }
}
```

**Status Codes:**
- `200` - Healthy
- `500` - Unhealthy

---

### 3. Queue Statistics

Get detailed queue statistics and recent jobs.

**Endpoint:** `GET /stats`

**Response:**
```json
{
  "success": true,
  "stats": {
    "counts": {
      "waiting": 0,
      "active": 1,
      "completed": 150,
      "failed": 3,
      "delayed": 0
    },
    "recentJobs": {
      "waiting": [],
      "active": [
        {
          "id": "whatsapp-instance_MSG123",
          "data": {
            "messageId": "MSG123",
            "sender": "628123456789@s.whatsapp.net",
            "senderName": "John Doe",
            "fileName": "photo.jpg",
            "mimeType": "image/jpeg"
          },
          "timestamp": 1707217800000
        }
      ],
      "failed": [
        {
          "id": "whatsapp-instance_MSG124",
          "data": { ... },
          "failedReason": "Network timeout",
          "timestamp": 1707217700000
        }
      ]
    }
  }
}
```

**Status Codes:**
- `200` - Success
- `500` - Error

---

### 4. Webhook (Internal)

Receive webhooks from Evolution API. This endpoint is called automatically by Evolution API.

**Endpoint:** `POST /webhook`

**Headers:**
```
Content-Type: application/json
x-webhook-secret: your-webhook-secret
```

**Request Body:**
```json
{
  "event": "messages.upsert",
  "instance": "whatsapp-instance",
  "data": {
    "key": {
      "remoteJid": "628123456789@s.whatsapp.net",
      "fromMe": false,
      "id": "MSG123ABC"
    },
    "message": {
      "imageMessage": {
        "mimetype": "image/jpeg",
        "caption": "My photo",
        "base64": "base64string...",
        "fileLength": 123456,
        "fileName": "photo.jpg"
      }
    },
    "messageType": "imageMessage",
    "messageTimestamp": 1707217800,
    "pushName": "John Doe"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "File queued for upload",
  "jobId": "whatsapp-instance_MSG123ABC"
}
```

**Status Codes:**
- `200` - Webhook received
- `401` - Unauthorized (invalid secret)
- `400` - Bad request (invalid payload)

**Supported Message Types:**
- `imageMessage` - Images (JPEG, PNG, GIF, WebP, etc.)
- `videoMessage` - Videos (MP4, MOV, AVI, etc.)
- `documentMessage` - Documents (PDF, DOC, XLS, etc.)
- `audioMessage` - Audio files (MP3, OGG, WAV, etc.)
- `stickerMessage` - Stickers

---

## Evolution API Integration

### Set Webhook Configuration

Configure Evolution API to send webhooks to your application.

**Evolution API Endpoint:**
```
POST http://localhost:8080/webhook/set/{instanceName}
```

**Headers:**
```
apikey: your-evolution-api-key
Content-Type: application/json
```

**Request Body:**
```json
{
  "enabled": true,
  "url": "http://app:3000/webhook",
  "webhook_by_events": false,
  "webhook_base64": true,
  "events": ["MESSAGES_UPSERT"],
  "headers": {
    "x-webhook-secret": "your-webhook-secret"
  }
}
```

**PowerShell Example:**
```powershell
$headers = @{
    "apikey" = "your-evolution-api-key"
    "Content-Type" = "application/json"
}

$body = @{
    enabled = $true
    url = "http://app:3000/webhook"
    webhook_by_events = $false
    webhook_base64 = $true
    events = @("MESSAGES_UPSERT")
    headers = @{
        "x-webhook-secret" = "your-webhook-secret"
    }
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8080/webhook/set/whatsapp-instance" `
    -Method POST `
    -Headers $headers `
    -Body $body
```

### Get Webhook Configuration

Check current webhook configuration.

**Evolution API Endpoint:**
```
GET http://localhost:8080/webhook/find/{instanceName}
```

**Headers:**
```
apikey: your-evolution-api-key
```

**PowerShell Example:**
```powershell
Invoke-RestMethod -Uri "http://localhost:8080/webhook/find/whatsapp-instance" `
    -Headers @{"apikey" = "your-evolution-api-key"}
```

---

## Error Responses

All endpoints may return error responses in this format:

```json
{
  "success": false,
  "error": "Error message description"
}
```

**Common Error Codes:**

| Code | Meaning |
|------|---------|
| 400 | Bad Request - Invalid payload or parameters |
| 401 | Unauthorized - Missing or invalid authentication |
| 404 | Not Found - Endpoint doesn't exist |
| 500 | Internal Server Error - Server-side error |

---

## Upload Process Flow

```
1. WhatsApp message with media received
   ↓
2. Evolution API processes message
   ↓
3. Webhook sent to POST /webhook
   ↓
4. App validates webhook secret
   ↓
5. Media extracted from payload
   ↓
6. Job added to Redis queue
   ↓
7. Worker downloads/decodes file
   ↓
8. Worker gets/creates sender folder
   ↓
9. File uploaded to Google Drive
   ↓
10. Metadata saved to file description
   ↓
11. Upload completed (view in /stats)
```

---

## File Metadata

Files uploaded to Google Drive include WhatsApp metadata in the file description:

```json
{
  "whatsapp": {
    "sender": "628123456789@s.whatsapp.net",
    "senderName": "John Doe",
    "messageId": "MSG123ABC",
    "timestamp": 1707217800,
    "caption": "My photo"
  },
  "uploadedAt": "2026-02-06T10:30:00.000Z"
}
```

To view metadata in Google Drive:
1. Right-click file
2. Click "File information" (ⓘ icon)
3. Check "Description" field

---

## Rate Limits

### Application
- No built-in rate limits
- Controlled by `QUEUE_CONCURRENCY` (default: 5 concurrent uploads)

### Google Drive API
- 1,000 requests per 100 seconds per user
- 10,000 requests per day per project
- The app handles rate limits with exponential backoff

### Evolution API
- Depends on WhatsApp Business API limits
- Typically 1,000 messages per day for small businesses

---

## Testing

### Test Health Check

```powershell
# PowerShell
Invoke-RestMethod -Uri "http://localhost:3000/health"

# cURL
curl http://localhost:3000/health
```

### Test Webhook (Manual)

```powershell
$headers = @{
    "x-webhook-secret" = "your-webhook-secret"
    "Content-Type" = "application/json"
}

$body = @{
    event = "messages.upsert"
    instance = "test"
    data = @{
        key = @{
            remoteJid = "6281234567890@s.whatsapp.net"
            fromMe = $false
            id = "TEST123"
        }
        message = @{
            imageMessage = @{
                mimetype = "image/jpeg"
                caption = "Test image"
                base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
                fileLength = 95
                fileName = "test.jpg"
            }
        }
        messageType = "imageMessage"
        messageTimestamp = 1707217800
        pushName = "Test User"
    }
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri "http://localhost:3000/webhook" `
    -Method POST `
    -Headers $headers `
    -Body $body
```

---

## Monitoring

### View Logs

```bash
# All logs
docker-compose logs -f app

# Error logs only
docker-compose logs -f app | grep ERROR

# Upload logs
docker logs whatsapp-gdrive-app 2>&1 | grep "uploaded successfully"
```

### Monitor Queue

```powershell
# Check queue stats every 5 seconds
while ($true) {
    Clear-Host
    Invoke-RestMethod -Uri "http://localhost:3000/stats" | ConvertTo-Json -Depth 5
    Start-Sleep -Seconds 5
}
```

---

## Security

### Authentication

The webhook endpoint uses a secret-based authentication:

1. Set `WEBHOOK_SECRET` in `.env`
2. Configure same secret in Evolution API webhook headers
3. App validates `x-webhook-secret` header on every request

### Best Practices

1. **Change default secrets** in production
2. **Use HTTPS** with SSL certificate
3. **Restrict CORS** origins (edit `src/app.ts`)
4. **Rotate API keys** regularly
5. **Monitor logs** for suspicious activity
6. **Limit file types** with `ALLOWED_FILE_TYPES` if needed

---

## Support

For issues or questions:
- Check logs: `docker-compose logs -f app`
- Review [SETUP.md](SETUP.md) for setup help
- Check [README.md](README.md) for troubleshooting
