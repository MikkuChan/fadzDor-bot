// utils/database.js - Simple JSON Database (for testing)
const fs = require('fs').promises;
const { logSystemError } = require('./logger');

class DatabaseManager {
  constructor() {
    this.ensureDirectories();
  }

  async ensureDirectories() {
    try {
      await fs.mkdir('./data', { recursive: true });
      await fs.mkdir('./logs', { recursive: true });
      await fs.mkdir('./backup', { recursive: true });
    } catch (error) {
      console.error('Error creating directories:', error.message);
    }
  }

  async readFile(filename) {
    try {
      const data = await fs.readFile(filename, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return {};
      }
      logSystemError(error, `Reading file: ${filename}`);
      return {};
    }
  }

  async writeFile(filename, data) {
    try {
      await fs.writeFile(filename, JSON.stringify(data, null, 2));
      return true;
    } catch (error) {
      logSystemError(error, `Writing file: ${filename}`);
      return false;
    }
  }

  // User Management
  async getUser(phoneNumber) {
    const users = await this.readFile('./data/users.json');
    return users[phoneNumber] || null;
  }

  async createUser(phoneNumber) {
    const users = await this.readFile('./data/users.json');
    const newUser = {
      phoneNumber,
      saldo: 0,
      totalTransaksi: 0,
      registeredAt: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    };
    users[phoneNumber] = newUser;
    await this.writeFile('./data/users.json', users);
    return newUser;
  }

  async updateUserSaldo(phoneNumber, amount, type = 'add') {
    const users = await this.readFile('./data/users.json');
    if (!users[phoneNumber]) {
      users[phoneNumber] = await this.createUser(phoneNumber);
    }
    
    if (type === 'add') {
      users[phoneNumber].saldo += amount;
    } else if (type === 'subtract') {
      users[phoneNumber].saldo -= amount;
    } else {
      users[phoneNumber].saldo = amount;
    }
    
    users[phoneNumber].lastActivity = new Date().toISOString();
    await this.writeFile('./data/users.json', users);
    return users[phoneNumber];
  }

  async getAllUsers() {
    return await this.readFile('./data/users.json');
  }

  // Transaction Management
  async saveTransaction(transactionData) {
    const transactions = await this.readFile('./data/transactions.json');
    const trxId = transactionData.trxId || `TRX-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    transactions[trxId] = {
      ...transactionData,
      trxId,
      createdAt: new Date().toISOString()
    };
    
    await this.writeFile('./data/transactions.json', transactions);
    return transactions[trxId];
  }

  async getTransaction(trxId) {
    const transactions = await this.readFile('./data/transactions.json');
    return transactions[trxId] || null;
  }

  async updateTransactionStatus(trxId, status, additionalData = {}) {
    const transactions = await this.readFile('./data/transactions.json');
    if (transactions[trxId]) {
      transactions[trxId].status = status;
      transactions[trxId].updatedAt = new Date().toISOString();
      Object.assign(transactions[trxId], additionalData);
      await this.writeFile('./data/transactions.json', transactions);
      return transactions[trxId];
    }
    return null;
  }

  async getUserTransactions(phoneNumber, limit = 10) {
    const transactions = await this.readFile('./data/transactions.json');
    return Object.values(transactions)
      .filter(tx => tx.phoneNumber === phoneNumber)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);
  }

  // Session Management
  async saveSession(phoneNumber, accessToken, authId = null) {
    const sessions = await this.readFile('./data/sessions.json');
    sessions[phoneNumber] = {
      accessToken,
      authId,
      createdAt: new Date().toISOString(),
      lastUsed: new Date().toISOString()
    };
    await this.writeFile('./data/sessions.json', sessions);
    return sessions[phoneNumber];
  }

  async getSession(phoneNumber) {
    const sessions = await this.readFile('./data/sessions.json');
    return sessions[phoneNumber] || null;
  }

  async updateSessionLastUsed(phoneNumber) {
    const sessions = await this.readFile('./data/sessions.json');
    if (sessions[phoneNumber]) {
      sessions[phoneNumber].lastUsed = new Date().toISOString();
      await this.writeFile('./data/sessions.json', sessions);
    }
  }

  async deleteSession(phoneNumber) {
    const sessions = await this.readFile('./data/sessions.json');
    delete sessions[phoneNumber];
    await this.writeFile('./data/sessions.json', sessions);
  }

  // Package Management
  async getPackages() {
    return await this.readFile('./data/packages.json');
  }

  async savePackage(packageData) {
    const packages = await this.readFile('./data/packages.json');
    packages[packageData.code] = {
      ...packageData,
      updatedAt: new Date().toISOString()
    };
    await this.writeFile('./data/packages.json', packages);
    return packages[packageData.code];
  }

  async deletePackage(packageCode) {
    const packages = await this.readFile('./data/packages.json');
    delete packages[packageCode];
    await this.writeFile('./data/packages.json', packages);
    return true;
  }

  // Backup
  async backup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = `./backup/backup_${timestamp}`;
    
    try {
      await fs.mkdir(backupDir, { recursive: true });
      
      const files = ['users.json', 'transactions.json', 'sessions.json', 'packages.json'];
      for (const file of files) {
        try {
          await fs.copyFile(`./data/${file}`, `${backupDir}/${file}`);
        } catch (error) {
          // File mungkin belum ada, skip
        }
      }
      
      console.log(`✅ Database backup completed: ${timestamp}`);
    } catch (error) {
      console.error('Backup failed:', error.message);
    }
  }
}

module.exports = new DatabaseManager();