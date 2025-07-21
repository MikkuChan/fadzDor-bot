// scripts/monitor.js
// Real-time monitoring untuk fadzDor Bot

const fs = require('fs');
const path = require('path');

class BotMonitor {
  constructor() {
    this.stats = {
      startTime: new Date(),
      totalMessages: 0,
      totalTransactions: 0,
      successfulTransactions: 0,
      failedTransactions: 0,
      totalRevenue: 0,
      activeUsers: new Set()
    };
    
    this.logDir = './logs';
    this.dataDir = './data';
  }

  // Monitor log files
  watchLogFiles() {
    const logFiles = [
      'bot.log',
      'transaction.log', 
      'api.log',
      'error.log'
    ];

    logFiles.forEach(logFile => {
      const filePath = path.join(this.logDir, logFile);
      
      if (fs.existsSync(filePath)) {
        fs.watchFile(filePath, (curr, prev) => {
          if (curr.mtime > prev.mtime) {
            this.analyzeLogUpdate(logFile, filePath);
          }
        });
        console.log(`👁️ Monitoring: ${logFile}`);
      }
    });
  }

  // Analyze log updates
  analyzeLogUpdate(logFile, filePath) {
    try {
      const data = fs.readFileSync(filePath, 'utf8');
      const lines = data.split('\n');
      const lastLine = lines[lines.length - 2]; // -2 because last line is usually empty

      if (!lastLine) return;

      const logEntry = this.parseLogLine(lastLine);
      if (!logEntry) return;

      // Update stats based on log type
      switch (logFile) {
        case 'bot.log':
          if (logEntry.message.includes('COMMAND_RECEIVED')) {
            this.stats.totalMessages++;
            const userMatch = logEntry.details?.match(/User: (\d+)/);
            if (userMatch) {
              this.stats.activeUsers.add(userMatch[1]);
            }
          }
          break;

        case 'transaction.log':
          if (logEntry.message.includes('PURCHASE_SUCCESS')) {
            this.stats.successfulTransactions++;
            this.stats.totalTransactions++;
            const amountMatch = logEntry.message.match(/Amount: (\d+)/);
            if (amountMatch) {
              this.stats.totalRevenue += parseInt(amountMatch[1]);
            }
          } else if (logEntry.message.includes('PURCHASE_FAILED')) {
            this.stats.failedTransactions++;
            this.stats.totalTransactions++;
          }
          break;

        case 'error.log':
          console.log(`🚨 ERROR: ${logEntry.message}`);
          break;
      }

      this.displayStats();
    } catch (error) {
      console.error(`Error analyzing log ${logFile}:`, error.message);
    }
  }

  // Parse log line
  parseLogLine(line) {
    try {
      const jsonMatch = line.match(/\{.*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return null;
    } catch {
      return null;
    }
  }

  // Display real-time stats
  displayStats() {
    console.clear();
    console.log('📊 fadzDor Bot - Real-time Monitoring\n');
    
    const uptime = this.formatUptime(Date.now() - this.stats.startTime.getTime());
    const successRate = this.stats.totalTransactions > 0 
      ? ((this.stats.successfulTransactions / this.stats.totalTransactions) * 100).toFixed(1)
      : 0;

    console.log(`🕐 Uptime: ${uptime}`);
    console.log(`💬 Total Messages: ${this.stats.totalMessages}`);
    console.log(`👥 Active Users: ${this.stats.activeUsers.size}`);
    console.log(`💰 Total Transactions: ${this.stats.totalTransactions}`);
    console.log(`✅ Successful: ${this.stats.successfulTransactions}`);
    console.log(`❌ Failed: ${this.stats.failedTransactions}`);
    console.log(`📈 Success Rate: ${successRate}%`);
    console.log(`💵 Total Revenue: Rp. ${this.stats.totalRevenue.toLocaleString('id-ID')}`);
    console.log('\n📝 Recent Activity:');
    
    // Show recent transactions
    this.showRecentTransactions();
    
    console.log('\n⚡ Monitoring logs... (Press Ctrl+C to stop)');
  }

  // Show recent transactions
  showRecentTransactions() {
    try {
      const transactionsFile = path.join(this.dataDir, 'transactions.json');
      if (fs.existsSync(transactionsFile)) {
        const transactions = JSON.parse(fs.readFileSync(transactionsFile, 'utf8'));
        const recent = Object.values(transactions)
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 5);

        recent.forEach((tx, index) => {
          const time = new Date(tx.createdAt).toLocaleTimeString('id-ID');
          const status = tx.status === 'SUCCESS' ? '✅' : tx.status === 'FAILED' ? '❌' : '⏳';
          console.log(`  ${status} ${time} - ${tx.packageName} - Rp.${tx.amount.toLocaleString('id-ID')}`);
        });
      }
    } catch (error) {
      console.log('  No recent transactions');
    }
  }

  // Format uptime
  formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  // Monitor system health
  monitorSystemHealth() {
    setInterval(() => {
      this.checkSystemHealth();
    }, 30000); // Check every 30 seconds
  }

  checkSystemHealth() {
    const memUsage = process.memoryUsage();
    const memUsageMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    
    // Alert if memory usage is too high
    if (memUsageMB > 500) {
      console.log(`⚠️ High memory usage: ${memUsageMB}MB`);
    }

    // Check if log files are growing too large
    const logFiles = ['bot.log', 'transaction.log', 'api.log', 'error.log'];
    logFiles.forEach(logFile => {
      const filePath = path.join(this.logDir, logFile);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        const sizeMB = stats.size / (1024 * 1024);
        if (sizeMB > 10) {
          console.log(`⚠️ Large log file: ${logFile} (${sizeMB.toFixed(1)}MB)`);
        }
      }
    });
  }

  // Start monitoring
  start() {
    console.log('🚀 Starting fadzDor Bot Monitor...\n');
    
    // Check if directories exist
    if (!fs.existsSync(this.logDir)) {
      console.log('❌ Logs directory not found. Please run the bot first.');
      return;
    }

    if (!fs.existsSync(this.dataDir)) {
      console.log('❌ Data directory not found. Please run setup first.');
      return;
    }

    this.watchLogFiles();
    this.monitorSystemHealth();
    this.displayStats();

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n\n👋 Stopping monitor...');
      process.exit(0);
    });
  }
}

// Start monitoring
const monitor = new BotMonitor();
monitor.start();