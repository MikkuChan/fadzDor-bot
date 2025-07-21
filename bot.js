// bot.js - fadzDor Bot with Fixed Imports
require('dotenv').config();

// Import Baileys dengan error handling
let makeWASocket, DisconnectReason, useMultiFileAuthState, delay;

try {
  // Try @whiskeysockets/baileys first
  const baileys = require('@whiskeysockets/baileys');
  makeWASocket = baileys.default;
  DisconnectReason = baileys.DisconnectReason;
  useMultiFileAuthState = baileys.useMultiFileAuthState;
  delay = baileys.delay;
} catch (error) {
  try {
    // Fallback to baileys
    const baileys = require('baileys');
    makeWASocket = baileys.default;
    DisconnectReason = baileys.DisconnectReason;
    useMultiFileAuthState = baileys.useMultiFileAuthState;
    delay = baileys.delay;
  } catch (fallbackError) {
    console.error('❌ Error loading Baileys:', error.message);
    console.error('❌ Fallback also failed:', fallbackError.message);
    console.log('\n🔧 Try running these commands:');
    console.log('npm install @whiskeysockets/baileys --legacy-peer-deps');
    console.log('npm install baileys --legacy-peer-deps');
    process.exit(1);
  }
}

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
      
      if (i < retries - 1 && delay) {
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
        const delayTime = Math.min(reconnectAttempts * 3000, 15000);
        log(`Reconnecting in ${delayTime/1000} seconds... (attempt ${reconnectAttempts}/${maxReconnectAttempts})`, 'info');
        
        setTimeout(() => {
          setupConnection();
        }, delayTime);
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
    reconnectAttempts = 0;
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

// Setup main connection
async function setupConnection() {
  try {
    const { sock, saveCreds } = await createConnection();
    
    // Event handlers
    sock.ev.on('connection.update', (update) => {
      handleConnectionUpdate(update, saveCreds, sock);
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;
      
      const msg = messages[0];
      if (!msg.message) return;
      
      const pengirim = msg.key.remoteJid;
      
      if (!pengirim || 
          pengirim.endsWith('@g.us') || 
          pengirim === 'status@broadcast') {
        return;
      }

      try {
        const tipePesan = Object.keys(msg.message)[0];
        let isiPesan = '';
        
        switch (tipePesan) {
          case 'conversation':
            isiPesan = msg.message.conversation;
            break;
          case 'extendedTextMessage':
            isiPesan = msg.message.extendedTextMessage.text;
            break;
          default:
            return;
        }

        if (!isiPesan || !isiPesan.trim()) return;
        
        logBotActivity('MESSAGE_RECEIVED', pengirim, isiPesan.substring(0, 50));
        await commandHandler.handleMessage(sock, msg, pengirim, isiPesan.trim());
        
      } catch (error) {
        logSystemError(error, `Processing message from ${pengirim}`);
        
        try {
          await kirimPesan(sock, pengirim, 
            '❌ Terjadi kesalahan sistem. Silakan coba lagi dalam beberapa saat.\n\n' +
            `Jika masalah berlanjut, hubungi admin: wa.me/${config.bot.ownerNumber}`
          );
        } catch (sendError) {
          logSystemError(sendError, `Sending error message to ${pengirim}`);
        }
      }
    });

    return sock;
  } catch (error) {
    logSystemError(error, 'Setting up WhatsApp connection');
    log(`❌ Failed to setup connection: ${error.message}`, 'error');
    
    if (reconnectAttempts < maxReconnectAttempts) {
      reconnectAttempts++;
      const delayTime = reconnectAttempts * 5000;
      log(`Retrying connection in ${delayTime/1000} seconds...`, 'info');
      setTimeout(setupConnection, delayTime);
    } else {
      log('❌ Maximum connection attempts reached.', 'error');
      process.exit(1);
    }
  }
}

// Main bot startup function
async function startBot() {
  console.log('\n' + '='.repeat(60));
  console.log(`🤖 Starting ${config.bot.name}...`);
  console.log('='.repeat(60));
  
  try {
    validateConfig();
    await setupConnection();
    
    log(`✅ ${config.bot.name} startup completed successfully`, 'info');
    
  } catch (error) {
    logSystemError(error, 'Bot startup');
    log(`❌ Failed to start ${config.bot.name}: ${error.message}`, 'error');
    process.exit(1);
  }
}

// Process handlers
process.on('SIGINT', async () => {
  console.log('\n\n🛑 Shutting down gracefully...');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection:', reason);
});

// Start the bot
if (require.main === module) {
  startBot().catch((error) => {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  });
}