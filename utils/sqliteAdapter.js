// utils/sqliteAdapter.js
// SQLite Database Adapter (Optional - untuk yang mau pakai SQLite)

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const { logSystemError } = require('./logger');

class SQLiteAdapter {
  constructor(dbPath = './data/fadzDor.db') {
    this.dbPath = dbPath;
    this.db = null;
    this.init();
  }

  init() {
    try {
      // Pastikan directory ada
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Buka database
      this.db = new Database(this.dbPath);
      this.db.pragma('journal_mode = WAL'); // Write-Ahead Logging untuk performa
      
      // Create tables
      this.createTables();
      
      console.log('✅ SQLite database initialized');
    } catch (error) {
      logSystemError(error, 'SQLite initialization');
      throw error;
    }
  }

  createTables() {
    // Users table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        phone_number TEXT PRIMARY KEY,
        saldo INTEGER DEFAULT 0,
        total_transaksi INTEGER DEFAULT 0,
        registered_at TEXT,
        last_activity TEXT
      )
    `);

    // Transactions table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS transactions (
        trx_id TEXT PRIMARY KEY,
        phone_number TEXT,
        target_number TEXT,
        package_name TEXT,
        package_id TEXT,
        amount INTEGER,
        cost INTEGER,
        status TEXT,
        hesda_trx_id TEXT,
        payment_method TEXT,
        created_at TEXT,
        updated_at TEXT,
        FOREIGN KEY (phone_number) REFERENCES users (phone_number)
      )
    `);

    // Sessions table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        phone_number TEXT PRIMARY KEY,
        access_token TEXT,
        auth_id TEXT,
        created_at TEXT,
        last_used TEXT
      )
    `);

    // Packages table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS packages (
        package_code TEXT PRIMARY KEY,
        package_id TEXT,
        name TEXT,
        price INTEGER,
        cost INTEGER,
        description TEXT,
        payment_methods TEXT, -- JSON string
        active INTEGER DEFAULT 1,
        created_at TEXT,
        updated_at TEXT
      )
    `);

    // Create indexes for performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_transactions_phone ON transactions(phone_number);
      CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
      CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at);
      CREATE INDEX IF NOT EXISTS idx_users_last_activity ON users(last_activity);
    `);
  }

  // User methods
  getUser(phoneNumber) {
    try {
      const stmt = this.db.prepare('SELECT * FROM users WHERE phone_number = ?');
      const user = stmt.get(phoneNumber);
      return user || null;
    } catch (error) {
      logSystemError(error, `Getting user ${phoneNumber}`);
      return null;
    }
  }

  createUser(phoneNumber) {
    try {
      const now = new Date().toISOString();
      const stmt = this.db.prepare(`
        INSERT INTO users (phone_number, saldo, total_transaksi, registered_at, last_activity)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      stmt.run(phoneNumber, 0, 0, now, now);
      return this.getUser(phoneNumber);
    } catch (error) {
      logSystemError(error, `Creating user ${phoneNumber}`);
      return null;
    }
  }

  updateUserSaldo(phoneNumber, amount, type = 'add') {
    try {
      const user = this.getUser(phoneNumber) || this.createUser(phoneNumber);
      let newSaldo = user.saldo;

      if (type === 'add') {
        newSaldo += amount;
      } else if (type === 'subtract') {
        newSaldo -= amount;
      } else if (type === 'set') {
        newSaldo = amount;
      }

      const stmt = this.db.prepare(`
        UPDATE users 
        SET saldo = ?, last_activity = ?
        WHERE phone_number = ?
      `);
      
      stmt.run(newSaldo, new Date().toISOString(), phoneNumber);
      return this.getUser(phoneNumber);
    } catch (error) {
      logSystemError(error, `Updating saldo for ${phoneNumber}`);
      return null;
    }
  }

  getAllUsers() {
    try {
      const stmt = this.db.prepare('SELECT * FROM users ORDER BY registered_at DESC');
      const users = stmt.all();
      
      // Convert to object format (sama seperti JSON database)
      const result = {};
      users.forEach(user => {
        result[user.phone_number] = user;
      });
      
      return result;
    } catch (error) {
      logSystemError(error, 'Getting all users');
      return {};
    }
  }

  // Transaction methods
  saveTransaction(transactionData) {
    try {
      const trxId = transactionData.trxId || `TRX-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();
      
      const stmt = this.db.prepare(`
        INSERT INTO transactions (
          trx_id, phone_number, target_number, package_name, package_id,
          amount, cost, status, hesda_trx_id, payment_method, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        trxId,
        transactionData.phoneNumber,
        transactionData.targetNumber,
        transactionData.packageName,
        transactionData.packageId,
        transactionData.amount,
        transactionData.cost || 0,
        transactionData.status,
        transactionData.hesdaTrxId || null,
        transactionData.paymentMethod || null,
        now,
        now
      );
      
      return this.getTransaction(trxId);
    } catch (error) {
      logSystemError(error, 'Saving transaction');
      return null;
    }
  }

  getTransaction(trxId) {
    try {
      const stmt = this.db.prepare('SELECT * FROM transactions WHERE trx_id = ?');
      return stmt.get(trxId) || null;
    } catch (error) {
      logSystemError(error, `Getting transaction ${trxId}`);
      return null;
    }
  }

  updateTransactionStatus(trxId, status, additionalData = {}) {
    try {
      const now = new Date().toISOString();
      let query = 'UPDATE transactions SET status = ?, updated_at = ?';
      let params = [status, now];
      
      // Add optional fields
      if (additionalData.hesdaTrxId) {
        query += ', hesda_trx_id = ?';
        params.push(additionalData.hesdaTrxId);
      }
      if (additionalData.paymentMethod) {
        query += ', payment_method = ?';
        params.push(additionalData.paymentMethod);
      }
      
      query += ' WHERE trx_id = ?';
      params.push(trxId);
      
      const stmt = this.db.prepare(query);
      stmt.run(...params);
      
      return this.getTransaction(trxId);
    } catch (error) {
      logSystemError(error, `Updating transaction ${trxId}`);
      return null;
    }
  }

  getUserTransactions(phoneNumber, limit = 10) {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM transactions 
        WHERE phone_number = ? 
        ORDER BY created_at DESC 
        LIMIT ?
      `);
      
      return stmt.all(phoneNumber, limit);
    } catch (error) {
      logSystemError(error, `Getting transactions for ${phoneNumber}`);
      return [];
    }
  }

  // Session methods
  saveSession(phoneNumber, accessToken, authId = null) {
    try {
      const now = new Date().toISOString();
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO sessions (phone_number, access_token, auth_id, created_at, last_used)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      stmt.run(phoneNumber, accessToken, authId, now, now);
      return this.getSession(phoneNumber);
    } catch (error) {
      logSystemError(error, `Saving session for ${phoneNumber}`);
      return null;
    }
  }

  getSession(phoneNumber) {
    try {
      const stmt = this.db.prepare('SELECT * FROM sessions WHERE phone_number = ?');
      return stmt.get(phoneNumber) || null;
    } catch (error) {
      logSystemError(error, `Getting session for ${phoneNumber}`);
      return null;
    }
  }

  updateSessionLastUsed(phoneNumber) {
    try {
      const stmt = this.db.prepare('UPDATE sessions SET last_used = ? WHERE phone_number = ?');
      stmt.run(new Date().toISOString(), phoneNumber);
    } catch (error) {
      logSystemError(error, `Updating session for ${phoneNumber}`);
    }
  }

  deleteSession(phoneNumber) {
    try {
      const stmt = this.db.prepare('DELETE FROM sessions WHERE phone_number = ?');
      stmt.run(phoneNumber);
    } catch (error) {
      logSystemError(error, `Deleting session for ${phoneNumber}`);
    }
  }

  // Backup & Maintenance
  backup(backupPath) {
    try {
      const backup = this.db.backup(backupPath);
      backup.close();
      console.log(`✅ Database backed up to: ${backupPath}`);
    } catch (error) {
      logSystemError(error, 'Database backup');
    }
  }

  vacuum() {
    try {
      this.db.exec('VACUUM');
      console.log('✅ Database optimized');
    } catch (error) {
      logSystemError(error, 'Database vacuum');
    }
  }

  close() {
    if (this.db) {
      this.db.close();
      console.log('✅ Database connection closed');
    }
  }

  // Convert to JSON format (untuk compatibility)
  async exportToJSON() {
    try {
      const data = {
        users: this.getAllUsers(),
        transactions: {},
        sessions: {}
      };

      // Get all transactions
      const allTx = this.db.prepare('SELECT * FROM transactions').all();
      allTx.forEach(tx => {
        data.transactions[tx.trx_id] = tx;
      });

      // Get all sessions
      const allSessions = this.db.prepare('SELECT * FROM sessions').all();
      allSessions.forEach(session => {
        data.sessions[session.phone_number] = session;
      });

      return data;
    } catch (error) {
      logSystemError(error, 'Exporting to JSON');
      return null;
    }
  }
}

module.exports = SQLiteAdapter;