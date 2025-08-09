// File: whatsapp.js
const { makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers } = require("@whiskeysockets/baileys");
const P = require("pino");
const qrcode = require('qrcode-terminal');
const path = require('path');

// Variabel untuk menyimpan instance socket tunggal (singleton)
let sockInstance;

async function connectToWhatsApp() {
  // Jika instance sudah ada dan terhubung, kembalikan yang sudah ada.
  if (sockInstance && sockInstance.ws?.readyState === 1) {
    return sockInstance;
  }

  return new Promise(async (resolve, reject) => {
    const { state, saveCreds } = await useMultiFileAuthState(path.join(__dirname, 'auth_info_baileys'));

    const sock = makeWASocket({
      logger: P({ level: 'silent' }),
      auth: state,
      browser: Browsers.macOS('Chrome'), // Menyamarkan sebagai browser desktop untuk stabilitas
      printQRInTerminal: false // Kita akan handle QR secara manual
    });

    // Handler untuk event 'creds.update'
    sock.ev.on('creds.update', saveCreds);

    // Handler untuk event 'connection.update'
    const connectionUpdateHandler = (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        console.log('\n========================================');
        console.log('📱 Pindai QR Code ini dengan WhatsApp Anda:');
        qrcode.generate(qr, { small: true });
        console.log('========================================\n');
      }

      if (connection === 'open') {
        console.log('✅ Berhasil terhubung ke WhatsApp!');
        sockInstance = sock; // Simpan instance yang berhasil
        sock.ev.off('connection.update', connectionUpdateHandler); // Hapus listener agar tidak duplikat
        resolve(sock); // Selesaikan promise dengan instance socket
      } else if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        
        if (statusCode === DisconnectReason.loggedOut) {
          console.error('🔴 Gagal terhubung: Anda telah logout. Hapus folder "auth_info_baileys" dan coba lagi.');
          // Hentikan proses jika logout
          reject(new Error('Logged Out'));
        } else {
          // Semua alasan lain untuk putus koneksi akan menyebabkan promise ditolak,
          // yang akan ditangkap oleh loop di index.js untuk mencoba lagi.
          const errorMessage = lastDisconnect?.error?.message || 'Koneksi terputus';
          console.log(`🔴 Koneksi terputus karena: ${errorMessage}`);
          reject(new Error(errorMessage));
          sockInstance = null;
          setTimeout(connectToWhatsApp, 2000);
        }
      }
    };

    sock.ev.on('connection.update', connectionUpdateHandler);
  });
}

module.exports = { connectToWhatsApp };