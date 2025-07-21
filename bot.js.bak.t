// bot.js - fadzDor Bot Complete Main File
// WhatsApp Bot untuk layanan paket data otomatis
// Created by: fadzdigital

require('dotenv').config();

const { 
  default: makeWASocket, 
  DisconnectReason, 
  useMultiFileAuthState,
  delay
} = require('baileys');
const P = require('pino');
const qrcode = require('qrcode-terminal');

// Import internal modules
const config = require('./config/config');
const commandHandler = require('./handlers/commandHandler');
const { 
  logBotActivity, 
  logSystemError, 
  loggers 
} = require('./utils/logger');
const db = require('./utils/database');

// Global variables
let globalSocket = null;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;

// Fungsi untuk mencatat log dengan format yang konsisten
function log(pesan, tipe = 'info') {
  const timestamp = new Date().toISOString();
  const formattedMessage = `[${timestamp}] [${tipe.toUpperCase()}] ${pesan}`;
  
  console.log(formattedMessage);
  
  // Log ke Winston juga
  if (loggers.bot) {
    loggers.bot[tipe](pesan);
  }
}

// Fungsi untuk mengirim pesan dengan retry logic
async function kirimPesan(sock, penerima, pesan, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      await sock.sendMessage(penerima, { text: pesan });
      return true;
    } catch (error) {
      logSystemError(error, `Sending message to ${penerima} (attempt ${i + 1})`);
      
      if (i < retries - 1) {
        await delay(1000 * (i + 1)); // Exponential backoff
      }
    }
  }
  return false;
}

// Fungsi untuk validasi konfigurasi
function validateConfig() {
  const requiredEnvs = [
    'OWNER_NUMBER',
    'HESDA_KEY',
    'HESDA_USERNAME', 
    'HESDA_PASSWORD'
  ];

  const missingEnvs = requiredEnvs.filter(env => !process.env[env]);
  
  if (missingEnvs.length > 0) {
    log(`❌ Missing required environment variables: ${missingEnvs.join(', ')}`, 'error');
    log('Please check your .env file configuration', 'error');
    process.exit(1);
  }

  // Validate phone number format
  const ownerNumber = process.env.OWNER_NUMBER;
  if (!/^62\d{9,12}$/.test(ownerNumber)) {
    log('⚠️ Owner number format may be incorrect. Expected: 62XXXXXXXXX', 'warn');
  }

  log('✅ Configuration validation passed', 'info');
}

// Fungsi untuk menginisialisasi direktori yang diperlukan
async function initializeDirectories() {
  try {
    await db.ensureDirectories();
    log('✅ Required directories initialized', 'info');
  } catch (error) {
    logSystemError(error, 'Initializing directories');
    throw error;
  }
}

// Fungsi untuk setup connection dengan error handling yang lebih baik
async function createConnection() {
  try {
    const { state, saveCreds } = await useMultiFileAuthState('./baileys_auth');
    
    // Konfigurasi logger Baileys
    const logger = P({ 
      level: process.env.NODE_ENV === 'development' ? 'debug' : 'silent',
      stream: process.env.NODE_ENV === 'development' ? process.stdout : undefined
    });

    // Membuat socket WhatsApp
    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: true,
      logger,
      defaultQueryTimeoutMs: undefined,
      keepAliveIntervalMs: 30000,
      browser: ['fadzDor Bot', 'Chrome', '1.0.0'],
      syncFullHistory: false,
      markOnlineOnConnect: true,
      generateHighQualityLinkPreview: false,
      getMessage: async (key) => {
        return { conversation: 'Bot Message' };
      }
    });

    return { sock, saveCreds };
  } catch (error) {
    logSystemError(error, 'Creating WhatsApp connection');
    throw error;
  }
}

// Handler untuk connection updates
async function handleConnectionUpdate(update, saveCreds, sock) {
  const { connection, lastDisconnect, qr } = update;

  if (qr) {
    console.log('\n' + '='.repeat(60));
    console.log('📱 SCAN QR CODE untuk login WhatsApp');
    console.log('='.repeat(60));
    qrcode.generate(qr, { small: true });
    console.log('='.repeat(60));
    log('QR Code generated, please scan to login', 'info');
  }

  if (connection === 'close') {
    const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
    const errorMessage = lastDisconnect?.error?.message || 'Unknown error';
    
    log(`Connection closed: ${errorMessage}`, 'error');
    
    if (shouldReconnect) {
      reconnectAttempts++;
      
      if (reconnectAttempts <= maxReconnectAttempts) {
        const delay = Math.min(reconnectAttempts * 3000, 15000); // Max 15 seconds
        log(`Reconnecting in ${delay/1000} seconds... (attempt ${reconnectAttempts}/${maxReconnectAttempts})`, 'info');
        
        setTimeout(() => {
          setupConnection();
        }, delay);
      } else {
        log('❌ Max reconnection attempts reached. Please restart the bot manually.', 'error');
        logBotActivity('BOT_MAX_RECONNECT_REACHED', 'system', `Attempts: ${reconnectAttempts}`);
        process.exit(1);
      }
    } else {
      log('User logged out. Exiting...', 'info');
      logBotActivity('BOT_LOGGED_OUT', 'system', 'User initiated logout');
      process.exit(0);
    }
  } else if (connection === 'open') {
    reconnectAttempts = 0; // Reset counter on successful connection
    globalSocket = sock;
    
    log(`🚀 ${config.bot.name} successfully connected to WhatsApp!`, 'info');
    log(`📞 Owner: ${config.bot.ownerNumber}`, 'info');
    log(`👨‍💼 Admins: ${config.bot.adminNumbers.length} admin(s)`, 'info');
    
    logBotActivity('BOT_CONNECTED', 'system', 'Bot successfully connected to WhatsApp');
    
    // Send startup notification to owner
    try {
      await kirimPesan(sock, config.bot.ownerNumber, 
        `🤖 *${config.bot.name} Started*\n\n` +
        `✅ Bot berhasil terhubung!\n` +
        `🕐 Waktu: ${new Date().toLocaleString('id-ID')}\n` +
        `📊 Database: ${process.env.DATABASE_TYPE || 'JSON'}\n\n` +
        `Bot siap melayani transaksi paket data.`
      );
    } catch (error) {
      logSystemError(error, 'Sending startup notification');
    }
  } else if (connection === 'connecting') {
    log('Connecting to WhatsApp...', 'info');
  }
}

// Handler untuk update credentials
function handleCredsUpdate(saveCreds) {
  return (creds) => {
    try {
      saveCreds(creds);
    } catch (error) {
      logSystemError(error, 'Saving credentials');
    }
  };
}

// Handler untuk pesan masuk
async function handleIncomingMessage(sock, messages, type) {
  if (type !== 'notify') return;
  
  const msg = messages[0];
  if (!msg.message) return;
  
  const pengirim = msg.key.remoteJid;
  
  // Skip group messages, broadcast, dan status
  if (!pengirim || 
      pengirim.endsWith('@g.us') || 
      pengirim === 'status@broadcast' ||
      pengirim.startsWith('120363')) {
    return;
  }

  try {
    const tipePesan = Object.keys(msg.message)[0];
    let isiPesan = '';
    
    // Extract message content berdasarkan tipe
    switch (tipePesan) {
      case 'conversation':
        isiPesan = msg.message.conversation;
        break;
      case 'extendedTextMessage':
        isiPesan = msg.message.extendedTextMessage.text;
        break;
      case 'imageMessage':
        if (msg.message.imageMessage.caption) {
          isiPesan = msg.message.imageMessage.caption;
        } else {
          return; // Skip image without caption
        }
        break;
      default:
        return; // Skip other message types
    }

    // Validate message content
    if (!isiPesan || !isiPesan.trim()) return;
    
    // Rate limiting check
    if (!checkRateLimit(pengirim)) {
      log(`Rate limit exceeded for user: ${pengirim}`, 'warn');
      return;
    }

    // Process message
    logBotActivity('MESSAGE_RECEIVED', pengirim, isiPesan.substring(0, 50));
    await commandHandler.handleMessage(sock, msg, pengirim, isiPesan.trim());
    
  } catch (error) {
    logSystemError(error, `Processing message from ${pengirim}`);
    
    // Send error message to user (dengan rate limiting)
    try {
      await kirimPesan(sock, pengirim, 
        '❌ Terjadi kesalahan sistem. Silakan coba lagi dalam beberapa saat.\n\n' +
        `Jika masalah berlanjut, hubungi admin: wa.me/${config.bot.ownerNumber}`
      );
    } catch (sendError) {
      logSystemError(sendError, `Sending error message to ${pengirim}`);
    }
  }
}

// Simple rate limiting untuk mencegah spam
const userRequestCounts = new Map();
function checkRateLimit(userId) {
  const now = Date.now();
  const userRequests = userRequestCounts.get(userId) || [];
  
  // Remove requests older than 1 minute
  const recentRequests = userRequests.filter(time => now - time < 60000);
  
  // Allow max 20 requests per minute
  if (recentRequests.length >= 20) {
    return false;
  }
  
  recentRequests.push(now);
  userRequestCounts.set(userId, recentRequests);
  return true;
}

// Cleanup function untuk rate limiting
function cleanupRateLimit() {
  const now = Date.now();
  for (const [userId, requests] of userRequestCounts.entries()) {
    const recentRequests = requests.filter(time => now - time < 60000);
    if (recentRequests.length === 0) {
      userRequestCounts.delete(userId);
    } else {
      userRequestCounts.set(userId, recentRequests);
    }
  }
}

// Setup main connection
async function setupConnection() {
  try {
    const { sock, saveCreds } = await createConnection();
    
    // Event handlers
    sock.ev.on('connection.update', (update) => {
      handleConnectionUpdate(update, saveCreds, sock);
    });

    sock.ev.on('creds.update', handleCredsUpdate(saveCreds));

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      await handleIncomingMessage(sock, messages, type);
    });

    // Handle other events
    sock.ev.on('presence.update', (update) => {
      // Handle presence updates if needed
    });

    sock.ev.on('chats.upsert', (chats) => {
      // Handle new chats if needed
    });

    return sock;
  } catch (error) {
    logSystemError(error, 'Setting up WhatsApp connection');
    log(`❌ Failed to setup connection: ${error.message}`, 'error');
    
    if (reconnectAttempts < maxReconnectAttempts) {
      reconnectAttempts++;
      const delay = reconnectAttempts * 5000;
      log(`Retrying connection in ${delay/1000} seconds...`, 'info');
      setTimeout(setupConnection, delay);
    } else {
      log('❌ Maximum connection attempts reached. Please check your internet connection and restart the bot.', 'error');
      process.exit(1);
    }
  }
}

// Health check function
async function performHealthCheck() {
  try {
    // Check database connectivity
    const users = await db.getAllUsers();
    
    // Check if bot is responsive
    if (globalSocket && globalSocket.user) {
      log('✅ Health check passed', 'info');
      return true;
    } else {
      log('⚠️ Health check warning: No active connection', 'warn');
      return false;
    }
  } catch (error) {
    logSystemError(error, 'Health check');
    return false;
  }
}

// Periodic maintenance tasks
function startMaintenanceTasks() {
  // Cleanup rate limiting data every 5 minutes
  setInterval(cleanupRateLimit, 5 * 60 * 1000);
  
  // Health check every 10 minutes
  setInterval(performHealthCheck, 10 * 60 * 1000);
  
  // Backup database daily at 02:00
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(2, 0, 0, 0);
  
  const msUntilBackup = tomorrow.getTime() - now.getTime();
  setTimeout(() => {
    db.backup();
    setInterval(() => db.backup(), 24 * 60 * 60 * 1000); // Daily
  }, msUntilBackup);
  
  log('✅ Maintenance tasks scheduled', 'info');
}

// Main bot startup function
async function startBot() {
  console.log('\n' + '='.repeat(60));
  console.log(`🤖 Starting ${config.bot.name}...`);
  console.log('='.repeat(60));
  
  try {
    // Validate configuration
    validateConfig();
    
    // Initialize required directories
    await initializeDirectories();
    
    // Initialize database
    if (db.init && typeof db.init === 'function') {
      await db.init();
    }
    
    // Start maintenance tasks
    startMaintenanceTasks();
    
    // Setup WhatsApp connection
    await setupConnection();
    
    log(`✅ ${config.bot.name} startup completed successfully`, 'info');
    
  } catch (error) {
    logSystemError(error, 'Bot startup');
    log(`❌ Failed to start ${config.bot.name}: ${error.message}`, 'error');
    process.exit(1);
  }
}

// Process termination handlers
function setupProcessHandlers() {
  // Graceful shutdown on SIGINT (Ctrl+C)
  process.on('SIGINT', async () => {
    console.log('\n\n🛑 Received SIGINT. Shutting down gracefully...');
    await gracefulShutdown('SIGINT');
  });

  // Graceful shutdown on SIGTERM
  process.on('SIGTERM', async () => {
    console.log('\n\n🛑 Received SIGTERM. Shutting down gracefully...');
    await gracefulShutdown('SIGTERM');
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logSystemError(error, 'Uncaught Exception');
    log(`❌ Uncaught Exception: ${error.message}`, 'error');
    console.error('Uncaught Exception:', error);
    
    // Try to send notification to owner before exit
    if (globalSocket) {
      kirimPesan(globalSocket, config.bot.ownerNumber, 
        `🚨 *Bot Error*\n\nUncaught Exception occurred:\n${error.message}\n\nBot will restart automatically.`
      ).finally(() => {
        process.exit(1);
      });
    } else {
      process.exit(1);
    }
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    logSystemError(new Error(reason), 'Unhandled Rejection');
    log(`❌ Unhandled Rejection: ${reason}`, 'error');
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });

  log('✅ Process handlers configured', 'info');
}

// Graceful shutdown function
async function gracefulShutdown(signal) {
  try {
    log(`Received ${signal}. Starting graceful shutdown...`, 'info');
    logBotActivity('BOT_SHUTDOWN_START', 'system', `Signal: ${signal}`);
    
    // Send shutdown notification to owner
    if (globalSocket) {
      try {
        await kirimPesan(globalSocket, config.bot.ownerNumber, 
          `🛑 *${config.bot.name} Shutdown*\n\n` +
          `Bot sedang dimatikan...\n` +
          `🕐 Waktu: ${new Date().toLocaleString('id-ID')}\n` +
          `📊 Signal: ${signal}`
        );
      } catch (error) {
        logSystemError(error, 'Sending shutdown notification');
      }
    }
    
    // Close database connections
    if (db.adapter && db.adapter.close) {
      db.adapter.close();
    }
    
    // Close socket connection
    if (globalSocket) {
      globalSocket.end();
    }
    
    logBotActivity('BOT_SHUTDOWN_COMPLETE', 'system', `Signal: ${signal}`);
    log('✅ Graceful shutdown completed', 'info');
    
  } catch (error) {
    logSystemError(error, 'Graceful shutdown');
    log(`❌ Error during shutdown: ${error.message}`, 'error');
  } finally {
    process.exit(0);
  }
}

// Main execution
if (require.main === module) {
  // Setup process handlers first
  setupProcessHandlers();
  
  // Start the bot
  startBot().catch((error) => {
    logSystemError(error, 'Main execution');
    log(`❌ Fatal error starting bot: ${error.message}`, 'error');
    console.error('Fatal Error:', error);
    process.exit(1);
  });
}

// Export for testing purposes
module.exports = {
  startBot,
  kirimPesan,
  validateConfig,
  gracefulShutdown
};