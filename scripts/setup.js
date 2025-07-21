// scripts/setup.js
// Script untuk setup awal database dan struktur

const fs = require('fs').promises;
const path = require('path');

async function createDirectories() {
  const dirs = [
    './data',
    './logs',
    './backup'
  ];

  for (const dir of dirs) {
    try {
      await fs.mkdir(dir, { recursive: true });
      console.log(`✅ Created directory: ${dir}`);
    } catch (error) {
      console.log(`❌ Failed to create ${dir}: ${error.message}`);
    }
  }
}

async function createInitialFiles() {
  const files = [
    {
      path: './data/users.json',
      content: {}
    },
    {
      path: './data/transactions.json', 
      content: {}
    },
    {
      path: './data/sessions.json',
      content: {}
    },
    {
      path: './data/packages.json',
      content: {
        "vidio_dana": {
          "code": "XLUNLITURBOVIDIO_DANA",
          "package_id": "ZVdMVXcyKzdJRlJERVdJc1hpVUhmQQ",
          "name": "Paket Vidio Unlimited (DANA/QRIS)",
          "price": 4500,
          "cost": 1500,
          "description": "• Unlimited Turbo Vidio 30 Hari\n• FUP 100-150GB\n• Bisa untuk VPN\n• Pembayaran via DANA/QRIS",
          "payment_method": ["DANA", "QRIS"],
          "active": true,
          "updatedAt": new Date().toISOString()
        },
        "vidio_pulsa": {
          "code": "XLUNLITURBOVIDIO_PULSA", 
          "package_id": "MTJLR28vN3VpUmxObFdHelZwRnVUUQ",
          "name": "Paket Vidio Unlimited (Pulsa)",
          "price": 4500,
          "cost": 1500,
          "description": "• Unlimited Turbo Vidio 30 Hari\n• FUP 100-150GB\n• Bisa untuk VPN\n• Pembayaran via Pulsa",
          "payment_method": ["PULSA"],
          "active": true,
          "updatedAt": new Date().toISOString()
        },
        "masa_aktif": {
          "code": "1447d54e21d581c9fb340e1cbf4e8fca",
          "package_id": "RjFNd09ZVWdsQVhQRHRQMWk0bnFxQQ", 
          "name": "Masa Aktif 1 Tahun",
          "price": 10000,
          "cost": 5000,
          "description": "• Masa Aktif 1 Tahun (45GB)\n• Diperpanjang per bulan\n• Pembayaran via Pulsa",
          "payment_method": ["PULSA"],
          "active": true,
          "updatedAt": new Date().toISOString()
        }
      }
    }
  ];

  for (const file of files) {
    try {
      // Cek apakah file sudah ada
      try {
        await fs.access(file.path);
        console.log(`ℹ️ File already exists: ${file.path}`);
        continue;
      } catch {
        // File tidak ada, buat baru
      }

      await fs.writeFile(file.path, JSON.stringify(file.content, null, 2));
      console.log(`✅ Created file: ${file.path}`);
    } catch (error) {
      console.log(`❌ Failed to create ${file.path}: ${error.message}`);
    }
  }
}

async function createEnvTemplate() {
  const envTemplate = `# fadzDor Bot Environment Variables
# Copy this file to .env and fill with your actual values

# Bot Configuration
OWNER_NUMBER=628XXXXXXXXX
ADMIN_NUMBERS=628XXXXXXXXX,628YYYYYYYYY

# Hesda Store API Configuration
HESDA_KEY=your_hesda_key_here
HESDA_USERNAME=your_hesda_username
HESDA_PASSWORD=your_hesda_password

# Optional: Database Configuration (for future MySQL integration)
# DB_HOST=localhost
# DB_USER=root
# DB_PASSWORD=
# DB_NAME=fadzDor_bot`;

  try {
    // Cek apakah .env sudah ada
    try {
      await fs.access('.env');
      console.log('ℹ️ .env file already exists');
      return;
    } catch {
      // File tidak ada, buat dari template
    }

    await fs.writeFile('.env', envTemplate);
    console.log('✅ Created .env template file');
    console.log('⚠️ Please edit .env file with your actual credentials');
  } catch (error) {
    console.log(`❌ Failed to create .env: ${error.message}`);
  }
}

async function setup() {
  console.log('🚀 Setting up fadzDor Bot...\n');
  
  await createDirectories();
  console.log('');
  
  await createInitialFiles(); 
  console.log('');
  
  await createEnvTemplate();
  console.log('');
  
  console.log('✅ Setup completed!');
  console.log('\n📝 Next steps:');
  console.log('1. Edit .env file with your credentials');
  console.log('2. Run: npm install');
  console.log('3. Test API: npm run test-api');
  console.log('4. Start bot: npm start');
  console.log('\n🔗 Don\'t forget to configure your Hesda Store credentials!');
}

// Run setup
setup().catch(console.error);