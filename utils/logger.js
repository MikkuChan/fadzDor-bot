// utils/logger.js
const winston = require('winston');
const path = require('path');

// Custom format untuk log
const customFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// Membuat logger dengan kategori berbeda
const createLogger = (category) => {
  return winston.createLogger({
    level: 'info',
    format: customFormat,
    defaultMeta: { service: 'fadzDor-bot', category },
    transports: [
      // Log error ke file terpisah
      new winston.transports.File({
        filename: path.join('logs', 'error.log'),
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        )
      }),
      
      // Log semua aktivitas ke file utama
      new winston.transports.File({
        filename: path.join('logs', `${category}.log`),
        maxsize: 5242880, // 5MB
        maxFiles: 5
      }),
      
      // Log ke console untuk development
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple(),
          winston.format.printf(({ timestamp, level, message, category }) => {
            return `${timestamp} [${category}] ${level}: ${message}`;
          })
        )
      })
    ]
  });
};

// Logger untuk berbagai kategori
const loggers = {
  bot: createLogger('bot'),
  api: createLogger('api'),
  transaction: createLogger('transaction'),
  user: createLogger('user'),
  admin: createLogger('admin'),
  system: createLogger('system')
};

// Helper functions
const logBotActivity = (action, user, details = '') => {
  loggers.bot.info(`${action} - User: ${user}`, { details });
};

const logTransaction = (type, user, amount, status, trxId = '', details = '') => {
  loggers.transaction.info(`${type} - User: ${user} - Amount: ${amount} - Status: ${status}`, {
    trxId,
    details
  });
};

const logApiCall = (endpoint, method, user, response, error = null) => {
  if (error) {
    loggers.api.error(`API Error - ${method} ${endpoint} - User: ${user}`, {
      error: error.message,
      response
    });
  } else {
    loggers.api.info(`API Success - ${method} ${endpoint} - User: ${user}`, {
      response
    });
  }
};

const logUserAction = (action, user, details = '') => {
  loggers.user.info(`${action} - User: ${user}`, { details });
};

const logAdminAction = (action, admin, target = '', details = '') => {
  loggers.admin.info(`${action} - Admin: ${admin} - Target: ${target}`, { details });
};

const logSystemError = (error, context = '') => {
  loggers.system.error(`System Error - ${context}`, {
    error: error.message,
    stack: error.stack
  });
};

module.exports = {
  loggers,
  logBotActivity,
  logTransaction,
  logApiCall,
  logUserAction,
  logAdminAction,
  logSystemError
};