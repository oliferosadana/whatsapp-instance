# Setup Guide - WhatsApp to Google Drive Uploader

Panduan lengkap setup dari awal sampai aplikasi berjalan.

## 📋 Checklist Setup

- [ ] Google Cloud Project setup
- [ ] Service Account created
- [ ] Google Drive folder created & shared
- [ ] Project files ready
- [ ] Environment configured
- [ ] Docker Compose running
- [ ] WhatsApp instance connected
- [ ] Webhook configured
- [ ] Test upload berhasil

## 🔧 Detailed Setup Steps

### Step 1: Google Cloud Setup (15 menit)

#### 1.1 Create Google Cloud Project

1. Buka https://console.cloud.google.com/
2. Klik dropdown project di header → "New Project"
3. Project Name: `WhatsApp Drive Uploader` (atau nama lain)
4. Klik "Create"
5. Tunggu project terbuat, lalu switch ke project tersebut

#### 1.2 Enable Google Drive API

1. Di navigation menu (☰) → "APIs & Services" → "Library"
2. Search: `Google Drive API`
3. Klik "Google Drive API"
4. Klik tombol **"Enable"**
5. Tunggu sampai status "API enabled"

#### 1.3 Create Service Account

1. Navigation menu → "APIs & Services" → "Credentials"
2. Klik "+ CREATE CREDENTIALS" → "Service Account"
3. Form Service Account:
   - **Service account name**: `whatsapp-uploader`
   - **Service account ID**: (auto-generated, biarkan)
   - **Description**: `Service account for WhatsApp to Drive uploader`
4. Klik **"CREATE AND CONTINUE"**
5. Di "Grant this service account access to project":
   - **Skip** (tidak perlu role untuk Google Cloud Project)
   - Klik "CONTINUE"
6. Di "Grant users access to this service account":
   - **Skip**
   - Klik "DONE"

#### 1.4 Download Credentials

1. Klik service account yang baru dibuat (nama: `whatsapp-uploader`)
2. Tab **"KEYS"**
3. Klik "ADD KEY" → "Create new key"
4. Pilih **JSON**
5. Klik "CREATE"
6. File JSON akan terdownload otomatis
7. **PENTING**: 
   - Rename file menjadi `service-account.json`
   - Simpan di tempat aman (jangan share ke siapapun!)
   - Copy email service account (format: `whatsapp-uploader@project-id.iam.gserviceaccount.com`)

### Step 2: Google Drive Setup (5 menit)

#### 2.1 Create Upload Folder

1. Buka https://drive.google.com/
2. Klik "New" → "Folder"
3. Nama folder: `WhatsApp Uploads` (atau nama lain)
4. Klik "Create"

#### 2.2 Share Folder dengan Service Account

1. Klik kanan folder → "Share"
2. Di "Add people and groups":
   - Paste **email service account** dari Step 1.4
   - Contoh: `whatsapp-uploader@project-id.iam.gserviceaccount.com`
3. Pilih permission: **Editor**
4. **UNCHECK** "Notify people" (service account tidak perlu notifikasi)
5. Klik "Share"

#### 2.3 Get Folder ID

1. Buka folder yang baru dibuat
2. Look at URL di browser:
   ```
   https://drive.google.com/drive/folders/1ABC-xyz123_FOLDER_ID_HERE
                                              ^^^^^^^^^^^^^^^^^^^^^^^^^
   ```
3. Copy bagian setelah `/folders/` → ini adalah **Folder ID**
4. Save untuk digunakan di `.env` nanti

### Step 3: Project Setup (10 menit)

#### 3.1 Prepare Project Files

```bash
# Clone/download project
cd d:\ProjectApp\New folder

# Verify struktur folder
dir

# Harusnya ada:
# - src/
# - package.json
# - tsconfig.json
# - docker-compose.yml
# - Dockerfile
# - .env.example
```

#### 3.2 Setup Credentials

```bash
# Buat folder credentials
mkdir credentials

# Copy service account JSON (adjust path sesuai lokasi download)
copy "C:\Users\YourName\Downloads\service-account.json" credentials\service-account.json

# Verify
dir credentials
```

#### 3.3 Configure Environment

```bash
# Copy template
copy .env.example .env

# Edit .env dengan notepad atau text editor
notepad .env
```

Edit nilai berikut di `.env`:

```bash
# GANTI INI - Evolution API Key (buat key random yang kuat)
EVOLUTION_API_KEY=EvolutionAPI-SecureKey-2026-ChangeThis

# GANTI INI - Webhook Secret (buat secret random)
WEBHOOK_SECRET=WebhookSecret-SuperSecure-2026-ChangeThis

# GANTI INI - Folder ID dari Step 2.3
GOOGLE_DRIVE_PARENT_FOLDER_ID=1ABC-xyz123_FOLDER_ID_HERE

# Sisanya bisa biarkan default untuk testing
```

**Tips membuat secure key:**
```bash
# Cara 1: Random string online
# Buka: https://www.random.org/strings/
# Generate string 32 karakter

# Cara 2: PowerShell
# -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})
```

#### 3.4 Update docker-compose.yml

Edit `docker-compose.yml`, ganti:

```yaml
# Di service evolution-api, section environment:
AUTHENTICATION_API_KEY: EvolutionAPI-SecureKey-2026-ChangeThis  # SAMA dengan .env!

# Di service app, section environment:
EVOLUTION_API_KEY: EvolutionAPI-SecureKey-2026-ChangeThis  # SAMA dengan .env!
WEBHOOK_SECRET: WebhookSecret-SuperSecure-2026-ChangeThis  # SAMA dengan .env!
GOOGLE_DRIVE_PARENT_FOLDER_ID: 1ABC-xyz123_FOLDER_ID_HERE  # SAMA dengan .env!
```

### Step 4: Deploy dengan Docker (10 menit)

#### 4.1 Install Docker (jika belum)

1. Download Docker Desktop for Windows:
   - https://www.docker.com/products/docker-desktop/
2. Install dan restart komputer
3. Buka Docker Desktop
4. Tunggu sampai status "Engine running"

#### 4.2 Start Services

```powershell
# Di folder project
cd "d:\ProjectApp\New folder"

# Build dan start semua services
docker-compose up -d

# Output harusnya:
# Creating network "new-folder_app-network" ... done
# Creating volume "new-folder_postgres_data" ... done
# Creating volume "new-folder_redis_data" ... done
# Creating volume "new-folder_evolution_instances" ... done
# Creating postgres ... done
# Creating redis ... done
# Creating evolution-api ... done
# Creating whatsapp-gdrive-app ... done
```

#### 4.3 Verify Services Running

```powershell
# Check status
docker-compose ps

# Harusnya semua services "Up":
# NAME                   STATUS
# postgres               Up
# redis                  Up
# evolution-api          Up
# whatsapp-gdrive-app    Up

# Check logs
docker-compose logs -f app

# Tekan Ctrl+C untuk stop viewing logs
```

#### 4.4 Test Health Check

```powershell
# Test API health
curl http://localhost:3000/health

# Harusnya return JSON:
# {
#   "success": true,
#   "status": "healthy",
#   ...
# }

# Test Evolution API
curl http://localhost:8080

# Harusnya return Evolution API response
```

### Step 5: WhatsApp Setup (5 menit)

#### 5.1 Create WhatsApp Instance

**Cara 1: Menggunakan Evolution API Manager (Recommended)**

1. Buka browser: http://localhost:8080/manager
2. Klik **"Instances"** di sidebar
3. Klik tombol **"Create Instance"**
4. Form Create Instance:
   - **Instance Name**: `whatsapp-instance` (HARUS sama dengan .env!)
   - **Number**: (biarkan kosong)
   - **Token/API Key**: Paste API key dari `.env` file
5. Klik **"Create"**

**Cara 2: Menggunakan API (Alternative)**

```powershell
# PowerShell
$headers = @{
    "apikey" = "EvolutionAPI-SecureKey-2026-ChangeThis"
    "Content-Type" = "application/json"
}

$body = @{
    instanceName = "whatsapp-instance"
    qrcode = $true
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8080/instance/create" `
    -Method POST `
    -Headers $headers `
    -Body $body
```

#### 5.2 Connect WhatsApp

1. Di Evolution Manager, klik instance **"whatsapp-instance"**
2. Atau buka: http://localhost:8080/manager (pilih instance)
3. **QR Code** akan muncul
4. **Scan QR Code** dengan WhatsApp:
   - Buka WhatsApp di HP
   - Menu (⋮) → "Linked Devices"
   - "Link a Device"
   - Scan QR code di browser
5. Tunggu status berubah jadi **"Connected"** (warna hijau)

#### 5.3 Verify Connection

```powershell
# Check instance status
curl http://localhost:8080/instance/connectionState/whatsapp-instance `
    -H "apikey: EvolutionAPI-SecureKey-2026-ChangeThis"

# Response harusnya:
# {
#   "instance": "whatsapp-instance",
#   "state": "open"
# }
```

### Step 6: Configure Webhook (5 menit)

#### 6.1 Set Webhook Configuration

```powershell
# PowerShell
$headers = @{
    "apikey" = "EvolutionAPI-SecureKey-2026-ChangeThis"
    "Content-Type" = "application/json"
}

$body = @{
    enabled = $true
    url = "http://app:3000/webhook"
    webhook_by_events = $false
    webhook_base64 = $true
    events = @("MESSAGES_UPSERT")
    headers = @{
        "x-webhook-secret" = "WebhookSecret-SuperSecure-2026-ChangeThis"
    }
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8080/webhook/set/whatsapp-instance" `
    -Method POST `
    -Headers $headers `
    -Body $body
```

#### 6.2 Verify Webhook

```powershell
# Check webhook config
curl http://localhost:8080/webhook/find/whatsapp-instance `
    -H "apikey: EvolutionAPI-SecureKey-2026-ChangeThis"

# Response harusnya menunjukkan webhook enabled
```

### Step 7: Testing (5 menit)

#### 7.1 Prepare Test

```powershell
# Terminal 1: Monitor app logs
docker-compose logs -f app

# Terminal 2: Monitor Evolution API logs (optional)
docker-compose logs -f evolution-api
```

#### 7.2 Send Test File

1. **Dari HP lain** (atau nomor WhatsApp lain), kirim:
   - Gambar/foto
   - Video
   - Dokumen PDF
   - File apapun

2. **Ke nomor WhatsApp** yang sudah di-connect di Evolution API

#### 7.3 Verify Upload

**Check Logs:**
```
Terminal harusnya menampilkan:
- "Webhook received"
- "Job added to queue"
- "Job started processing"
- "File downloaded/decoded"
- "Getting/creating folder for sender"
- "File uploaded successfully"
```

**Check Google Drive:**
1. Buka https://drive.google.com/
2. Masuk ke folder "WhatsApp Uploads"
3. Harusnya ada **folder baru** dengan nama pengirim (contoh: `John_628123456789`)
4. Di dalam folder, ada file yang baru di-upload
5. Click file → klik info (ⓘ) → **Description** harusnya ada metadata WhatsApp

**Check Stats:**
```powershell
# Check upload statistics
curl http://localhost:3000/stats

# Response menunjukkan:
# - completed: 1 (atau lebih)
# - failed: 0
```

## ✅ Troubleshooting

### Problem: Docker tidak bisa start

**Solution:**
```powershell
# Stop semua
docker-compose down

# Remove volumes (WARNING: delete data)
docker-compose down -v

# Rebuild
docker-compose up -d --build
```

### Problem: Evolution API tidak bisa create instance

**Solution:**
1. Check logs: `docker-compose logs evolution-api`
2. Check database: `docker-compose ps postgres` (harusnya "Up healthy")
3. Restart: `docker-compose restart evolution-api`

### Problem: Webhook tidak received

**Solution:**
1. Verify webhook config: Curl check webhook (Step 6.2)
2. Check network: `docker-compose exec app ping evolution-api`
3. Re-set webhook: Ulangi Step 6.1

### Problem: File tidak upload ke Drive

**Solution:**
1. **Check credentials**: `dir credentials\service-account.json`
2. **Check permissions**: 
   - Buka Drive folder
   - Check service account ada di shared users
3. **Check folder ID**: Verify ID di `.env` benar
4. **Check logs**: `docker-compose logs app | grep -i error`

### Problem: Service Account permission denied

**Solution:**
```powershell
# Get service account email dari JSON
Get-Content credentials\service-account.json | ConvertFrom-Json | Select -ExpandProperty client_email

# Copy email, re-share folder Google Drive dengan email tersebut
# Pastikan role = "Editor"
```

## 🎯 Next Steps

Setelah semua berjalan:

1. **Monitoring**: Setup log monitoring atau dashboard
2. **Backup**: Backup credentials dan .env
3. **Security**: Review dan harden security settings
4. **Scale**: Adjust QUEUE_CONCURRENCY untuk performa
5. **Production**: Deploy ke VPS dengan HTTPS/SSL

## 📚 Resources

- [Evolution API Docs](https://doc.evolution-api.com/)
- [Google Drive API](https://developers.google.com/drive/api/v3/about-sdk)
- [BullMQ Guide](https://docs.bullmq.io/)
- [Docker Compose Reference](https://docs.docker.com/compose/)

---

**Setup Complete! 🎉**

Aplikasi sekarang sudah berjalan dan siap menerima file dari WhatsApp untuk diupload ke Google Drive.
