// services/hesdaApi.js
const axios = require('axios');
const FormData = require('form-data');
const config = require('../config/config');
const { logApiCall } = require('../utils/logger');
const db = require('../utils/database');

class HesdaApiService {
  constructor() {
    this.baseUrl = config.api.baseUrl;
    this.hesdaKey = config.api.hesdaKey;
    this.auth = {
      username: config.api.hesdaUsername,
      password: config.api.hesdaPassword
    };
  }

  // Helper untuk membuat auth header
  getAuthHeaders() {
    return {
      'Authorization': `Basic ${Buffer.from(`${this.auth.username}:${this.auth.password}`).toString('base64')}`
    };
  }

  // Cek saldo Hesda
  async checkBalance(userPhone) {
    try {
      const response = await axios.get(`${this.baseUrl}/saldo`, {
        params: { hesdastore: this.hesdaKey },
        headers: this.getAuthHeaders()
      });

      logApiCall('/saldo', 'GET', userPhone, response.data);
      return {
        success: true,
        saldo: response.data.data.saldo
      };
    } catch (error) {
      logApiCall('/saldo', 'GET', userPhone, null, error);
      return {
        success: false,
        message: 'Gagal mengecek saldo sistem'
      };
    }
  }

  // Cek detail paket/kuota
  async checkPackageDetail(phoneNumber, accessToken) {
    try {
      const response = await axios.get(`${this.baseUrl}/detail_paket`, {
        params: {
          hesdastore: this.hesdaKey,
          access_token: accessToken
        },
        headers: this.getAuthHeaders()
      });

      logApiCall('/detail_paket', 'GET', phoneNumber, response.data);
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      logApiCall('/detail_paket', 'GET', phoneNumber, null, error);
      return {
        success: false,
        message: 'Gagal mengecek detail paket'
      };
    }
  }

  // Get OTP
  async getOtp(phoneNumber) {
    try {
      const formData = new FormData();
      formData.append('hesdastore', this.hesdaKey);
      formData.append('no_hp', phoneNumber);
      formData.append('metode', 'OTP');

      const response = await axios.post(`${this.baseUrl}/get_otp`, formData, {
        headers: {
          ...formData.getHeaders(),
          ...this.getAuthHeaders()
        }
      });

      logApiCall('/get_otp', 'POST', phoneNumber, response.data);
      
      if (response.data.status) {
        return {
          success: true,
          authId: response.data.data.auth_id,
          canResendIn: response.data.data.can_resend_in,
          message: response.data.message
        };
      } else {
        return {
          success: false,
          message: response.data.message
        };
      }
    } catch (error) {
      logApiCall('/get_otp', 'POST', phoneNumber, null, error);
      return {
        success: false,
        message: 'Gagal mengirim OTP'
      };
    }
  }

  // Login dengan OTP
  async loginSms(phoneNumber, authId, otpCode) {
    try {
      const formData = new FormData();
      formData.append('hesdastore', this.hesdaKey);
      formData.append('no_hp', phoneNumber);
      formData.append('metode', 'OTP');
      formData.append('auth_id', authId);
      formData.append('kode_otp', otpCode);

      const response = await axios.post(`${this.baseUrl}/login_sms`, formData, {
        headers: {
          ...formData.getHeaders(),
          ...this.getAuthHeaders()
        }
      });

      logApiCall('/login_sms', 'POST', phoneNumber, response.data);
      
      if (response.data.status) {
        // Simpan session ke database
        await db.saveSession(phoneNumber, response.data.data.access_token, authId);
        return {
          success: true,
          accessToken: response.data.data.access_token,
          message: response.data.message
        };
      } else {
        return {
          success: false,
          message: response.data.message
        };
      }
    } catch (error) {
      logApiCall('/login_sms', 'POST', phoneNumber, null, error);
      return {
        success: false,
        message: 'Gagal login dengan OTP'
      };
    }
  }

  // Cek sesi login
  async checkLoginSession(phoneNumber) {
    try {
      const response = await axios.get(`${this.baseUrl}/cek_sesi_login`, {
        params: {
          hesdastore: this.hesdaKey,
          no_hp: phoneNumber
        },
        headers: this.getAuthHeaders()
      });

      logApiCall('/cek_sesi_login', 'GET', phoneNumber, response.data);
      
      if (response.data.status) {
        // Update session di database
        await db.saveSession(phoneNumber, response.data.data.access_token);
        return {
          success: true,
          accessToken: response.data.data.access_token,
          message: response.data.message
        };
      } else {
        return {
          success: false,
          message: response.data.message
        };
      }
    } catch (error) {
      logApiCall('/cek_sesi_login', 'GET', phoneNumber, null, error);
      return {
        success: false,
        message: 'Tidak ada sesi login aktif'
      };
    }
  }

  // Beli paket OTP
  async buyPackage(phoneNumber, packageId, accessToken) {
    try {
      const formData = new FormData();
      formData.append('hesdastore', this.hesdaKey);
      formData.append('package_id', packageId);
      formData.append('access_token', accessToken);
      formData.append('uri', 'package_purchase_otp');
      formData.append('no_hp', phoneNumber);

      const response = await axios.post(`${this.baseUrl}/beli/otp`, formData, {
        headers: {
          ...formData.getHeaders(),
          ...this.getAuthHeaders()
        }
      });

      logApiCall('/beli/otp', 'POST', phoneNumber, response.data);
      
      if (response.data.status) {
        return {
          success: true,
          data: response.data.data,
          message: response.data.message
        };
      } else {
        return {
          success: false,
          message: response.data.message
        };
      }
    } catch (error) {
      logApiCall('/beli/otp', 'POST', phoneNumber, null, error);
      return {
        success: false,
        message: 'Gagal membeli paket'
      };
    }
  }

  // Cek status transaksi
  async checkTransactionStatus(trxId, userPhone) {
    try {
      const response = await axios.get(`${this.baseUrl}/cekStatus`, {
        params: {
          hesdastore: this.hesdaKey,
          trx_id: trxId
        },
        headers: this.getAuthHeaders()
      });

      logApiCall('/cekStatus', 'GET', userPhone, response.data);
      
      if (response.data.status) {
        return {
          success: true,
          data: response.data.data
        };
      } else {
        return {
          success: false,
          message: response.data.message
        };
      }
    } catch (error) {
      logApiCall('/cekStatus', 'GET', userPhone, null, error);
      return {
        success: false,
        message: 'Gagal mengecek status transaksi'
      };
    }
  }

  // Helper untuk mendapatkan access token (cek session dulu, kalau tidak ada baru minta OTP)
  async getAccessToken(phoneNumber) {
    // Cek session yang sudah ada
    const sessionCheck = await this.checkLoginSession(phoneNumber);
    if (sessionCheck.success) {
      await db.updateSessionLastUsed(phoneNumber);
      return sessionCheck;
    }

    // Kalau tidak ada session, return false supaya user diminta untuk OTP
    return {
      success: false,
      needOtp: true,
      message: 'Perlu verifikasi OTP untuk melanjutkan'
    };
  }
}

module.exports = new HesdaApiService();