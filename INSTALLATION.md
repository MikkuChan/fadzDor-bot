# 📖 Panduan Instalasi fadzDor Bot

Panduan lengkap untuk menginstal dan mengkonfigurasi fadzDor Bot.

## 🔧 Persyaratan Sistem

### Minimum Requirements:
- **Node.js**: v16.0.0 atau lebih baru
- **RAM**: 512MB 
- **Storage**: 1GB free space
- **OS**: Linux/Windows/macOS
- **Internet**: Stable connection

### Recommended:
- **Node.js**: v18+ LTS
- **RAM**: 1GB+
- **Storage**: 5GB+ (untuk logs dan backup)
- **OS**: Linux Ubuntu 20.04+

## 🚀 Instalasi Step-by-Step

### 1. Persiapan Environment

```bash
# Update sistem (Ubuntu/Debian)
sudo apt update && sudo apt upgrade -y

# Install Node.js (jika belum ada)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verifikasi instalasi
node --version
npm --version
```

### 2. Clone Repository

```bash
# Clone dari GitHub
git clone https://github.com/YourUsername/fadzDor-bot.git
cd fadzDor-bot

# Atau download dan extract ZIP
wget https://github.com/YourUsername/fadzDor-bot/archive/main.zip
unzip main.zip
cd fadzDor-bot-main
```

### 3. Setup Environment

```bash
# Jalankan setup otomatis
npm run setup

# Output yang diharapkan:
# ✅ Created directory: ./data
# ✅ Created directory: ./logs  
# ✅ Created directory: ./backup
# ✅ Created file: ./data/users.json
# ✅ Created file: ./data/transactions.json
# ✅ Created file: ./data/sessions.json
# ✅ Created file: ./data/packages.json
# ✅ Created .env template file
```

### 4. Install Dependencies

```bash
# Install semua dependencies
npm install

# Jika ada error permissions (Linux)
sudo npm install --unsafe-perm=true --allow-root
```

### 5. Konfigurasi API

Edit file `.env` dengan kredensial Anda:

```bash
# Edit dengan nano/vim/code
nano .env

# Atau dengan text editor lain
code .env
```

Isi dengan data yang benar:
```env
# Bot Configuration
OWNER_NUMBER=628123456789
ADMIN_NUMBERS=628123456789,628987654321

# Hesda Store API Configuration  
HESDA_KEY=your_actual_hesda_key_here
HESDA_USERNAME=your_hesda_username
HESDA_PASSWORD=your_hesda_password
```

### 6. Test Konfigurasi

```bash
# Test koneksi API
npm run test-api

# Output yang diharapkan:
# 🧪 Testing fadzDor Bot API Connection...
# 1. Testing system balance check...
# ✅ System balance: Rp. 1,234,567
# 2. Testing login session check...
# ℹ️ No active session (expected for test number)
# 3. Testing OTP request (with invalid number)...
# ℹ️ OTP failed (expected): User not found
# 🏁 API Test completed!
```

### 7. Health Check

```bash
# Jalankan health check lengkap
npm run health-check

# Atau quick check
npm run health-check -- --quick
```

### 8. Jalankan Bot

```bash
# Mode production
npm start

# Mode development (auto-restart)
npm run dev
```

## 📱 Koneksi WhatsApp

### Scan QR Code:

1. Bot akan menampilkan QR code di terminal
2. Buka WhatsApp di ponsel → **Pengaturan** → **Perangkat Tertaut**
3. Klik **Tautkan Perangkat** dan scan QR code
4. Tunggu hingga muncul "fadzDor berhasil terhubung!"

### Troubleshooting QR Code:

```bash
# Jika QR tidak muncul
rm -rf baileys_auth/
npm start

# Jika timeout
# Restart bot dan coba lagi
```

## 🔧 Konfigurasi Lanjutan

### 1. Tambah Admin

Edit `.env`:
```env
ADMIN_NUMBERS=628123456789,628987654321,628555666777
```

### 2. Konfigurasi Paket

Edit `config/config.js` untuk mengubah harga atau menambah paket:

```javascript
packages: {
  custom_package: {
    package_id: 'PACKAGE_ID_FROM_HESDA',
    name: 'Nama Paket Custom', 
    price: 15000,           // Harga jual
    cost: 10000,            // Harga modal
    description: 'Deskripsi paket...',
    payment_method: ['DANA', 'QRIS']
  }
}
```

### 3. Database Backup Otomatis

Tambah cron job untuk backup:
```bash
# Edit crontab
crontab -e

# Tambah line ini (backup setiap hari jam 02:00)
0 2 * * * cd /path/to/fadzDor-bot && npm run backup-data
```

## 🐛 Troubleshooting Umum

### Error: "Module not found"
```bash
# Hapus node_modules dan reinstall
rm -rf node_modules package-lock.json
npm install
```

### Error: "Permission denied"
```bash
# Fix permissions (Linux)
sudo chown -R $USER:$USER .
chmod -R 755 .
```

### Error: "ENOSPC: System limit"
```bash
# Increase inotify limit (Linux)
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

### Error: "API Connection Failed"
1. Cek kredensial di `.env`
2. Verifikasi saldo Hesda Store
3. Test dengan: `npm run test-api`

### Bot Tidak Merespons WhatsApp
1. Cek koneksi internet
2. Scan ulang QR code
3. Periksa logs: `npm run logs`

### Database Corrupt
```bash
# Backup data lama
cp -r data/ backup/data-corrupt/

# Reset database
npm run setup

# Restore manual jika perlu
```

## 📊 Monitoring & Maintenance

### Real-time Monitoring
```bash
# Monitor aktivitas real-time
npm run monitor

# Monitor logs specific
npm run logs        # Bot logs
npm run logs:tx     # Transaction logs  
npm run logs:error  # Error logs
```

### Maintenance Commands
```bash
# Backup data
npm run backup-data

# Clear old logs
npm run clear-logs

# Health check
npm run health-check
```

### Log Rotation Setup
```bash
# Install logrotate (Ubuntu)
sudo apt install logrotate

# Create config file
sudo nano /etc/logrotate.d/fadzDor-bot

# Add content:
/path/to/fadzDor-bot/logs/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    copytruncate
}
```

## 🔒 Security Best Practices

### 1. Environment Security
- Jangan commit file `.env` ke Git
- Gunakan user non-root untuk production
- Set proper file permissions (600 untuk .env)

### 2. Network Security
```bash
# Setup firewall (Ubuntu)
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
```

### 3. Process Management
```bash
# Install PM2 untuk production
npm install -g pm2

# Start dengan PM2
pm2 start bot.js --name fadzDor-bot

# Setup auto-restart
pm2 startup
pm2 save
```

## 🚀 Deployment Production

### 1. Server Setup (VPS)
```bash
# Update server
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs git

# Create user
sudo adduser fadzDor
sudo usermod -aG sudo fadzDor
su fadzDor
```

### 2. Deploy Bot
```bash
# Clone di server
cd ~
git clone https://github.com/YourUsername/fadzDor-bot.git
cd fadzDor-bot

# Setup dan install
npm run setup
npm install --production

# Configure environment
cp .env.example .env
nano .env
```

### 3. PM2 Production Setup
```bash
# Install PM2
npm install -g pm2

# Create ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'fadzDor-bot',
    script: 'bot.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    }
  }]
}
EOF

# Start dengan PM2
pm2 start ecosystem.config.js

# Setup startup script
pm2 startup
pm2 save
```

### 4. Nginx Reverse Proxy (Optional)
```bash
# Install Nginx
sudo apt install nginx

# Create config
sudo nano /etc/nginx/sites-available/fadzDor-bot

# Add basic config for future web interface
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Enable site
sudo ln -s /etc/nginx/sites-available/fadzDor-bot /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 📞 Support

Jika mengalami masalah selama instalasi:

1. **Check Logs**: `npm run logs:error`
2. **Health Check**: `npm run health-check`
3. **GitHub Issues**: Buka issue di repository
4. **Contact Developer**: wa.me/6285727035336

## 🔄 Update Bot

```bash
# Backup data
npm run backup-data

# Pull latest changes
git pull origin main

# Update dependencies
npm install

# Health check
npm run health-check

# Restart bot
pm2 restart fadzDor-bot
```

---

✅ **Instalasi selesai!** Bot Anda siap digunakan.