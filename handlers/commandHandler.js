// handlers/commandHandler.js
// Main command handler untuk fadzDor Bot

const config = require('../config/config');
const db = require('../utils/database');
const hesdaApi = require('../services/hesdaApi');
const { 
  logBotActivity, 
  logTransaction, 
  logUserAction,
  logAdminAction 
} = require('../utils/logger');

class CommandHandler {
  constructor() {
    this.userStates = new Map(); // Untuk tracking state conversation
  }

  async handleMessage(sock, msg, sender, messageText) {
    try {
      // Pastikan user terdaftar
      let user = await db.getUser(sender);
      if (!user) {
        user = await db.createUser(sender);
        logUserAction('USER_REGISTERED', sender);
      }

      const command = messageText.toLowerCase().trim();
      const isAdmin = config.bot.adminNumbers.includes(sender);
      
      logBotActivity('COMMAND_RECEIVED', sender, command);

      // Handle berdasarkan state user
      const userState = this.userStates.get(sender);
      if (userState) {
        return await this.handleStateBasedInput(sock, sender, messageText, userState);
      }

      // Handle command biasa
      if (command.startsWith(config.bot.prefix)) {
        const cmd = command.substring(1);
        return await this.handleCommand(sock, sender, cmd, isAdmin);
      }

      // Kalau bukan command, kasih menu
      return await this.sendMainMenu(sock, sender);

    } catch (error) {
      console.error('Error handling message:', error);
      await this.sendMessage(sock, sender, '❌ Terjadi kesalahan sistem. Silakan coba lagi.');
    }
  }

  async handleCommand(sock, sender, cmd, isAdmin) {
    switch (cmd) {
      case 'ping':
        return await this.sendMessage(sock, sender, '🏓 PONG!');
        
      case 'menu':
      case 'start':
        return await this.sendMainMenu(sock, sender);
        
      case 'saldo':
        return await this.checkUserBalance(sock, sender);
        
      case 'beli':
        return await this.showPackageMenu(sock, sender);
        
      case 'riwayat':
        return await this.showTransactionHistory(sock, sender);
        
      case 'cekpaket':
        return await this.checkUserPackage(sock, sender);

      // Admin commands
      case 'addsaldo':
        if (isAdmin) return await this.startAddSaldo(sock, sender);
        break;
        
      case 'delsaldo':
        if (isAdmin) return await this.startDeleteSaldo(sock, sender);
        break;
        
      case 'ceksaldosistem':
        if (isAdmin) return await this.checkSystemBalance(sock, sender);
        break;
        
      case 'admin':
        if (isAdmin) return await this.showAdminMenu(sock, sender);
        break;
        
      case 'stats':
        if (isAdmin) {
          const AdminCommands = require('./adminCommands');
          return await AdminCommands.getSystemStats(sock, sender);
        }
        break;
        
      case 'topuser':
        if (isAdmin) {
          const AdminCommands = require('./adminCommands');
          return await AdminCommands.getTopUsers(sock, sender);
        }
        break;
        
      case 'pending':
        if (isAdmin) {
          const AdminCommands = require('./adminCommands');
          return await AdminCommands.getPendingTransactions(sock, sender);
        }
        break;

      // Package management commands
      case 'listpaket':
        if (isAdmin) {
          const PackageManager = require('./packageManager');
          return await PackageManager.listAllPackages(sock, sender);
        }
        break;

      case 'addpaket':
        if (isAdmin) {
          const PackageManager = require('./packageManager');
          return await PackageManager.startAddPackage(sock, sender, this.userStates);
        }
        break;

      default:
        // Handle admin commands with parameters
        if (isAdmin) {
          const AdminCommands = require('./adminCommands');
          
          if (cmd.startsWith('cariuser ')) {
            const searchQuery = cmd.replace('cariuser ', '').trim();
            return await AdminCommands.searchUser(sock, sender, searchQuery);
          }
          
          if (cmd.startsWith('broadcast ')) {
            const message = cmd.replace('broadcast ', '').trim();
            return await AdminCommands.broadcastMessage(sock, sender, message);
          }
          
          if (cmd.startsWith('resetsaldo ')) {
            const targetNumber = cmd.replace('resetsaldo ', '').trim();
            return await AdminCommands.resetUserSaldo(sock, sender, targetNumber);
          }
          
          if (cmd.startsWith('cektrx ')) {
            const trxId = cmd.replace('cektrx ', '').trim();
            return await AdminCommands.checkTransactionStatus(sock, sender, trxId);
          }
          
          if (cmd.startsWith('delsaldo ')) {
            const targetNumber = cmd.replace('delsaldo ', '').trim();
            // Format nomor
            let formattedNumber = targetNumber.replace(/\D/g, '');
            if (formattedNumber.startsWith('0')) {
              formattedNumber = '62' + formattedNumber.substring(1);
            } else if (!formattedNumber.startsWith('62')) {
              formattedNumber = '62' + formattedNumber;
            }
            
            // Set state untuk proses delete saldo
            this.userStates.set(sender, {
              type: 'delete_saldo_target'
            });
            
            // Langsung proses target number
            return await this.processDeleteSaldoTarget(sock, sender, formattedNumber, { type: 'delete_saldo_target' });
          }

          // Package management commands with parameters
          if (cmd.startsWith('editpaket ')) {
            const packageCode = cmd.replace('editpaket ', '').trim();
            const PackageManager = require('./packageManager');
            return await PackageManager.startEditPackage(sock, sender, packageCode, this.userStates);
          }

          if (cmd.startsWith('delpaket ')) {
            const packageCode = cmd.replace('delpaket ', '').trim();
            const PackageManager = require('./packageManager');
            return await PackageManager.deletePackage(sock, sender, packageCode);
          }

          if (cmd.startsWith('togglepaket ')) {
            const packageCode = cmd.replace('togglepaket ', '').trim();
            const PackageManager = require('./packageManager');
            return await PackageManager.togglePackageStatus(sock, sender, packageCode);
          }
        }
        
        return await this.sendMainMenu(sock, sender);
    }
  }

  async handleStateBasedInput(sock, sender, input, state) {
    switch (state.type) {
      case 'select_package':
        return await this.processPackageSelection(sock, sender, input, state);
        
      case 'waiting_target_number':
        return await this.processTargetNumber(sock, sender, input, state);
        
      case 'need_otp_confirm':
        return await this.handleOtpConfirmation(sock, sender, input, state);
        
      case 'waiting_otp':
        return await this.processOtpVerification(sock, sender, input, state);
        
      case 'select_payment_method':
        return await this.processPaymentMethodSelection(sock, sender, input, state);
        
      case 'confirm_purchase':
        return await this.processConfirmPurchase(sock, sender, input, state);
        
      case 'check_package_number':
        return await this.processCheckPackageNumber(sock, sender, input, state);
        
      case 'add_saldo_target':
        return await this.processAddSaldoTarget(sock, sender, input, state);
        
      case 'add_saldo':
        return await this.processAddSaldo(sock, sender, input, state);
        
      case 'delete_saldo_target':
        return await this.processDeleteSaldoTarget(sock, sender, input, state);
        
      case 'delete_saldo':
        return await this.processDeleteSaldo(sock, sender, input, state);

      // Package management states
      case 'add_package':
        const PackageManager = require('./packageManager');
        return await PackageManager.processAddPackage(sock, sender, input, state, this.userStates);

      case 'edit_package':
        const PackageManagerEdit = require('./packageManager');
        return await PackageManagerEdit.processEditPackage(sock, sender, input, state, this.userStates);
        
      default:
        this.userStates.delete(sender);
        return await this.sendMainMenu(sock, sender);
    }
  }

  async sendMainMenu(sock, sender) {
    const user = await db.getUser(sender);
    const menu = `
🤖 *fadzDor Bot*
Selamat datang di layanan paket data otomatis!

💰 *Saldo Anda:* Rp. ${user.saldo.toLocaleString('id-ID')}

📋 *Menu Utama:*
${config.bot.prefix}menu - Tampilkan menu ini
${config.bot.prefix}saldo - Cek saldo Anda
${config.bot.prefix}beli - Beli paket data
${config.bot.prefix}cekpaket - Cek paket aktif
${config.bot.prefix}riwayat - Riwayat transaksi

💡 *Cara Top Up:*
Hubungi admin untuk mengisi saldo

🔥 *Paket Tersedia:*
• Paket Vidio Unlimited - Rp. 4.500
• Masa Aktif 1 Tahun - Rp. 10.000

📞 Admin: wa.me/${config.bot.ownerNumber}
    `;
    
    return await this.sendMessage(sock, sender, menu);
  }

  async checkUserBalance(sock, sender) {
    const user = await db.getUser(sender);
    const message = `
💰 *Saldo Anda*

Saldo saat ini: *Rp. ${user.saldo.toLocaleString('id-ID')}*
Total transaksi: ${user.totalTransaksi}
Terdaftar: ${new Date(user.registeredAt).toLocaleDateString('id-ID')}

Untuk top up saldo, hubungi admin:
wa.me/${config.bot.ownerNumber}
    `;
    
    logUserAction('CHECK_BALANCE', sender, `Saldo: ${user.saldo}`);
    return await this.sendMessage(sock, sender, message);
  }

  async showPackageMenu(sock, sender) {
    const user = await db.getUser(sender);
    
    // Get packages from database + config (merge)
    let packages = {};
    try {
      const dbPackages = await db.getPackages();
      packages = { ...config.packages, ...dbPackages };
    } catch (error) {
      packages = config.packages;
    }

    // Filter hanya paket yang aktif
    const activePackages = {};
    for (const [key, pkg] of Object.entries(packages)) {
      if (pkg.active !== false) {
        activePackages[key] = pkg;
      }
    }

    if (Object.keys(activePackages).length === 0) {
      return await this.sendMessage(sock, sender,
        `🛒 *Paket Data*\n\nMaaf, saat ini tidak ada paket yang tersedia.\n\nSilakan hubungi admin: wa.me/${config.bot.ownerNumber}`
      );
    }
    
    let menu = `
🛒 *Pilih Paket Data*

Saldo Anda: *Rp. ${user.saldo.toLocaleString('id-ID')}*

📦 *Paket Tersedia:*

`;

    let index = 1;
    for (const [key, pkg] of Object.entries(activePackages)) {
      menu += `*${index}. ${pkg.name}*\n`;
      menu += `💰 Harga: Rp. ${pkg.price.toLocaleString('id-ID')}\n`;
      menu += `📝 ${pkg.description}\n\n`;
      index++;
    }

    menu += `Ketik nomor paket (1-${index-1}) untuk membeli\nKetik ${config.bot.prefix}menu untuk kembali`;

    this.userStates.set(sender, { 
      type: 'select_package',
      packages: Object.keys(activePackages)
    });

    return await this.sendMessage(sock, sender, menu);
  }

  async processPackageSelection(sock, sender, selection, state) {
    const packageKeys = state.packages;
    const selectedIndex = parseInt(selection) - 1;
    
    if (selectedIndex < 0 || selectedIndex >= packageKeys.length) {
      return await this.sendMessage(sock, sender, '❌ Pilihan tidak valid. Silakan pilih nomor paket yang benar.');
    }

    const selectedPackageKey = packageKeys[selectedIndex];
    
    // Get merged packages (database + config)
    let packages = {};
    try {
      const dbPackages = await db.getPackages();
      packages = { ...config.packages, ...dbPackages };
    } catch (error) {
      packages = config.packages;
    }

    const selectedPackage = packages[selectedPackageKey];
    
    if (!selectedPackage) {
      this.userStates.delete(sender);
      return await this.sendMessage(sock, sender, '❌ Paket tidak ditemukan. Silakan coba lagi.');
    }

    // Cek apakah paket masih aktif
    if (selectedPackage.active === false) {
      this.userStates.delete(sender);
      return await this.sendMessage(sock, sender, '❌ Paket sedang tidak tersedia. Silakan pilih paket lain.');
    }

    const user = await db.getUser(sender);

    // Cek saldo mencukupi
    if (user.saldo < selectedPackage.price) {
      this.userStates.delete(sender);
      return await this.sendMessage(sock, sender, 
        `❌ *Saldo Tidak Mencukupi*\n\n` +
        `Harga paket: Rp. ${selectedPackage.price.toLocaleString('id-ID')}\n` +
        `Saldo Anda: Rp. ${user.saldo.toLocaleString('id-ID')}\n` +
        `Kekurangan: Rp. ${(selectedPackage.price - user.saldo).toLocaleString('id-ID')}\n\n` +
        `Silakan top up saldo terlebih dahulu.\n` +
        `Hubungi admin: wa.me/${config.bot.ownerNumber}`
      );
    }

    // Minta nomor target
    this.userStates.set(sender, {
      type: 'waiting_target_number',
      selectedPackage: selectedPackageKey,
      packageData: selectedPackage
    });

    return await this.sendMessage(sock, sender,
      `📦 *${selectedPackage.name}*\n` +
      `💰 Harga: Rp. ${selectedPackage.price.toLocaleString('id-ID')}\n\n` +
      `📞 *Masukkan nomor HP target:*\n` +
      `Contoh: 08123456789 atau 628123456789\n\n` +
      `Ketik *batal* untuk membatalkan`
    );
  }

  async processTargetNumber(sock, sender, input, state) {
    if (input.toLowerCase() === 'batal') {
      this.userStates.delete(sender);
      return await this.sendMainMenu(sock, sender);
    }

    // Validasi dan format nomor
    let targetNumber = input.replace(/\D/g, ''); // Hapus semua karakter non-digit
    
    if (targetNumber.startsWith('0')) {
      targetNumber = '62' + targetNumber.substring(1);
    } else if (!targetNumber.startsWith('62')) {
      targetNumber = '62' + targetNumber;
    }

    // Validasi nomor XL/Axis (harus dimulai dengan 62817, 62818, 62819, 62877, 62878)
    const validPrefixes = ['62817', '62818', '62819', '62877', '62878'];
    const isValidXL = validPrefixes.some(prefix => targetNumber.startsWith(prefix));

    if (!isValidXL || targetNumber.length < 11 || targetNumber.length > 13) {
      return await this.sendMessage(sock, sender,
        `❌ *Nomor tidak valid!*\n\n` +
        `Pastikan nomor adalah XL/Axis yang valid\n` +
        `Contoh: 08123456789, 08176543210\n\n` +
        `Silakan masukkan nomor yang benar:`
      );
    }

    // Cek session login dulu
    logUserAction('CHECKING_SESSION', sender, `Target: ${targetNumber}`);
    const sessionResult = await hesdaApi.getAccessToken(targetNumber);
    
    if (sessionResult.success) {
      // Ada session aktif, cek apakah perlu pilih payment method
      const paymentMethods = state.packageData.payment_method || [];
      
      if (paymentMethods.length > 1) {
        // Multiple payment methods, minta user pilih
        this.userStates.set(sender, {
          type: 'select_payment_method',
          targetNumber: targetNumber,
          selectedPackage: state.selectedPackage,
          packageData: state.packageData,
          accessToken: sessionResult.accessToken
        });

        let paymentMenu = `💳 *Pilih Metode Pembayaran*\n\n`;
        paymentMenu += `📦 Paket: ${state.packageData.name}\n`;
        paymentMenu += `📞 Target: ${targetNumber}\n`;
        paymentMenu += `💰 Harga: Rp. ${state.packageData.price.toLocaleString('id-ID')}\n\n`;
        paymentMenu += `**Metode Pembayaran:**\n`;
        
        paymentMethods.forEach((method, index) => {
          paymentMenu += `${index + 1}. ${method}\n`;
        });
        
        paymentMenu += `\nKetik nomor pilihan (1-${paymentMethods.length})\nKetik *batal* untuk membatalkan`;
        
        return await this.sendMessage(sock, sender, paymentMenu);
      } else {
        // Single payment method, langsung konfirmasi
        this.userStates.set(sender, {
          type: 'confirm_purchase',
          targetNumber: targetNumber,
          selectedPackage: state.selectedPackage,
          packageData: state.packageData,
          accessToken: sessionResult.accessToken,
          paymentMethod: paymentMethods[0] || null
        });

        return await this.sendPurchaseConfirmation(sock, sender, targetNumber, state.packageData);
      }
    } else if (sessionResult.needOtp) {
      // Perlu OTP
      this.userStates.set(sender, {
        type: 'need_otp_confirm',
        targetNumber: targetNumber,
        selectedPackage: state.selectedPackage,
        packageData: state.packageData
      });

      return await this.sendMessage(sock, sender,
        `🔐 *Verifikasi Diperlukan*\n\n` +
        `Nomor: ${targetNumber}\n` +
        `Paket: ${state.packageData.name}\n` +
        `Harga: Rp. ${state.packageData.price.toLocaleString('id-ID')}\n\n` +
        `Untuk melanjutkan, kami perlu mengirim kode OTP ke nomor tersebut.\n\n` +
        `Ketik *ya* untuk mengirim OTP\n` +
        `Ketik *batal* untuk membatalkan`
      );
    } else {
      this.userStates.delete(sender);
      return await this.sendMessage(sock, sender, 
        `❌ *Gagal memproses nomor*\n\n${sessionResult.message}\n\nSilakan coba lagi nanti.`
      );
    }
  }

  async sendPurchaseConfirmation(sock, sender, targetNumber, packageData, paymentMethod = null) {
    const user = await db.getUser(sender);
    const saldoSetelah = user.saldo - packageData.price;

    let confirmation = `
🛒 *Konfirmasi Pembelian*

📞 Nomor target: ${targetNumber}
📦 Paket: ${packageData.name}
💰 Harga: Rp. ${packageData.price.toLocaleString('id-ID')}`;

    if (paymentMethod) {
      confirmation += `\n💳 Metode: ${paymentMethod}`;
    }

    confirmation += `

💳 Saldo saat ini: Rp. ${user.saldo.toLocaleString('id-ID')}
💳 Saldo setelah: Rp. ${saldoSetelah.toLocaleString('id-ID')}

⚠️ *Pastikan nomor sudah benar!*
Transaksi tidak dapat dibatalkan setelah diproses.

Ketik *ya* untuk melanjutkan
Ketik *batal* untuk membatalkan
    `;

    return await this.sendMessage(sock, sender, confirmation);
  }

  async handleOtpConfirmation(sock, sender, input, state) {
    if (input.toLowerCase() === 'batal') {
      this.userStates.delete(sender);
      return await this.sendMessage(sock, sender, '❌ Pembelian dibatalkan.');
    }

    if (input.toLowerCase() !== 'ya') {
      return await this.sendMessage(sock, sender, 
        'Ketik *ya* untuk mengirim OTP atau *batal* untuk membatalkan.'
      );
    }

    // Kirim OTP
    await this.sendMessage(sock, sender, '📱 Mengirim kode OTP...');
    
    const otpResult = await hesdaApi.getOtp(state.targetNumber);
    
    if (otpResult.success) {
      this.userStates.set(sender, {
        type: 'waiting_otp',
        targetNumber: state.targetNumber,
        selectedPackage: state.selectedPackage,
        packageData: state.packageData,
        authId: otpResult.authId,
        canResendIn: otpResult.canResendIn
      });

      logUserAction('OTP_SENT', sender, `Target: ${state.targetNumber}`);

      return await this.sendMessage(sock, sender,
        `📱 *Kode OTP Terkirim*\n\n` +
        `${otpResult.message}\n\n` +
        `Silakan masukkan kode OTP yang diterima di nomor ${state.targetNumber}\n\n` +
        `Ketik *batal* untuk membatalkan`
      );
    } else {
      this.userStates.delete(sender);
      return await this.sendMessage(sock, sender, 
        `❌ *Gagal mengirim OTP*\n\n${otpResult.message}`
      );
    }
  }

  async processPaymentMethodSelection(sock, sender, input, state) {
    if (input.toLowerCase() === 'batal') {
      this.userStates.delete(sender);
      return await this.sendMessage(sock, sender, '❌ Pembelian dibatalkan.');
    }

    const { targetNumber, packageData, accessToken } = state;
    const paymentMethods = packageData.payment_method || [];
    const selectedIndex = parseInt(input) - 1;

    if (selectedIndex < 0 || selectedIndex >= paymentMethods.length) {
      return await this.sendMessage(sock, sender, 
        `❌ Pilihan tidak valid. Ketik nomor 1-${paymentMethods.length}.`
      );
    }

    const selectedPaymentMethod = paymentMethods[selectedIndex];

    // Lanjut ke konfirmasi pembelian
    this.userStates.set(sender, {
      type: 'confirm_purchase',
      targetNumber: targetNumber,
      selectedPackage: state.selectedPackage,
      packageData: packageData,
      accessToken: accessToken,
      paymentMethod: selectedPaymentMethod
    });

    return await this.sendPurchaseConfirmation(sock, sender, targetNumber, packageData, selectedPaymentMethod);
  }

  async processOtpVerification(sock, sender, input, state) {
    if (input.toLowerCase() === 'batal') {
      this.userStates.delete(sender);
      return await this.sendMessage(sock, sender, '❌ Pembelian dibatalkan.');
    }

    const otpCode = input.replace(/\D/g, ''); // Hapus non-digit
    
    if (otpCode.length < 4 || otpCode.length > 8) {
      return await this.sendMessage(sock, sender, 
        'Kode OTP tidak valid. Silakan masukkan kode yang benar (4-8 digit).'
      );
    }

    await this.sendMessage(sock, sender, '🔐 Memverifikasi kode OTP...');

    const loginResult = await hesdaApi.loginSms(state.targetNumber, state.authId, otpCode);
    
    if (loginResult.success) {
      // OTP berhasil, cek apakah perlu pilih payment method
      const paymentMethods = state.packageData.payment_method || [];
      
      if (paymentMethods.length > 1) {
        // Multiple payment methods, minta user pilih
        this.userStates.set(sender, {
          type: 'select_payment_method',
          targetNumber: state.targetNumber,
          selectedPackage: state.selectedPackage,
          packageData: state.packageData,
          accessToken: loginResult.accessToken
        });

        logUserAction('OTP_VERIFIED', sender, `Target: ${state.targetNumber}`);
        
        let paymentMenu = `✅ Verifikasi berhasil!\n\n`;
        paymentMenu += `💳 *Pilih Metode Pembayaran*\n\n`;
        paymentMenu += `📦 Paket: ${state.packageData.name}\n`;
        paymentMenu += `📞 Target: ${state.targetNumber}\n`;
        paymentMenu += `💰 Harga: Rp. ${state.packageData.price.toLocaleString('id-ID')}\n\n`;
        paymentMenu += `**Metode Pembayaran:**\n`;
        
        paymentMethods.forEach((method, index) => {
          paymentMenu += `${index + 1}. ${method}\n`;
        });
        
        paymentMenu += `\nKetik nomor pilihan (1-${paymentMethods.length})\nKetik *batal* untuk membatalkan`;
        
        return await this.sendMessage(sock, sender, paymentMenu);
      } else {
        // Single payment method, lanjut ke konfirmasi pembelian
        this.userStates.set(sender, {
          type: 'confirm_purchase',
          targetNumber: state.targetNumber,
          selectedPackage: state.selectedPackage,
          packageData: state.packageData,
          accessToken: loginResult.accessToken,
          paymentMethod: paymentMethods[0] || null
        });

        logUserAction('OTP_VERIFIED', sender, `Target: ${state.targetNumber}`);
        
        await this.sendMessage(sock, sender, '✅ Verifikasi berhasil!');
        return await this.sendPurchaseConfirmation(sock, sender, state.targetNumber, state.packageData, paymentMethods[0]);
      }
    } else {
      return await this.sendMessage(sock, sender,
        `❌ *Verifikasi gagal*\n\n${loginResult.message}\n\nSilakan coba masukkan kode OTP lagi.`
      );
    }
  }

  async processConfirmPurchase(sock, sender, input, state) {
    if (input.toLowerCase() === 'batal') {
      this.userStates.delete(sender);
      logUserAction('PURCHASE_CANCELLED', sender, `Package: ${state.packageData.name}`);
      return await this.sendMessage(sock, sender, '❌ Pembelian dibatalkan.');
    }

    if (input.toLowerCase() !== 'ya') {
      return await this.sendMessage(sock, sender, 
        'Ketik *ya* untuk melanjutkan atau *batal* untuk membatalkan.'
      );
    }

    // Proses pembelian
    this.userStates.delete(sender);
    return await this.processPurchase(sock, sender, state);
  }

  async processPurchase(sock, sender, state) {
    const { targetNumber, packageData, accessToken, paymentMethod } = state;
    const user = await db.getUser(sender);

    // Cek saldo sekali lagi (double check)
    if (user.saldo < packageData.price) {
      return await this.sendMessage(sock, sender, '❌ Saldo tidak mencukupi!');
    }

    await this.sendMessage(sock, sender, '⏳ Memproses pembelian paket...');

    try {
      // Potong saldo dulu
      await db.updateUserSaldo(sender, packageData.price, 'subtract');
      
      // Simpan transaksi sebagai PROCESSING
      const transaction = await db.saveTransaction({
        phoneNumber: sender,
        targetNumber: targetNumber,
        packageName: packageData.name,
        packageId: packageData.package_id,
        amount: packageData.price,
        cost: packageData.cost,
        status: 'PROCESSING',
        accessToken: accessToken,
        paymentMethod: paymentMethod
      });

      logTransaction('PURCHASE_STARTED', sender, packageData.price, 'PROCESSING', transaction.trxId);

      // Beli paket via API dengan payment method
      const buyResult = await hesdaApi.buyPackage(targetNumber, packageData.package_id, accessToken, paymentMethod);

      if (buyResult.success) {
        // Update status transaksi
        await db.updateTransactionStatus(transaction.trxId, 'SUCCESS', {
          hesdaTrxId: buyResult.data.trx_id,
          paymentMethod: buyResult.data.deeplink_data?.payment_method || paymentMethod || 'UNKNOWN',
          packageName: buyResult.data.nama_paket
        });

        // Update total transaksi user
        const updatedUser = await db.getUser(sender);
        updatedUser.totalTransaksi = (updatedUser.totalTransaksi || 0) + 1;
        const users = await db.getAllUsers();
        users[sender] = updatedUser;
        await db.writeFile('./data/users.json', users);

        logTransaction('PURCHASE_SUCCESS', sender, packageData.price, 'SUCCESS', transaction.trxId);

        let successMessage = `✅ *Pembelian Berhasil!*\n\n` +
          `📞 Nomor: ${targetNumber}\n` +
          `📦 Paket: ${buyResult.data.nama_paket}\n` +
          `💰 Harga: Rp. ${packageData.price.toLocaleString('id-ID')}\n` +
          `🆔 ID Transaksi: ${transaction.trxId}\n`;

        if (paymentMethod) {
          successMessage += `💳 Metode: ${paymentMethod}\n`;
        }

        successMessage += `\n${buyResult.message}\n\n` +
          `💳 Sisa saldo: Rp. ${(user.saldo - packageData.price).toLocaleString('id-ID')}`;

        return await this.sendMessage(sock, sender, successMessage);
      } else {
        // Gagal, kembalikan saldo
        await db.updateUserSaldo(sender, packageData.price, 'add');
        await db.updateTransactionStatus(transaction.trxId, 'FAILED', {
          errorMessage: buyResult.message
        });

        logTransaction('PURCHASE_FAILED', sender, packageData.price, 'FAILED', transaction.trxId);

        return await this.sendMessage(sock, sender,
          `❌ *Pembelian Gagal!*\n\n` +
          `${buyResult.message}\n\n` +
          `💳 Saldo sudah dikembalikan.\n` +
          `Silakan coba lagi atau hubungi admin.`
        );
      }
    } catch (error) {
      // Kembalikan saldo jika ada error
      await db.updateUserSaldo(sender, packageData.price, 'add');
      logTransaction('PURCHASE_ERROR', sender, packageData.price, 'ERROR', '', error.message);
      
      return await this.sendMessage(sock, sender,
        `❌ *Terjadi kesalahan sistem!*\n\n` +
        `Saldo sudah dikembalikan.\n` +
        `Silakan coba lagi atau hubungi admin.`
      );
    }
  }

  async checkUserPackage(sock, sender) {
    this.userStates.set(sender, {
      type: 'check_package_number'
    });

    return await this.sendMessage(sock, sender,
      `📱 *Cek Paket Aktif*\n\n` +
      `Masukkan nomor HP yang ingin dicek paketnya:\n` +
      `Contoh: 08123456789\n\n` +
      `Ketik *batal* untuk membatalkan`
    );
  }

  async processCheckPackageNumber(sock, sender, input, state) {
    if (input.toLowerCase() === 'batal') {
      this.userStates.delete(sender);
      return await this.sendMainMenu(sock, sender);
    }

    // Format nomor
    let targetNumber = input.replace(/\D/g, '');
    if (targetNumber.startsWith('0')) {
      targetNumber = '62' + targetNumber.substring(1);
    } else if (!targetNumber.startsWith('62')) {
      targetNumber = '62' + targetNumber;
    }

    // Validasi nomor XL/Axis
    const validPrefixes = ['62817', '62818', '62819', '62877', '62878'];
    const isValidXL = validPrefixes.some(prefix => targetNumber.startsWith(prefix));

    if (!isValidXL || targetNumber.length < 11 || targetNumber.length > 13) {
      return await this.sendMessage(sock, sender,
        `❌ *Nomor tidak valid!*\n\nPastikan nomor adalah XL/Axis yang valid\nContoh: 08123456789\n\nSilakan masukkan nomor yang benar:`
      );
    }

    this.userStates.delete(sender);
    await this.sendMessage(sock, sender, '🔍 Mengecek paket aktif...');

    // Cek session atau minta OTP untuk cek paket
    const sessionResult = await hesdaApi.getAccessToken(targetNumber);
    
    if (sessionResult.success) {
      const packageResult = await hesdaApi.checkPackageDetail(targetNumber, sessionResult.accessToken);
      
      if (packageResult.success) {
        const data = packageResult.data;
        let message = `📱 *Detail Paket Aktif*\n\n`;
        message += `📞 Nomor: ${data.msisdn}\n\n`;
        
        if (data.quotas && data.quotas.length > 0) {
          data.quotas.forEach((quota, index) => {
            message += `📦 *${quota.name}*\n`;
            message += `⏰ Expired: ${quota.expired_at}\n`;
            
            if (quota.benefits && quota.benefits.length > 0) {
              quota.benefits.forEach(benefit => {
                message += `• ${benefit.name}: ${benefit.remaining_quota}/${benefit.quota}\n`;
              });
            }
            message += '\n';
          });
        } else {
          message += '📭 Tidak ada paket aktif yang ditemukan.';
        }

        return await this.sendMessage(sock, sender, message);
      } else {
        return await this.sendMessage(sock, sender, 
          `❌ *Gagal mengecek paket*\n\n${packageResult.message}`
        );
      }
    } else {
      return await this.sendMessage(sock, sender,
        `❌ *Tidak dapat mengecek paket*\n\n${sessionResult.message}\n\nUntuk mengecek paket, nomor harus sudah pernah melakukan verifikasi OTP di sistem.`
      );
    }
  }

  async checkSystemBalance(sock, sender) {
    await this.sendMessage(sock, sender, '⏳ Mengecek saldo sistem...');
    
    const balanceResult = await hesdaApi.checkBalance(sender);
    
    if (balanceResult.success) {
      return await this.sendMessage(sock, sender,
        `💰 *Saldo Sistem*\n\n` +
        `Saldo tersedia: Rp. ${balanceResult.saldo.toLocaleString('id-ID')}\n\n` +
        `✅ Sistem siap melayani transaksi`
      );
    } else {
      return await this.sendMessage(sock, sender,
        `❌ *Gagal mengecek saldo sistem*\n\n${balanceResult.message}`
      );
    }
  }

  async showTransactionHistory(sock, sender) {
    const transactions = await db.getUserTransactions(sender, 10);
    
    if (transactions.length === 0) {
      return await this.sendMessage(sock, sender,
        `📋 *Riwayat Transaksi*\n\nBelum ada transaksi.`
      );
    }

    let message = `📋 *Riwayat Transaksi*\n\n`;
    
    transactions.forEach((tx, index) => {
      const date = new Date(tx.createdAt).toLocaleDateString('id-ID');
      const status = tx.status === 'SUCCESS' ? '✅' : tx.status === 'FAILED' ? '❌' : '⏳';
      
      message += `${index + 1}. ${status} ${tx.packageName}\n`;
      message += `   📞 ${tx.targetNumber}\n`;
      message += `   💰 Rp. ${tx.amount.toLocaleString('id-ID')}\n`;
      message += `   📅 ${date}\n\n`;
    });

    return await this.sendMessage(sock, sender, message);
  }

  // Admin Commands
  async startAddSaldo(sock, sender) {
    this.userStates.set(sender, {
      type: 'add_saldo_target'
    });

    return await this.sendMessage(sock, sender,
      `👨‍💼 *Admin - Tambah Saldo*\n\n` +
      `Masukkan nomor HP target:\n` +
      `Contoh: 628123456789\n\n` +
      `Ketik *batal* untuk membatalkan`
    );
  }

  async startDeleteSaldo(sock, sender) {
    this.userStates.set(sender, {
      type: 'delete_saldo_target'
    });

    return await this.sendMessage(sock, sender,
      `👨‍💼 *Admin - Kurangi/Hapus Saldo*\n\n` +
      `Masukkan nomor HP target:\n` +
      `Contoh: 628123456789\n\n` +
      `Ketik *batal* untuk membatalkan`
    );
  }

  async processAddSaldoTarget(sock, sender, input, state) {
    if (input.toLowerCase() === 'batal') {
      this.userStates.delete(sender);
      return await this.sendMessage(sock, sender, '❌ Operasi dibatalkan.');
    }

    // Validasi nomor target
    let targetNumber = input.replace(/\D/g, '');
    if (targetNumber.startsWith('0')) {
      targetNumber = '62' + targetNumber.substring(1);
    } else if (!targetNumber.startsWith('62')) {
      targetNumber = '62' + targetNumber;
    }

    this.userStates.set(sender, {
      type: 'add_saldo',
      targetNumber: targetNumber,
      step: 'amount'
    });

    return await this.sendMessage(sock, sender,
      `👨‍💼 *Admin - Tambah Saldo*\n\n` +
      `Target: ${targetNumber}\n\n` +
      `Masukkan jumlah saldo yang akan ditambahkan:\n` +
      `Contoh: 50000\n\n` +
      `Ketik *batal* untuk membatalkan`
    );
  }

  async processDeleteSaldoTarget(sock, sender, input, state) {
    if (input.toLowerCase() === 'batal') {
      this.userStates.delete(sender);
      return await this.sendMessage(sock, sender, '❌ Operasi dibatalkan.');
    }

    // Validasi nomor target
    let targetNumber = input.replace(/\D/g, '');
    if (targetNumber.startsWith('0')) {
      targetNumber = '62' + targetNumber.substring(1);
    } else if (!targetNumber.startsWith('62')) {
      targetNumber = '62' + targetNumber;
    }

    // Cek apakah user ada
    const user = await db.getUser(targetNumber);
    if (!user) {
      return await this.sendMessage(sock, sender,
        `❌ *User tidak ditemukan*\n\nNomor: ${targetNumber}\n\nSilakan masukkan nomor yang terdaftar:`
      );
    }

    this.userStates.set(sender, {
      type: 'delete_saldo',
      targetNumber: targetNumber,
      currentSaldo: user.saldo,
      step: 'amount'
    });

    return await this.sendMessage(sock, sender,
      `👨‍💼 *Admin - Kurangi/Hapus Saldo*\n\n` +
      `Target: ${targetNumber}\n` +
      `Saldo saat ini: Rp. ${user.saldo.toLocaleString('id-ID')}\n\n` +
      `Pilihan:\n` +
      `• Ketik *hapus* untuk menghapus semua saldo (set ke 0)\n` +
      `• Ketik angka untuk mengurangi saldo (contoh: 10000)\n` +
      `• Ketik *batal* untuk membatalkan`
    );
  }

  async processAddSaldo(sock, sender, input, state) {
    if (input.toLowerCase() === 'batal') {
      this.userStates.delete(sender);
      return await this.sendMessage(sock, sender, '❌ Operasi dibatalkan.');
    }

    if (state.step === undefined) {
      // Step 1: Validasi nomor target
      let targetNumber = input.replace(/\D/g, '');
      if (targetNumber.startsWith('0')) {
        targetNumber = '62' + targetNumber.substring(1);
      } else if (!targetNumber.startsWith('62')) {
        targetNumber = '62' + targetNumber;
      }

      this.userStates.set(sender, {
        type: 'add_saldo',
        targetNumber: targetNumber,
        step: 'amount'
      });

      return await this.sendMessage(sock, sender,
        `👨‍💼 *Admin - Tambah Saldo*\n\n` +
        `Target: ${targetNumber}\n\n` +
        `Masukkan jumlah saldo yang akan ditambahkan:\n` +
        `Contoh: 50000\n\n` +
        `Ketik *batal* untuk membatalkan`
      );
    } else if (state.step === 'amount') {
      // Step 2: Validasi amount
      const amount = parseInt(input.replace(/\D/g, ''));
      
      if (isNaN(amount) || amount <= 0) {
        return await this.sendMessage(sock, sender, 
          'Jumlah tidak valid. Masukkan angka yang benar (contoh: 50000).'
        );
      }

      this.userStates.set(sender, {
        type: 'add_saldo',
        targetNumber: state.targetNumber,
        amount: amount,
        step: 'confirm'
      });

      return await this.sendMessage(sock, sender,
        `👨‍💼 *Konfirmasi Tambah Saldo*\n\n` +
        `Target: ${state.targetNumber}\n` +
        `Jumlah: Rp. ${amount.toLocaleString('id-ID')}\n\n` +
        `Ketik *ya* untuk konfirmasi\n` +
        `Ketik *batal* untuk membatalkan`
      );
    } else if (state.step === 'confirm') {
      // Step 3: Konfirmasi
      if (input.toLowerCase() !== 'ya') {
        return await this.sendMessage(sock, sender, 
          'Ketik *ya* untuk konfirmasi atau *batal* untuk membatalkan.'
        );
      }

      // Proses tambah saldo
      await db.updateUserSaldo(state.targetNumber, state.amount, 'add');
      this.userStates.delete(sender);

      logAdminAction('ADD_SALDO', sender, state.targetNumber, `Amount: ${state.amount}`);

      // Notifikasi ke target
      await this.sendMessage(sock, state.targetNumber,
        `💰 *Saldo Ditambahkan*\n\n` +
        `Saldo Anda telah ditambahkan sebesar:\n` +
        `Rp. ${state.amount.toLocaleString('id-ID')}\n\n` +
        `Ketik ${config.bot.prefix}saldo untuk cek saldo terbaru.`
      );

      return await this.sendMessage(sock, sender,
        `✅ *Saldo berhasil ditambahkan*\n\n` +
        `Target: ${state.targetNumber}\n` +
        `Jumlah: Rp. ${state.amount.toLocaleString('id-ID')}\n\n` +
        `Notifikasi telah dikirim ke target.`
      );
    }
  }

  async processDeleteSaldo(sock, sender, input, state) {
    if (input.toLowerCase() === 'batal') {
      this.userStates.delete(sender);
      return await this.sendMessage(sock, sender, '❌ Operasi dibatalkan.');
    }

    if (state.step === 'amount') {
      const { targetNumber, currentSaldo } = state;
      let newSaldo = currentSaldo;
      let operation = '';
      let amountChanged = 0;

      if (input.toLowerCase() === 'hapus') {
        newSaldo = 0;
        operation = 'Hapus semua saldo';
        amountChanged = currentSaldo;
      } else {
        const amount = parseInt(input.replace(/\D/g, ''));
        
        if (isNaN(amount) || amount <= 0) {
          return await this.sendMessage(sock, sender, 
            'Jumlah tidak valid. Ketik *hapus* untuk hapus semua atau masukkan angka (contoh: 10000).'
          );
        }

        if (amount > currentSaldo) {
          return await this.sendMessage(sock, sender,
            `❌ *Jumlah terlalu besar*\n\nSaldo saat ini: Rp. ${currentSaldo.toLocaleString('id-ID')}\nJumlah yang akan dikurangi: Rp. ${amount.toLocaleString('id-ID')}\n\nSilakan masukkan jumlah yang lebih kecil atau ketik *hapus* untuk menghapus semua saldo.`
          );
        }

        newSaldo = currentSaldo - amount;
        operation = `Kurangi saldo sebesar Rp. ${amount.toLocaleString('id-ID')}`;
        amountChanged = amount;
      }

      this.userStates.set(sender, {
        type: 'delete_saldo',
        targetNumber: targetNumber,
        currentSaldo: currentSaldo,
        newSaldo: newSaldo,
        operation: operation,
        amountChanged: amountChanged,
        step: 'confirm'
      });

      return await this.sendMessage(sock, sender,
        `👨‍💼 *Konfirmasi Pengurangan Saldo*\n\n` +
        `Target: ${targetNumber}\n` +
        `Operasi: ${operation}\n` +
        `Saldo saat ini: Rp. ${currentSaldo.toLocaleString('id-ID')}\n` +
        `Saldo setelah: Rp. ${newSaldo.toLocaleString('id-ID')}\n\n` +
        `⚠️ *Tindakan ini tidak dapat dibatalkan!*\n\n` +
        `Ketik *ya* untuk konfirmasi\n` +
        `Ketik *batal* untuk membatalkan`
      );
    } else if (state.step === 'confirm') {
      // Konfirmasi penghapusan saldo
      if (input.toLowerCase() !== 'ya') {
        return await this.sendMessage(sock, sender, 
          'Ketik *ya* untuk konfirmasi atau *batal* untuk membatalkan.'
        );
      }

      // Proses update saldo
      await db.updateUserSaldo(state.targetNumber, state.newSaldo, 'set');
      this.userStates.delete(sender);

      logAdminAction('DELETE_SALDO', sender, state.targetNumber, 
        `Old: ${state.currentSaldo}, New: ${state.newSaldo}, Changed: ${state.amountChanged}`);

      // Notifikasi ke target
      await this.sendMessage(sock, state.targetNumber,
        `⚠️ *Saldo Dikurangi*\n\n` +
        `Saldo Anda telah dikurangi oleh admin.\n` +
        `${state.operation}\n\n` +
        `Saldo sekarang: Rp. ${state.newSaldo.toLocaleString('id-ID')}\n\n` +
        `Jika ada pertanyaan, hubungi admin: wa.me/${config.bot.ownerNumber}`
      );

      return await this.sendMessage(sock, sender,
        `✅ *Saldo berhasil dikurangi*\n\n` +
        `Target: ${state.targetNumber}\n` +
        `${state.operation}\n` +
        `Saldo sebelum: Rp. ${state.currentSaldo.toLocaleString('id-ID')}\n` +
        `Saldo sekarang: Rp. ${state.newSaldo.toLocaleString('id-ID')}\n\n` +
        `Notifikasi telah dikirim ke target.`
      );
    }
  }

  async showAdminMenu(sock, sender) {
    const message = `
👨‍💼 *Menu Admin fadzDor*

📊 *Monitoring:*
${config.bot.prefix}stats - Statistik sistem
${config.bot.prefix}pending - Transaksi pending
${config.bot.prefix}topuser - Top user (saldo)
${config.bot.prefix}ceksaldosistem - Saldo sistem Hesda

💰 *Manajemen User:*
${config.bot.prefix}addsaldo - Tambah saldo user
${config.bot.prefix}delsaldo - Kurangi/hapus saldo user
${config.bot.prefix}cariuser [nomor] - Cari user
${config.bot.prefix}resetsaldo [nomor] - Reset saldo user ke 0

📦 *Manajemen Paket:*
${config.bot.prefix}listpaket - Lihat semua paket
${config.bot.prefix}addpaket - Tambah paket baru
${config.bot.prefix}editpaket [code] - Edit paket
${config.bot.prefix}delpaket [code] - Hapus paket
${config.bot.prefix}togglepaket [code] - Aktif/nonaktif paket

📢 *Broadcast:*
${config.bot.prefix}broadcast [pesan] - Kirim ke semua user

🔧 *Sistem:*
${config.bot.prefix}cektrx [id] - Cek status transaksi
${config.bot.prefix}admin - Menu ini

*Format command:*
${config.bot.prefix}cariuser 08123456789
${config.bot.prefix}broadcast Maintenance server jam 02:00
${config.bot.prefix}editpaket vidio_dana
${config.bot.prefix}delpaket masa_aktif
    `;
    
    return await this.sendMessage(sock, sender, message);
  }

  async sendMessage(sock, recipient, message) {
    try {
      await sock.sendMessage(recipient, { text: message });
      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    }
  }
}

module.exports = new CommandHandler();