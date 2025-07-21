// scripts/health-check.js
// Health check untuk sistem fadzDor Bot

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const hesdaApi = require('../services/hesdaApi');

class HealthChecker {
  constructor() {
    this.checks = [];
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      details: []
    };
  }

  // Add check
  addCheck(name, checkFunction, critical = true) {
    this.checks.push({ name, checkFunction, critical });
  }

  // Run all checks
  async runChecks() {
    console.log('🏥 fadzDor Bot Health Check\n');
    console.log('=' .repeat(50));

    for (const check of this.checks) {
      try {
        const result = await check.checkFunction();
        this.processResult(check.name, result, check.critical);
      } catch (error) {
        this.processResult(check.name, {
          status: 'error',
          message: error.message
        }, check.critical);
      }
    }

    this.displaySummary();
  }

  // Process check result
  processResult(name, result, critical) {
    const icon = this.getStatusIcon(result.status);
    console.log(`${icon} ${name}: ${result.message}`);
    
    if (result.details) {
      result.details.forEach(detail => {
        console.log(`   ${detail}`);
      });
    }

    // Update counters
    switch (result.status) {
      case 'pass':
        this.results.passed++;
        break;
      case 'warning':
        this.results.warnings++;
        break;
      case 'fail':
      case 'error':
        this.results.failed++;
        break;
    }

    this.results.details.push({
      name,
      status: result.status,
      message: result.message,
      critical
    });
  }

  // Get status icon
  getStatusIcon(status) {
    switch (status) {
      case 'pass': return '✅';
      case 'warning': return '⚠️';
      case 'fail': return '❌';
      case 'error': return '🚨';
      default: return 'ℹ️';
    }
  }

  // Display summary
  displaySummary() {
    console.log('\n' + '=' .repeat(50));
    console.log('📊 Health Check Summary');
    console.log('=' .repeat(50));
    
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`⚠️ Warnings: ${this.results.warnings}`);
    console.log(`❌ Failed: ${this.results.failed}`);

    const totalChecks = this.results.passed + this.results.warnings + this.results.failed;
    const healthScore = Math.round((this.results.passed / totalChecks) * 100);
    
    console.log(`\n📈 Health Score: ${healthScore}%`);

    // Determine overall status
    const criticalFailures = this.results.details.filter(
      d => d.critical && (d.status === 'fail' || d.status === 'error')
    );

    if (criticalFailures.length > 0) {
      console.log('\n🚨 CRITICAL ISSUES FOUND:');
      criticalFailures.forEach(failure => {
        console.log(`   • ${failure.name}: ${failure.message}`);
      });
      console.log('\n⚠️ Bot may not function properly!');
      process.exit(1);
    } else if (this.results.failed > 0) {
      console.log('\n⚠️ Some non-critical issues found. Check details above.');
      process.exit(1);
    } else if (this.results.warnings > 0) {
      console.log('\n✅ System is healthy with minor warnings.');
    } else {
      console.log('\n✅ All systems are healthy!');
    }
  }

  // Environment variables check
  checkEnvironment() {
    const requiredEnvs = [
      'OWNER_NUMBER',
      'HESDA_KEY', 
      'HESDA_USERNAME',
      'HESDA_PASSWORD'
    ];

    const missing = requiredEnvs.filter(env => !process.env[env]);
    
    if (missing.length > 0) {
      return {
        status: 'fail',
        message: 'Missing required environment variables',
        details: missing.map(env => `Missing: ${env}`)
      };
    }

    // Validate owner number format
    const ownerNumber = process.env.OWNER_NUMBER;
    if (!/^62\d{9,12}$/.test(ownerNumber)) {
      return {
        status: 'warning',
        message: 'Owner number format may be incorrect',
        details: ['Expected format: 62XXXXXXXXX']
      };
    }

    return {
      status: 'pass',
      message: 'All environment variables are set'
    };
  }

  // File system check
  checkFileSystem() {
    const requiredDirs = ['./data', './logs', './baileys_auth'];
    const requiredFiles = [
      './data/users.json',
      './data/transactions.json', 
      './data/sessions.json'
    ];

    const issues = [];

    // Check directories
    requiredDirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        issues.push(`Missing directory: ${dir}`);
      } else {
        try {
          fs.accessSync(dir, fs.constants.W_OK);
        } catch {
          issues.push(`Directory not writable: ${dir}`);
        }
      }
    });

    // Check files
    requiredFiles.forEach(file => {
      if (!fs.existsSync(file)) {
        issues.push(`Missing file: ${file}`);
      }
    });

    if (issues.length > 0) {
      return {
        status: 'fail',
        message: 'File system issues detected',
        details: issues
      };
    }

    return {
      status: 'pass',
      message: 'File system is properly configured'
    };
  }

  // API connectivity check
  async checkApiConnectivity() {
    try {
      const result = await hesdaApi.checkBalance('health-check');
      
      if (result.success) {
        return {
          status: 'pass',
          message: `API connection successful (Balance: Rp.${result.saldo.toLocaleString('id-ID')})`
        };
      } else {
        return {
          status: 'fail',
          message: 'API connection failed',
          details: [result.message]
        };
      }
    } catch (error) {
      return {
        status: 'error',
        message: 'API connection error',
        details: [error.message]
      };
    }
  }

  // Database integrity check
  checkDatabaseIntegrity() {
    const issues = [];
    
    try {
      // Check users.json
      const usersFile = './data/users.json';
      if (fs.existsSync(usersFile)) {
        const users = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
        const userCount = Object.keys(users).length;
        
        // Validate user data structure
        for (const [phone, user] of Object.entries(users)) {
          if (!user.saldo || typeof user.saldo !== 'number') {
            issues.push(`Invalid saldo for user ${phone}`);
          }
          if (!user.registeredAt) {
            issues.push(`Missing registeredAt for user ${phone}`);
          }
        }
        
        if (issues.length === 0) {
          issues.push(`Users database OK (${userCount} users)`);
        }
      }

      // Check transactions.json
      const transactionsFile = './data/transactions.json';
      if (fs.existsSync(transactionsFile)) {
        const transactions = JSON.parse(fs.readFileSync(transactionsFile, 'utf8'));
        const txCount = Object.keys(transactions).length;
        issues.push(`Transactions database OK (${txCount} transactions)`);
      }

      return {
        status: issues.some(i => i.includes('Invalid') || i.includes('Missing')) ? 'warning' : 'pass',
        message: 'Database integrity checked',
        details: issues
      };
      
    } catch (error) {
      return {
        status: 'fail',
        message: 'Database corruption detected',
        details: [error.message]
      };
    }
  }

  // Memory usage check
  checkMemoryUsage() {
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
    
    if (heapUsedMB > 500) {
      return {
        status: 'warning',
        message: 'High memory usage detected',
        details: [`Heap used: ${heapUsedMB}MB / ${heapTotalMB}MB`]
      };
    }

    return {
      status: 'pass',
      message: `Memory usage normal (${heapUsedMB}MB / ${heapTotalMB}MB)`
    };
  }

  // Log files check
  checkLogFiles() {
    const logDir = './logs';
    const issues = [];
    
    if (!fs.existsSync(logDir)) {
      return {
        status: 'warning',
        message: 'Logs directory not found (will be created when bot starts)'
      };
    }

    const logFiles = fs.readdirSync(logDir).filter(f => f.endsWith('.log'));
    
    logFiles.forEach(logFile => {
      const filePath = path.join(logDir, logFile);
      const stats = fs.statSync(filePath);
      const sizeMB = stats.size / (1024 * 1024);
      
      if (sizeMB > 50) {
        issues.push(`Large log file: ${logFile} (${sizeMB.toFixed(1)}MB)`);
      }
    });

    if (issues.length > 0) {
      return {
        status: 'warning',
        message: 'Large log files detected',
        details: issues.concat(['Consider running: npm run clear-logs'])
      };
    }

    return {
      status: 'pass',
      message: `Log files OK (${logFiles.length} files)`
    };
  }

  // Package dependencies check
  checkDependencies() {
    try {
      const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
      const dependencies = Object.keys(packageJson.dependencies || {});
      
      const missingDeps = [];
      dependencies.forEach(dep => {
        try {
          require.resolve(dep);
        } catch {
          missingDeps.push(dep);
        }
      });

      if (missingDeps.length > 0) {
        return {
          status: 'fail',
          message: 'Missing dependencies',
          details: missingDeps.concat(['Run: npm install'])
        };
      }

      return {
        status: 'pass',
        message: `All dependencies installed (${dependencies.length} packages)`
      };
      
    } catch (error) {
      return {
        status: 'error',
        message: 'Could not check dependencies',
        details: [error.message]
      };
    }
  }

  // Run comprehensive health check
  async run() {
    // Add all checks
    this.addCheck('Environment Variables', () => this.checkEnvironment(), true);
    this.addCheck('File System', () => this.checkFileSystem(), true);
    this.addCheck('Dependencies', () => this.checkDependencies(), true);
    this.addCheck('API Connectivity', () => this.checkApiConnectivity(), true);
    this.addCheck('Database Integrity', () => this.checkDatabaseIntegrity(), false);
    this.addCheck('Memory Usage', () => this.checkMemoryUsage(), false);
    this.addCheck('Log Files', () => this.checkLogFiles(), false);

    await this.runChecks();
  }
}

// Quick health check function
async function quickCheck() {
  console.log('⚡ Quick Health Check...\n');
  
  // Environment
  const hasEnv = process.env.HESDA_KEY && process.env.OWNER_NUMBER;
  console.log(`${hasEnv ? '✅' : '❌'} Environment: ${hasEnv ? 'OK' : 'Missing variables'}`);
  
  // Files
  const hasData = fs.existsSync('./data');
  console.log(`${hasData ? '✅' : '❌'} Data Directory: ${hasData ? 'OK' : 'Missing'}`);
  
  // API
  try {
    const hesdaApi = require('../services/hesdaApi');
    const apiResult = await hesdaApi.checkBalance('quick-check');
    console.log(`${apiResult.success ? '✅' : '❌'} API: ${apiResult.success ? 'Connected' : 'Failed'}`);
  } catch {
    console.log('❌ API: Error');
  }
  
  console.log('\nFor detailed check, run: npm run health-check');
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--quick')) {
    quickCheck().catch(console.error);
  } else {
    const checker = new HealthChecker();
    checker.run().catch(console.error);
  }
}