// scripts/database-migration.js
// Tool untuk migrasi antar database types

require('dotenv').config();
const fs = require('fs').promises;

class DatabaseMigration {
  constructor() {
    this.currentType = process.env.DATABASE_TYPE || 'json';
  }

  async showCurrentInfo() {
    console.log('📊 fadzDor Bot Database Information\n');
    console.log('='.repeat(50));
    
    console.log(`Current Database Type: ${this.currentType.toUpperCase()}`);
    
    if (this.currentType === 'json') {
      await this.showJSONInfo();
    } else if (this.currentType === 'sqlite') {
      await this.showSQLiteInfo();
    }
  }

  async showJSONInfo() {
    try {
      const files = [
        { name: 'users.json', path: './data/users.json' },
        { name: 'transactions.json', path: './data/transactions.json' },
        { name: 'sessions.json', path: './data/sessions.json' },
        { name: 'packages.json', path: './data/packages.json' }
      ];

      console.log('\n📁 JSON Files Status:');
      let totalSize = 0;

      for (const file of files) {
        try {
          const stats = await fs.stat(file.path);
          const sizeKB = Math.round(stats.size / 1024);
          totalSize += stats.size;
          
          const data = JSON.parse(await fs.readFile(file.path, 'utf8'));
          const recordCount = Object.keys(data).length;
          
          console.log(`✅ ${file.name}: ${sizeKB}KB (${recordCount} records)`);
        } catch {
          console.log(`❌ ${file.name}: Not found`);
        }
      }

      console.log(`\nTotal Size: ${Math.round(totalSize / 1024)}KB`);
      
      // Show user stats
      try {
        const users = JSON.parse(await fs.readFile('./data/users.json', 'utf8'));
        const userCount = Object.keys(users).length;
        const totalSaldo = Object.values(users).reduce((sum, user) => sum + (user.saldo || 0), 0);
        
        console.log(`\n👥 Users: ${userCount}`);
        console.log(`💰 Total Saldo: Rp.${totalSaldo.toLocaleString('id-ID')}`);
      } catch {}

    } catch (error) {
      console.log('❌ Error reading JSON files:', error.message);
    }
  }

  async showSQLiteInfo() {
    try {
      const SQLiteAdapter = require('../utils/sqliteAdapter');
      const dbPath = process.env.DB_PATH || './data/fadzDor.db';
      
      try {
        const stats = await fs.stat(dbPath);
        const sizeMB = Math.round(stats.size / 1024 / 1024 * 100) / 100;
        console.log(`\n💾 SQLite Database: ${sizeMB}MB`);
        console.log(`📍 Path: ${dbPath}`);
        
        // Connect to get record counts
        const sqlite = new SQLiteAdapter(dbPath);
        const users = sqlite.getAllUsers();
        const userCount = Object.keys(users).length;
        
        console.log(`\n👥 Users: ${userCount}`);
        sqlite.close();
        
      } catch {
        console.log('\n❌ SQLite database not found');
      }
      
    } catch (error) {
      console.log('❌ Error accessing SQLite:', error.message);
    }
  }

  async migrateJSONToSQLite() {
    console.log('🔄 Migrating JSON → SQLite...\n');
    
    try {
      // Check if better-sqlite3 is installed
      try {
        require('better-sqlite3');
      } catch {
        console.log('❌ better-sqlite3 not installed');
        console.log('Run: npm install better-sqlite3');
        return;
      }

      const SQLiteAdapter = require('../utils/sqliteAdapter');
      const sqlite = new SQLiteAdapter();
      
      let migratedUsers = 0;
      let migratedTransactions = 0;
      let migratedSessions = 0;

      // Migrate Users
      console.log('📄 Migrating users...');
      try {
        const usersData = await fs.readFile('./data/users.json', 'utf8');
        const users = JSON.parse(usersData);
        
        for (const [phone, user] of Object.entries(users)) {
          sqlite.createUser(phone);
          if (user.saldo) {
            sqlite.updateUserSaldo(phone, user.saldo, 'set');
          }
          migratedUsers++;
        }
        console.log(`✅ Users migrated: ${migratedUsers}`);
      } catch (error) {
        console.log('⚠️ No users.json found or error migrating users');
      }

      // Migrate Transactions
      console.log('📄 Migrating transactions...');
      try {
        const txData = await fs.readFile('./data/transactions.json', 'utf8');
        const transactions = JSON.parse(txData);
        
        for (const tx of Object.values(transactions)) {
          sqlite.saveTransaction(tx);
          migratedTransactions++;
        }
        console.log(`✅ Transactions migrated: ${migratedTransactions}`);
      } catch (error) {
        console.log('⚠️ No transactions.json found or error migrating transactions');
      }

      // Migrate Sessions
      console.log('📄 Migrating sessions...');
      try {
        const sessionsData = await fs.readFile('./data/sessions.json', 'utf8');
        const sessions = JSON.parse(sessionsData);
        
        for (const [phone, session] of Object.entries(sessions)) {
          sqlite.saveSession(phone, session.accessToken, session.authId);
          migratedSessions++;
        }
        console.log(`✅ Sessions migrated: ${migratedSessions}`);
      } catch (error) {
        console.log('⚠️ No sessions.json found or error migrating sessions');
      }

      sqlite.close();
      
      console.log('\n🎉 Migration completed successfully!');
      console.log('\nTo use SQLite database:');
      console.log('1. Add DATABASE_TYPE=sqlite to your .env file');
      console.log('2. Restart the bot');
      console.log('\nBackup your JSON files before switching!');
      
    } catch (error) {
      console.log('❌ Migration failed:', error.message);
    }
  }

  async migrateSQLiteToJSON() {
    console.log('🔄 Migrating SQLite → JSON...\n');
    
    try {
      const SQLiteAdapter = require('../utils/sqliteAdapter');
      const sqlite = new SQLiteAdapter();
      
      // Export data from SQLite
      const data = await sqlite.exportToJSON();
      
      if (!data) {
        console.log('❌ Failed to export SQLite data');
        return;
      }

      // Write JSON files
      await fs.writeFile('./data/users.json', JSON.stringify(data.users, null, 2));
      await fs.writeFile('./data/transactions.json', JSON.stringify(data.transactions, null, 2));
      await fs.writeFile('./data/sessions.json', JSON.stringify(data.sessions, null, 2));
      
      const userCount = Object.keys(data.users).length;
      const txCount = Object.keys(data.transactions).length;
      const sessionCount = Object.keys(data.sessions).length;
      
      console.log(`✅ Users exported: ${userCount}`);
      console.log(`✅ Transactions exported: ${txCount}`);
      console.log(`✅ Sessions exported: ${sessionCount}`);
      
      sqlite.close();
      
      console.log('\n🎉 Export completed successfully!');
      console.log('\nTo use JSON database:');
      console.log('1. Remove DATABASE_TYPE from .env (or set to json)');
      console.log('2. Restart the bot');
      
    } catch (error) {
      console.log('❌ Export failed:', error.message);
    }
  }

  async backup() {
    console.log('💾 Creating database backup...\n');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = `./backup/migration_backup_${timestamp}`;
    
    try {
      await fs.mkdir(backupDir, { recursive: true });
      
      if (this.currentType === 'json') {
        // Backup JSON files
        const files = ['users.json', 'transactions.json', 'sessions.json', 'packages.json'];
        
        for (const file of files) {
          try {
            await fs.copyFile(`./data/${file}`, `${backupDir}/${file}`);
            console.log(`✅ Backed up: ${file}`);
          } catch {
            console.log(`⚠️ Skipped: ${file} (not found)`);
          }
        }
      } else if (this.currentType === 'sqlite') {
        // Backup SQLite file
        const dbPath = process.env.DB_PATH || './data/fadzDor.db';
        try {
          await fs.copyFile(dbPath, `${backupDir}/fadzDor.db`);
          console.log(`✅ Backed up: SQLite database`);
        } catch {
          console.log(`⚠️ SQLite database not found`);
        }
      }
      
      console.log(`\n✅ Backup completed: ${backupDir}`);
      
    } catch (error) {
      console.log('❌ Backup failed:', error.message);
    }
  }

  async showHelp() {
    console.log('🔧 fadzDor Database Migration Tool\n');
    console.log('Usage: node scripts/database-migration.js [command]\n');
    console.log('Commands:');
    console.log('  info            - Show current database information');
    console.log('  backup          - Create backup of current database');
    console.log('  json-to-sqlite  - Migrate from JSON to SQLite');
    console.log('  sqlite-to-json  - Export SQLite back to JSON');
    console.log('  help            - Show this help\n');
    console.log('Examples:');
    console.log('  node scripts/database-migration.js info');
    console.log('  node scripts/database-migration.js backup');
    console.log('  node scripts/database-migration.js json-to-sqlite\n');
    console.log('💡 Tips:');
    console.log('  - Always backup before migration');
    console.log('  - JSON: Simple, human-readable, easy backup');
    console.log('  - SQLite: Faster queries, better for large datasets');
    console.log('  - For <1000 users: JSON is recommended');
    console.log('  - For >5000 users: SQLite is recommended');
  }
}

// Main execution
async function main() {
  const migration = new DatabaseMigration();
  const command = process.argv[2] || 'help';
  
  switch (command.toLowerCase()) {
    case 'info':
      await migration.showCurrentInfo();
      break;
      
    case 'backup':
      await migration.backup();
      break;
      
    case 'json-to-sqlite':
      await migration.backup();
      await migration.migrateJSONToSQLite();
      break;
      
    case 'sqlite-to-json':
      await migration.backup();
      await migration.migrateSQLiteToJSON();
      break;
      
    case 'help':
    default:
      await migration.showHelp();
      break;
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = DatabaseMigration;