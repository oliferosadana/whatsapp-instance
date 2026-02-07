# WhatsApp to Google Drive Uploader

Aplikasi berbasis web untuk mengunggah file dari WhatsApp ke Google Drive secara otomatis menggunakan Evolution API.

## 🌟 Fitur

- ✅ Upload otomatis semua jenis file (gambar, video, dokumen, audio) dari WhatsApp ke Google Drive
- ✅ Organisasi folder berdasarkan pengirim (setiap kontak punya folder sendiri)
- ✅ Queue system dengan retry mechanism untuk reliability
- ✅ Support base64 dan media URL dari Evolution API
- ✅ Metadata WhatsApp tersimpan di file description Google Drive
- ✅ Health check dan statistics endpoint
- ✅ Logging lengkap untuk monitoring
- ✅ Docker support untuk deployment mudah

## 📋 Prerequisites

- Node.js 18+ (untuk development)
- Docker dan Docker Compose (untuk deployment)
- Google Cloud Project dengan Drive API enabled
- Service Account Google Cloud
- Evolution API instance (akan di-setup otomatis dengan Docker)

## 🚀 Quick Start

### 1. Setup Google Cloud

1. Buka [Google Cloud Console](https://console.cloud.google.com/)
2. Buat project baru atau pilih existing project
3. Enable **Google Drive API**:
   - Navigation Menu → APIs & Services → Library
   - Cari "Google Drive API"
   - Klik Enable

4. Buat Service Account:
   - APIs & Services → Credentials
   - Create Credentials → Service Account
   - Beri nama (contoh: "whatsapp-uploader")
   - Klik Create and Continue
   - Skip role assignment → Done

5. Download credentials:
   - Klik service account yang baru dibuat
   - Tab "Keys" → Add Key → Create New Key
   - Pilih JSON → Create
   - Save file sebagai `service-account.json`

6. Setup Google Drive:
   - Buka Google Drive
   - Buat folder untuk menampung semua upload
   - Klik kanan folder → Share
   - Masukkan email service account (format: `nama@project-id.iam.gserviceaccount.com`)
   - Beri akses "Editor"
   - Copy Folder ID dari URL (contoh: `https://drive.google.com/drive/folders/FOLDER_ID_HERE`)

### 2. Clone dan Setup Project

```bash
# Clone atau download project
cd whatsapp-gdrive-uploader

# Buat folder credentials
mkdir credentials

# Copy service account JSON ke folder credentials
cp /path/to/service-account.json credentials/

# Copy environment variables
cp .env.example .env
```

### 3. Konfigurasi Environment

Edit file `.env`:

```bash
# Server Configuration
PORT=3000
NODE_ENV=production

# Evolution API (gunakan default ini untuk docker-compose)
EVOLUTION_API_URL=http://evolution-api:8080
EVOLUTION_API_KEY=evolution-api-key-change-this  # GANTI INI!
EVOLUTION_INSTANCE=whatsapp-instance

# Webhook Security
WEBHOOK_SECRET=your-webhook-secret-change-this  # GANTI INI!

# Google Drive
GOOGLE_APPLICATION_CREDENTIALS=./credentials/service-account.json
GOOGLE_DRIVE_PARENT_FOLDER_ID=your-folder-id-here  # GANTI dengan folder ID dari langkah 1!

# Redis (default untuk docker-compose)
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_DB=0

# File Upload Configuration
MAX_FILE_SIZE=52428800  # 50MB
ALLOWED_FILE_TYPES=  # Kosongkan untuk allow semua file types

# Queue Configuration
QUEUE_CONCURRENCY=5
QUEUE_MAX_ATTEMPTS=3

# Logging
LOG_LEVEL=info
```

### 4. Deploy dengan Docker Compose

```bash
# Build dan start semua services
docker-compose up -d

# Check logs
docker-compose logs -f app

# Check status
docker-compose ps
```

Services yang akan berjalan:
- **Evolution API**: Port 8080
- **WhatsApp Uploader App**: Port 3000
- **PostgreSQL**: Database untuk Evolution API
- **Redis**: Queue system

### 5. Setup WhatsApp Instance

1. Buka Evolution API Manager:
   ```
   http://localhost:8080/manager
   ```

2. Create Instance:
   - Klik "Create Instance"
   - Instance Name: `whatsapp-instance` (harus sama dengan EVOLUTION_INSTANCE di .env)
   - API Key: Gunakan yang sama dengan EVOLUTION_API_KEY
   - Klik Create

3. Connect WhatsApp:
   - Klik instance yang baru dibuat
   - Scan QR Code dengan WhatsApp Anda
   - Tunggu sampai status "Connected"

### 6. Configure Webhook

Gunakan API Evolution untuk set webhook:

```bash
curl -X POST http://localhost:8080/webhook/set/whatsapp-instance \
  -H "apikey: evolution-api-key-change-this" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "url": "http://app:3000/webhook",
    "webhook_by_events": false,
    "webhook_base64": true,
    "events": ["MESSAGES_UPSERT"],
    "headers": {
      "x-webhook-secret": "your-webhook-secret-change-this"
    }
  }'
```

### 7. Test Upload

1. Kirim gambar ke nomor WhatsApp bot Anda
2. Check logs:
   ```bash
   docker-compose logs -f app
   ```
3. Check Google Drive - file harus muncul di folder dengan nama pengirim

## 📁 Struktur Project

```
whatsapp-gdrive-uploader/
├── src/
│   ├── config/              # Konfigurasi (env, logger, Google Drive, queue)
│   ├── controllers/         # Webhook controller
│   ├── jobs/                # Worker untuk queue processing
│   ├── middleware/          # Validation middleware
│   ├── services/            # Business logic (Drive, folder manager)
│   ├── types/               # TypeScript type definitions
│   ├── utils/               # Utility functions (file handler)
│   └── app.ts               # Main application
├── credentials/             # Google service account JSON
├── logs/                    # Application logs
├── .env                     # Environment variables
├── docker-compose.yml       # Docker orchestration
├── Dockerfile               # App container
├── package.json             # Dependencies
└── tsconfig.json            # TypeScript config
```

## 🔧 Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build TypeScript
npm run build

# Run production build
npm start

# Run worker separately (optional)
npm run worker
```

## 📊 API Endpoints

### Health Check
```
GET http://localhost:3000/health
```

Response:
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2026-02-06T10:00:00.000Z",
  "queue": {
    "waiting": 0,
    "active": 0,
    "completed": 150,
    "failed": 2
  }
}
```

### Queue Statistics
```
GET http://localhost:3000/stats
```

### Webhook (Internal)
```
POST http://localhost:3000/webhook
Header: x-webhook-secret: your-secret
```

## 🔍 Monitoring

### View Logs

```bash
# Real-time logs
docker-compose logs -f app

# Error logs only
tail -f logs/error.log

# Upload history
tail -f logs/upload-history.log

# All logs
tail -f logs/combined.log
```

### Queue Dashboard

```bash
# Check queue stats
curl http://localhost:3000/stats
```

## 🐛 Troubleshooting

### File tidak terupload

1. **Check logs**: `docker-compose logs -f app`
2. **Verify webhook**: Pastikan webhook configured dengan benar
3. **Check Drive permissions**: Pastikan service account punya akses ke folder
4. **Verify credentials**: Check `credentials/service-account.json` exists

### Evolution API tidak connect

1. **Check QR Code**: Pastikan QR sudah di-scan
2. **Check instance**: `docker-compose logs -f evolution-api`
3. **Restart**: `docker-compose restart evolution-api`

### Permission denied di Google Drive

1. **Check service account email** di credentials JSON
2. **Re-share folder** dengan service account email
3. **Verify folder ID** di `.env`

### Queue stuck

```bash
# Restart app
docker-compose restart app

# Clear queue (WARNING: deletes pending jobs)
docker-compose exec redis redis-cli FLUSHDB
```

## 🔒 Security Best Practices

1. **Ganti semua default keys** di `.env` dan `docker-compose.yml`
2. **Jangan commit** file `.env` atau `credentials/` ke Git
3. **Gunakan HTTPS** untuk production dengan reverse proxy (Nginx)
4. **Restrict CORS** di production (edit `src/app.ts`)
5. **Rotate API keys** secara berkala

## 📝 Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| PORT | Server port | 3000 | No |
| NODE_ENV | Environment (development/production) | development | No |
| EVOLUTION_API_URL | Evolution API base URL | - | Yes |
| EVOLUTION_API_KEY | Evolution API key | - | Yes |
| EVOLUTION_INSTANCE | WhatsApp instance name | - | Yes |
| WEBHOOK_SECRET | Secret untuk validate webhook | - | Yes |
| GOOGLE_APPLICATION_CREDENTIALS | Path ke service account JSON | - | Yes |
| GOOGLE_DRIVE_PARENT_FOLDER_ID | Folder ID di Google Drive | - | Yes |
| REDIS_HOST | Redis hostname | localhost | No |
| REDIS_PORT | Redis port | 6379 | No |
| MAX_FILE_SIZE | Max file size in bytes | 52428800 | No |
| ALLOWED_FILE_TYPES | Comma-separated MIME types | (all) | No |
| QUEUE_CONCURRENCY | Concurrent upload jobs | 5 | No |
| QUEUE_MAX_ATTEMPTS | Retry attempts | 3 | No |
| LOG_LEVEL | Log level | info | No |

## 🎯 Cara Kerja

```
WhatsApp Message (media) 
    ↓
Evolution API receives message
    ↓
Webhook sent to app (POST /webhook)
    ↓
App validates and extracts media info
    ↓
Job added to Redis queue
    ↓
Worker processes job:
  - Download/decode file
  - Get/create sender folder
  - Upload to Google Drive
  - Save metadata
    ↓
File uploaded ✅
```

## 📦 Tech Stack

- **Runtime**: Node.js 18+ dengan TypeScript
- **Framework**: Express.js
- **Queue**: BullMQ + Redis
- **Google APIs**: googleapis (Google Drive API v3)
- **WhatsApp**: Evolution API
- **Database**: PostgreSQL (untuk Evolution API)
- **Container**: Docker & Docker Compose

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first.

## 📄 License

MIT

## 🆘 Support

Jika ada masalah atau pertanyaan:
1. Check troubleshooting section di atas
2. Check logs: `docker-compose logs -f`
3. Create issue di repository

## 🎉 Credits

- [Evolution API](https://github.com/EvolutionAPI/evolution-api) - WhatsApp API solution
- [BullMQ](https://github.com/taskforcesh/bullmq) - Queue system
- [Google Drive API](https://developers.google.com/drive) - Cloud storage
