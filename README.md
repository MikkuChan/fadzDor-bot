# 📚 **FadzDor Bot - Dokumentasi Lengkap**

## 📋 **Daftar Isi**

1. [Overview](#overview)
2. [Architecture & Structure](#architecture--structure)
3. [Installation & Setup](#installation--setup)
4. [Configuration](#configuration)
5. [Features & Commands](#features--commands)
6. [Database Schema](#database-schema)
7. [API Documentation](#api-documentation)
8. [Admin Guide](#admin-guide)
9. [User Guide](#user-guide)
10. [Development Guide](#development-guide)
11. [Troubleshooting](#troubleshooting)
12. [FAQ](#faq)

---

## 🎯 **Overview**

**FadzDor Bot** adalah bot WhatsApp yang dirancang untuk menjual paket data XL/Axis dengan sistem pembayaran otomatis. Bot ini mendukung dua jenis paket:

- **Regular Packages**: Pembelian paket normal dengan 1 step
- **Special Packages**: Pembelian paket dengan multi-step dan retry logic khusus

### **🌟 Key Features**

- ✅ **Multi-Package Support** - Regular & Special packages
- ✅ **Advanced Retry Logic** - Smart retry untuk special packages
- ✅ **Balance Management** - Sistem saldo terintegrasi
- ✅ **Admin Management** - Multi-level admin system
- ✅ **Transaction Tracking** - Complete transaction logs
- ✅ **Session Management** - Automatic session handling
- ✅ **Payment Methods** - DANA, QRIS, PULSA support
- ✅ **Real-time Notifications** - Admin monitoring system
- ✅ **Modular Architecture** - Easy to maintain & extend

---

## 🏗️ **Architecture & Structure**

### **📁 Project Structure**

```
fadzor-bot/
├── main.js                           # Entry point
├── package.json                      # Dependencies
├── .env                             # Environment variables
├── README.md                        # Basic documentation
├── data/                           # Database files
│   ├── bot.db                      # Main database
│   └── special_packages.db         # Special packages database
├── baileys_auth/                   # WhatsApp auth session
├── logs/                          # Application logs
└── src/
    ├── database/
    │   ├── Database.js             # Main database handler
    │   └── SpecialDatabase.js      # Special packages database
    ├── services/
    │   ├── UserService.js          # User management
    │   ├── PackageService.js       # Regular packages
    │   ├── SpecialPackageService.js # Special packages
    │   ├── TransactionService.js   # Transaction handling
    │   ├── SessionService.js       # Session management
    │   └── HesdaApiService.js      # API integration
    ├── handlers/
    │   ├── WhatsAppHandler.js      # WhatsApp connection
    │   ├── ConversationHandler.js  # Conversation states
    │   ├── PackageWizardHandler.js # Package creation wizard
    │   ├── PackageManagementHandler.js # Package management
    │   ├── PurchaseHandler.js      # Regular purchase
    │   ├── AdminHandler.js         # Admin functions
    │   ├── SpecialPackageHandler.js # Special package management
    │   ├── SpecialPurchaseHandler.js # Special purchase
    │   └── SpecialConversationHandler.js # Special conversations
    └── utils/
        ├── logger.js               # Logging utility
        ├── initialization.js      # Setup functions
        ├── maintenance.js          # Cleanup & tasks
        └── specialPackageParser.js # Command parser
```

### **🔧 Architecture Diagram**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   WhatsApp      │    │   Main Bot      │    │   Hesda API     │
│   Users         │◄──►│   Application   │◄──►│   Provider      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   Database      │
                    │   Layer         │
                    └─────────────────┘
                              │
                    ┌─────────────────┐
                    │   Services      │
                    │   Layer         │
                    └─────────────────┘
                              │
                    ┌─────────────────┐
                    │   Handlers      │
                    │   Layer         │
                    └─────────────────┘
```

---

## 🛠️ **Installation & Setup**

### **📋 Prerequisites**

- **Node.js** >= 16.0.0
- **NPM** >= 8.0.0
- **Ubuntu/Linux** Server (recommended)
- **Build Tools** for SQLite compilation

### **🚀 Installation Steps**

#### **1. System Dependencies**

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install build tools
sudo apt install -y build-essential python3-dev

# Install Node.js (if not installed)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

#### **2. Clone & Setup Project**

```bash
# Clone repository
git clone <repository-url> fadzor-bot
cd fadzor-bot

# Install dependencies
npm install

# Install additional dependencies if needed
npm install axios@1.6.0
npm install baileys@6.6.0
npm install better-sqlite3@12.2.0
npm install dotenv@16.4.5
npm install pino@9.4.0
npm install qrcode-terminal@0.12.0
npm install sqlite@5.1.1
npm install sqlite3@5.1.6
npm install winston@3.11.0
```

#### **3. Create Environment File**

```bash
cp .env.example .env
nano .env
```

#### **4. Setup Directories**

```bash
mkdir -p data logs baileys_auth
chmod 755 data logs baileys_auth
```

#### **5. First Run**

```bash
# Start bot
node main.js

# Follow QR code instructions for WhatsApp authentication
```

---

## ⚙️ **Configuration**

### **📝 Environment Variables (.env)**

```env
# Bot Configuration
BOT_NAME="FadzDor Bot"
OWNER_NUMBER="6285727035336"

# Hesda API Configuration
HESDA_USERNAME="your_email@example.com"
HESDA_PASSWORD="your_password"
HESDA_TOKEN="your_api_token"

# Optional Configuration
WEBHOOK_URL="https://yourwebhook.com/callback"
LOG_LEVEL="info"
```

### **🔧 Configuration Options**

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `BOT_NAME` | Bot display name | ✅ | FadzDor Bot |
| `OWNER_NUMBER` | Owner WhatsApp number | ✅ | - |
| `HESDA_USERNAME` | API provider email | ✅ | - |
| `HESDA_PASSWORD` | API provider password | ✅ | - |
| `HESDA_TOKEN` | API provider token | ✅ | - |
| `WEBHOOK_URL` | Callback URL for payments | ❌ | - |
| `LOG_LEVEL` | Logging level | ❌ | info |

---

## 🎮 **Features & Commands**

### **👤 User Commands**

| Command | Description | Example |
|---------|-------------|---------|
| `.menu` | Show main menu | `.menu` |
| `.saldo` | Check balance | `.saldo` |
| `.paket` | List regular packages | `.paket` |
| `.listpaket_khusus` | List special packages | `.listpaket_khusus` |
| `.beli` | Buy regular package | `.beli` |
| `.beli_paket_khusus` | Buy special package | `.beli_paket_khusus` |
| `.cancel` | Cancel current process | `.cancel` |

### **👑 Admin Commands**

#### **💰 Balance Management**
| Command | Description | Example |
|---------|-------------|---------|
| `.addsaldo [nomor] [jumlah]` | Add user balance | `.addsaldo 6285727035336 50000` |
| `.userlist` | List all users | `.userlist` |
| `.saldosistem` | Check system balance | `.saldosistem` |

#### **📦 Regular Package Management**
| Command | Description | Example |
|---------|-------------|---------|
| `.createpaket` | Package creation wizard | `.createpaket` |
| `.addpaket [params]` | Add package directly | `.addpaket pkg1 "Package Name" "Description" "DANA:id:2000:1500"` |
| `.editpaket [id] [field] [value]` | Edit package | `.editpaket pkg1 name "New Name"` |
| `.delpaket [id]` | Delete package permanently | `.delpaket pkg1` |
| `.deactive [id]` | Deactivate package | `.deactive pkg1` |
| `.activate [id]` | Activate package | `.activate pkg1` |
| `.setprice [id] [method] [price]` | Update price | `.setprice pkg1 DANA 3000` |

#### **🔥 Special Package Management**
| Command | Description | Example |
|---------|-------------|---------|
| `.createpaket_khusus` | Special package wizard | `.createpaket_khusus` |
| `.addpaket_khusus [params]` | Add special package | See [Special Package Format](#special-package-format) |
| `.setprice_paket_khusus [id] [price]` | Update special price | `.setprice_paket_khusus xuts1 5000` |
| `.edit_paket_khusus [id] [field] [value]` | Edit special package | `.edit_paket_khusus xuts1 name "New Name"` |
| `.delpaket_paket_khusus [id]` | Delete special package | `.delpaket_paket_khusus xuts1` |
| `.deactive_paket_khusus [id]` | Deactivate special | `.deactive_paket_khusus xuts1` |
| `.activate_paket_khusus [id]` | Activate special | `.activate_paket_khusus xuts1` |

#### **📊 System Management**
| Command | Description | Example |
|---------|-------------|---------|
| `.stats` | System statistics | `.stats` |
| `.broadcast [message]` | Broadcast to all users | `.broadcast Server maintenance at 10 PM` |
| `.listadmin` | List all admins | `.listadmin` |

### **🔰 Owner Only Commands**
| Command | Description | Example |
|---------|-------------|---------|
| `.addadmin [nomor]` | Add new admin | `.addadmin 6285727035336` |
| `.removeadmin [nomor]` | Remove admin | `.removeadmin 6285727035336` |

---

## 🗄️ **Database Schema**

### **📊 Main Database (bot.db)**

#### **users**
```sql
CREATE TABLE users (
  phone_number TEXT PRIMARY KEY,
  balance INTEGER DEFAULT 0,
  is_admin BOOLEAN DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### **packages**
```sql
CREATE TABLE packages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  methods TEXT NOT NULL, -- JSON
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### **transactions**
```sql
CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  package_id TEXT NOT NULL,
  package_name TEXT NOT NULL,
  target_number TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  amount INTEGER NOT NULL,
  cost INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  hesda_trx_id TEXT,
  access_token TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(phone_number)
);
```

#### **balance_logs**
```sql
CREATE TABLE balance_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  transaction_id TEXT,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL, -- add, subtract, refund
  reason TEXT NOT NULL,
  balance_before INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(phone_number)
);
```

#### **sessions**
```sql
CREATE TABLE sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone_number TEXT NOT NULL,
  access_token TEXT NOT NULL,
  auth_id TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT 1
);
```

### **📊 Special Database (special_packages.db)**

#### **special_packages**
```sql
CREATE TABLE special_packages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  special_steps TEXT NOT NULL, -- JSON array
  final_step TEXT NOT NULL, -- JSON object
  total_steps INTEGER NOT NULL,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### **special_transactions**
```sql
CREATE TABLE special_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  package_id TEXT NOT NULL,
  package_name TEXT NOT NULL,
  target_number TEXT NOT NULL,
  current_step INTEGER DEFAULT 1,
  total_steps INTEGER NOT NULL,
  final_payment_method TEXT,
  final_amount INTEGER,
  final_cost INTEGER,
  status TEXT DEFAULT 'pending',
  step_results TEXT, -- JSON array
  hesda_trx_id TEXT,
  access_token TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);
```

#### **special_package_logs**
```sql
CREATE TABLE special_package_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  package_id TEXT NOT NULL,
  step_number INTEGER NOT NULL,
  step_type TEXT NOT NULL, -- 'special' or 'final'
  package_id_hesda TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  cost INTEGER NOT NULL,
  result TEXT, -- JSON result
  status TEXT NOT NULL, -- 'success', 'failed', 'error_422'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🔌 **API Documentation**

### **🌐 Hesda API Integration**

#### **Authentication**
```javascript
// Basic Auth + API Token
const auth = {
  username: process.env.HESDA_USERNAME,
  password: process.env.HESDA_PASSWORD
};

const params = {
  hesdastore: process.env.HESDA_TOKEN
};
```

#### **Endpoints Used**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/get_otp` | POST | Request OTP for phone number |
| `/login_sms` | POST | Verify OTP and get access token |
| `/cek_sesi_login` | GET | Check existing session |
| `/beli/otp` | POST | Purchase package |
| `/saldo` | GET | Check system balance |
| `/cek_transaksi/{id}` | GET | Check transaction status |

#### **API Response Patterns**

**Success Response:**
```json
{
  "status": true,
  "message": "Success message",
  "data": {
    // Response data
  }
}
```

**Error Response:**
```json
{
  "status": false,
  "message": "Error message",
  "data": []
}
```

**Special 422 Response (Success for Special Packages):**
```json
{
  "status": false,
  "message": "...Error Message: 422 -> Failed call ipaas purchase...",
  "data": []
}
```

---

## 👨‍💼 **Admin Guide**

### **🚀 Getting Started as Admin**

1. **Becoming Admin**: Owner adds you via `.addadmin [your_number]`
2. **First Login**: Type `.menu` to see admin commands
3. **Check System**: Use `.saldosistem` to check provider balance
4. **Monitor Users**: Use `.userlist` and `.stats` for monitoring

### **📦 Package Management**

#### **Creating Regular Package**

**Option 1: Wizard (Easiest)**
```
.createpaket
```
Follow the step-by-step wizard.

**Option 2: Direct Command**
```
.addpaket pkg1 "Package Name" "Package Description" "DANA:package_hesda_id:2000:1500,PULSA:package_hesda_id2:2000:1500"
```

#### **Creating Special Package**

**Option 1: Wizard (Recommended)**
```
.createpaket_khusus
```

**Option 2: Direct Command**
```
.addpaket_khusus "xuts1" "XUTS Premium" "Special package with multi-step" "2" "1:PULSA:step1_id:0" "2:PULSA:step2_id:0" "LAST:DANA:final_id:4500:9000"
```

### **💰 Balance Management**

#### **Adding User Balance**
```
.addsaldo 6285727035336 50000
```

#### **Monitoring System Balance**
```
.saldosistem
```
- Green (>50k): Aman
- Yellow (20k-50k): Perlu perhatian  
- Red (<20k): Rendah, perlu topup

### **📊 Monitoring & Analytics**

#### **System Statistics**
```
.stats
```
Shows:
- User statistics
- Transaction statistics  
- Package statistics
- Session statistics

#### **User Management**
```
.userlist
```
Shows all users with balance and activity.

### **📢 Communication**

#### **Broadcasting**
```
.broadcast Server akan maintenance jam 22:00 WIB
```
Sends message to all users.

### **🛠️ Maintenance Tasks**

#### **Daily Tasks**
- Check `.saldosistem` 
- Monitor `.stats`
- Check failed transactions

#### **Weekly Tasks**
- Review `.userlist` for inactive users
- Check package performance
- Update package prices if needed

#### **Monthly Tasks**
- Database cleanup (automatic)
- Review admin list
- System performance review

---

## 👥 **User Guide**

### **🎯 Getting Started**

1. **First Contact**: Send any message to bot
2. **Registration**: Bot automatically creates account
3. **Check Menu**: Type `.menu` to see available commands
4. **Check Balance**: Type `.saldo` to see current balance

### **💰 Adding Balance**

Balance can only be added by admin. Contact admin to top up your balance.

### **📦 Buying Packages**

#### **Regular Packages**
1. Type `.paket` to see available packages
2. Type `.beli` to start purchase
3. Select package by number or ID
4. Choose payment method
5. Enter target phone number
6. Complete OTP verification (if needed)
7. Complete payment

#### **Special Packages**
1. Type `.listpaket_khusus` to see special packages
2. Type `.beli_paket_khusus` to start purchase
3. Select package by number or ID
4. Enter target phone number
5. Complete OTP verification (if needed)
6. Wait for automatic multi-step process
7. Complete final payment

### **🔄 Payment Methods**

| Method | Description | Notes |
|--------|-------------|-------|
| **DANA** | E-wallet payment | Deeplink support |
| **QRIS** | QR code payment | Auto QR generation |
| **PULSA** | Credit deduction | Automatic deduction |

### **⚠️ Important Notes**

#### **For XL/Axis Numbers**
- Supported prefixes: 0817, 0818, 0819, 0859, 0877, 0878
- Make sure number is active
- Sufficient credit for PULSA payment

#### **For Special Packages**
- Process takes longer (multi-step)
- Don't interrupt the process
- Bot will notify each step progress
- Final payment required after all steps

### **🆘 Getting Help**

- Type `.menu` for available commands
- Type `.cancel` to stop any process
- Contact admin for balance issues
- Check target number format if purchase fails

---

## 💻 **Development Guide**

### **🏗️ Architecture Principles**

1. **Modular Design**: Each feature in separate modules
2. **Service Layer**: Business logic in services
3. **Handler Layer**: User interaction logic
4. **Database Layer**: Data persistence
5. **Utility Layer**: Helper functions

### **🔧 Adding New Features**

#### **Adding New Package Type**

1. **Create Database Schema**
```sql
-- Add to database/Database.js or create new database
CREATE TABLE new_package_type (
  id TEXT PRIMARY KEY,
  -- package specific fields
);
```

2. **Create Service**
```javascript
// services/NewPackageService.js
class NewPackageService {
  // Package management methods
}
```

3. **Create Handler**
```javascript
// handlers/NewPackageHandler.js
class NewPackageHandler {
  // User interaction methods
}
```

4. **Update Main Application**
```javascript
// main.js - Add command handlers
else if (command === '.new_command') {
  await NewPackageHandler.handleCommand(sock, phoneNumber, messageText);
}
```

#### **Adding New Payment Method**

1. **Update HesdaApiService**
```javascript
// Add payment method support
static async processNewPayment(paymentData) {
  // Implementation
}
```

2. **Update Purchase Handlers**
```javascript
// Add to PurchaseHandler.js
case 'NEW_METHOD':
  await this.processNewMethodPayment(result);
  break;
```

### **🧪 Testing**

#### **Manual Testing Commands**
```bash
# Test user commands
.menu
.saldo  
.paket
.beli

# Test admin commands (as admin)
.createpaket
.addsaldo 6285727035336 1000
.stats
```

#### **Database Testing**
```javascript
// Test database operations
const user = await userService.getUser('6285727035336');
console.log('User:', user);

const packages = await packageService.getActivePackages();
console.log('Packages:', packages.length);
```

### **📝 Code Style Guidelines**

#### **Naming Conventions**
- **Classes**: PascalCase (`UserService`)
- **Methods**: camelCase (`getUserById`)
- **Constants**: UPPER_SNAKE_CASE (`API_TIMEOUT`)
- **Variables**: camelCase (`phoneNumber`)

#### **File Structure**
- **Services**: Business logic, database operations
- **Handlers**: User interaction, WhatsApp messaging
- **Utils**: Helper functions, utilities
- **Database**: Schema and connection management

#### **Error Handling**
```javascript
try {
  const result = await someOperation();
  return { success: true, data: result };
} catch (error) {
  this.logger.error('Operation failed:', error);
  return { success: false, error: error.message };
}
```

### **🔍 Debugging**

#### **Log Levels**
- **ERROR**: System errors, failures
- **WARN**: Warning conditions
- **INFO**: General information
- **DEBUG**: Detailed debug information

#### **Common Issues**
1. **Database locked**: Use transactions properly
2. **WhatsApp disconnection**: Implement reconnection logic
3. **API timeout**: Implement retry logic
4. **Memory leaks**: Clear conversation states

---

## 🚨 **Troubleshooting**

### **❌ Common Issues**

#### **1. Bot Won't Start**

**Error**: `Cannot find module 'better-sqlite3'`
```bash
# Solution
sudo apt install build-essential python3-dev
npm install better-sqlite3
```

**Error**: `WhatsApp authentication failed`
```bash
# Solution
rm -rf baileys_auth/
node main.js
# Scan new QR code
```

#### **2. Database Issues**

**Error**: `Database is locked`
```bash
# Solution
# Stop bot
pkill -f "node main.js" 
# Remove lock files
rm -f data/*.db-wal data/*.db-shm
# Restart bot
node main.js
```

**Error**: `Table doesn't exist`
```bash
# Solution - Reset database
rm -f data/bot.db data/special_packages.db
node main.js
# Database will be recreated
```

#### **3. API Issues**

**Error**: `Invalid credentials`
```bash
# Check .env file
nano .env
# Verify HESDA_USERNAME, HESDA_PASSWORD, HESDA_TOKEN
```

**Error**: `Saldo sistem kosong`
```bash
# Check system balance
.saldosistem
# Contact API provider for top-up
```

#### **4. Package Issues**

**Error**: `Package not found`
```bash
# Check package status
.paket
# Verify package is active
.activate [package_id]
```

**Error**: `.listpaket_khusus` error
```bash
# Check special database
ls -la data/special_packages.db
# Recreate if corrupted
rm data/special_packages.db && node main.js
```

### **🔧 Maintenance Commands**

#### **Database Maintenance**
```bash
# Backup databases
cp data/bot.db data/bot_backup_$(date +%Y%m%d).db
cp data/special_packages.db data/special_backup_$(date +%Y%m%d).db

# Check database integrity
sqlite3 data/bot.db "PRAGMA integrity_check;"
```

#### **Log Management**
```bash
# View recent logs
tail -f logs/app.log

# Clear old logs
find logs/ -name "*.log" -mtime +30 -delete
```

#### **Process Management**
```bash
# Check if bot is running
ps aux | grep "node main.js"

# Kill bot process
pkill -f "node main.js"

# Start bot in background
nohup node main.js > logs/console.log 2>&1 &
```

### **📊 Performance Optimization**

#### **Database Optimization**
```sql
-- Run these commands periodically
PRAGMA optimize;
VACUUM;
REINDEX;
```

#### **Memory Management**
```bash
# Monitor memory usage
top -p $(pgrep -f "node main.js")

# If memory high, restart bot
pm2 restart fadzor-bot
```

---

## ❓ **FAQ**

### **👤 User FAQs**

**Q: Bagaimana cara mendapatkan saldo?**
A: Hubungi admin untuk top-up saldo. Admin akan menambahkan saldo menggunakan command `.addsaldo`.

**Q: Nomor apa saja yang didukung?**
A: Nomor XL/Axis dengan prefix: 0817, 0818, 0819, 0859, 0877, 0878.

**Q: Apa bedanya paket biasa dan paket khusus?**
A: 
- **Paket biasa**: 1 langkah pembelian
- **Paket khusus**: Multi-langkah dengan retry otomatis

**Q: Kenapa pembelian gagal?**
A: Periksa:
- Saldo mencukupi
- Nomor target valid (XL/Axis)
- Kartu target aktif
- Tidak ada paket aktif yang konflik

**Q: Bagaimana cara cancel proses?**
A: Ketik `.cancel` kapan saja untuk membatalkan proses yang sedang berjalan.

### **👑 Admin FAQs**

**Q: Bagaimana menambah admin baru?**
A: Hanya owner yang bisa menambah admin dengan `.addadmin [nomor]`.

**Q: Bagaimana cara cek saldo sistem?**
A: Gunakan `.saldosistem` untuk melihat saldo provider dan estimasi transaksi.

**Q: Kapan harus topup saldo sistem?**
A: Ketika saldo <50k atau estimasi transaksi <5x per paket.

**Q: Bagaimana membuat paket khusus?**
A: Gunakan `.createpaket_khusus` untuk wizard atau `.addpaket_khusus` untuk command langsung.

**Q: Bagaimana cara broadcast ke semua user?**
A: Gunakan `.broadcast [pesan]` untuk mengirim pesan ke semua user.

### **💻 Developer FAQs**

**Q: Bagaimana menambah payment method baru?**
A: 
1. Update `HesdaApiService.js`
2. Update purchase handlers
3. Test dengan API provider

**Q: Bagaimana cara backup database?**
A: 
```bash
cp data/bot.db backup/bot_$(date +%Y%m%d).db
cp data/special_packages.db backup/special_$(date +%Y%m%d).db
```

**Q: Bagaimana cara deploy di production?**
A: 
1. Gunakan PM2 untuk process management
2. Setup nginx reverse proxy jika perlu
3. Configure automatic backups
4. Setup monitoring dan alerts

**Q: Bagaimana cara debug conversation states?**
A: Gunakan logger untuk track conversation states:
```javascript
this.logger.info('Conversation state:', { 
  phoneNumber, 
  state: state.state,
  data: Object.keys(state)
});
```

---

## 📞 **Support & Contact**

### **🛠️ Technical Support**

- **GitHub Issues**: Create issue untuk bug reports
- **Documentation**: Refer to this documentation
- **Logs**: Check `logs/app.log` untuk error details

### **📧 Contact Information**

- **Developer**: [Your Contact Info]
- **API Provider**: Hesda Store
- **License**: [Your License Type]

### **🔄 Version History**

- **v2.1.0**: Special packages dengan retry logic
- **v2.0.0**: Modular architecture, admin management
- **v1.0.0**: Basic bot functionality

---

## 📜 **License & Credits**

**FadzDor Bot** - WhatsApp Package Sales Bot

**Credits:**
- **Baileys**: WhatsApp Web API
- **Better SQLite3**: Database engine
- **Winston**: Logging framework
- **Hesda Store**: API Provider

**Made with ❤️ by FadzDigital**

---

*Dokumentasi ini akan terus diperbarui seiring pengembangan bot. Untuk informasi terbaru, selalu refer ke repository dan changelog.*
