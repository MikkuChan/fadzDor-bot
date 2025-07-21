# 🤖 fadzDor Bot

Bot WhatsApp otomatis untuk layanan paket data XL/Axis dengan sistem pembayaran terintegrasi dan logging lengkap.

## ✨ Fitur Utama

### 🛒 **Sistem Pembelian Paket**
- **Paket Vidio Unlimited Turbo** - Rp. 4.500
  - FUP 100-150GB, masa aktif 30 hari
  - Bisa untuk VPN dan streaming
  - Support pembayaran DANA/QRIS dan Pulsa
- **Masa Aktif 1 Tahun** - Rp. 10.000
  - Perpanjangan masa aktif per bulan
  - Total 45GB selama setahun

### 🔐 **Sistem Autentikasi Cerdas**
- Auto-check session login yang tersimpan
- OTP verification otomatis jika diperlukan
- Session management untuk penggunaan berulang

### 💰 **Manajemen Saldo**
- Sistem saldo virtual untuk users
- Top-up manual oleh admin
- Notifikasi otomatis saat saldo ditambahkan
- Perlindungan transaksi (saldo dipotong setelah konfirmasi)

### 📊 **Logging & Monitoring**
- Winston logger dengan kategori terpisah:
  - `bot.log` - Aktivitas bot
  - `api.log` - Panggilan API
  - `transaction.log` - Transaksi
  - `user.log` - Aktivitas user
  - `admin.log` - Aktivitas admin
  - `system.log` - Error sistem
- Log rotation otomatis (5MB per file, 5 file backup)

### 👨‍💼 **Panel Admin**
- Tambah saldo user
- Monitoring sistem
- Cek saldo API provider
- CRUD paket (akan ditambahkan)

## 🚀 Instalasi

### 1. Clone Repository
```bash
git clone https://github.com/YourUsername/fadzDor-bot.git
cd fadzDor-bot
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Konfigurasi Environment
```bash
cp .env.example .env
```

Edit file `.env` dengan data Anda:
```env
OWNER_NUMBER=628XXXXXXXXX
ADMIN_NUMBERS=628XXXXXXXXX,628YYYYYYYYY
HESDA_KEY=your_hesda_key_here
HESDA_USERNAME=your_hesda_username
HESDA_PASSWORD=your_hesda_password
```

### 4. Test API Connection
```bash
npm run test-api
```

### 5. Jalankan Bot
```bash
npm start
```

Untuk development mode:
```bash
npm run dev
```

## 📊 **Database Options**

fadzDor Bot mendukung multiple database untuk fleksibilitas:

### 🗂️ **JSON Database (Default - Recommended)**
```bash
# Tidak perlu konfigurasi tambahan
# File otomatis dibuat di folder data/
```

**Kelebihan:**
- ✅ **Plug & Play** - Langsung jalan tanpa setup
- ✅ **Easy Backup** - Copy paste folder data/
- ✅ **Human Readable** - Bisa edit manual
- ✅ **No Dependencies** - Tidak butuh install database

**Cocok untuk:** 
- Bot dengan <1000 users
- Yang mau simple dan mudah maintenance
- Hosting shared/VPS sederhana

### 💾 **SQLite Database (Optional)**
```bash
# Install dependency
npm install better-sqlite3

# Set di .env
DATABASE_TYPE=sqlite
DB_PATH=./data/fadzDor.db

# Migrasi dari JSON
npm run db:migrate-sqlite
```

**Kelebihan:**
- ✅ **Lebih cepat** dari JSON untuk query kompleks
- ✅ **Single file** database (mudah backup)
- ✅ **SQL Support** untuk analytics
- ✅ **ACID transactions** untuk data consistency

**Cocok untuk:**
- Bot dengan >1000 users
- Yang butuh query analytics
- Performa tinggi

### 🔄 **Migration Commands**
```bash
# Lihat info database current
npm run db:info

# Backup database
npm run db:backup

# Migrasi JSON → SQLite
npm run db:migrate-sqlite

# Export SQLite → JSON
npm run db:migrate-json
```

## 🎯 Cara Penggunaan

### Untuk User:
- `.menu` - Tampilkan menu utama
- `.saldo` - Cek saldo pribadi di bot
- `.beli` - Beli paket data
- `.cekpaket` - Cek paket aktif
- `.riwayat` - Riwayat transaksi

### Untuk Admin:
- `.admin` - Menu admin
- `.addsaldo` - Tambah saldo user
- `.delsaldo` - Kurangi/hapus saldo user
- `.ceksaldosistem` - Cek saldo sistem Hesda Store
- `.stats` - Statistik lengkap sistem
- `.broadcast [pesan]` - Broadcast ke semua user

## 🔄 Alur Pembelian Paket

1. **User memilih paket** → Bot cek saldo mencukupi
2. **Input nomor target** → Validasi nomor XL/Axis
3. **Cek session login** → Jika ada, langsung lanjut
4. **Jika perlu OTP** → Kirim OTP → Verifikasi
5. **Konfirmasi pembelian** → Potong saldo → Proses API
6. **Hasil transaksi** → Update database → Notifikasi

## 🛡️ Keamanan & Reliability

### Perlindungan Transaksi:
- ✅ Validasi saldo sebelum dan sesudah
- ✅ Rollback otomatis jika gagal
- ✅ Double-check di setiap step
- ✅ Logging lengkap untuk audit

### Error Handling:
- ✅ Try-catch di semua fungsi kritikal
- ✅ Timeout handling untuk API calls
- ✅ Automatic reconnection untuk WhatsApp
- ✅ Graceful shutdown

## 📈 Monitoring & Maintenance

### Melihat Log:
```bash
# Real-time log monitoring
npm run logs

# Specific log files
tail -f logs/transaction.log
tail -f logs/error.log
```

### Backup Data:
```bash
npm run backup-data
```

### Clear Old Logs:
```bash
npm run clear-logs
```

## ⚙️ Konfigurasi Paket

Edit `config/config.js` untuk mengubah paket yang tersedia:

```javascript
packages: {
  custom_package: {
    package_id: 'PACKAGE_ID_FROM_HESDA',
    name: 'Nama Paket',
    price: 5000,          // Harga jual ke user
    cost: 2000,           // Harga beli dari provider
    description: 'Deskripsi paket...',
    payment_method: ['DANA', 'QRIS', 'PULSA']
  }
}
```

## 🚦 Status Codes

### Transaction Status:
- `PROCESSING` - Sedang diproses
- `SUCCESS` - Berhasil
- `FAILED` - Gagal
- `ERROR` - Error sistem

### API Response Status:
- `200` - Success
- `400` - Bad Request
- `401` - Unauthorized
- `500` - Internal Server Error

## 🐞 Troubleshooting

### Bot tidak merespons:
1. Cek koneksi WhatsApp
2. Periksa log error: `tail -f logs/error.log`
3. Restart bot: `npm start`

### API Error:
1. Test koneksi: `npm run test-api`
2. Cek credentials di `.env`
3. Verifikasi saldo provider

### Database Issues:
1. Cek folder `data/` ada dan writable
2. Backup dan reset jika perlu
3. Periksa log sistem

## 📞 Support

- **Developer:** fadzdigital
- **WhatsApp:** wa.me/6285727035336
- **Issues:** Buka issue di GitHub repository

## 📄 License

MIT License - Bebas digunakan dan dimodifikasi.

## 🙏 Credits

- **Baileys** - WhatsApp Web API
- **Winston** - Logging library
- **Hesda Store** - API Provider
- **Axios** - HTTP client

---

**⚠️ Disclaimer:** Bot ini untuk tujuan untuk mempermudah interaksi dengan Web Hesda-Store. Pastikan mematuhi ToS WhatsApp dan provider API, Segala Bentuk Tujuan Maupun Resiko Bukan Tanggung Jawab Saya!!