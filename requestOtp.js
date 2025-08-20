
  require('dotenv').config()
  const express = require('express');
  const bcrypt = require('bcrypt');
  const router = express.Router();
  const { createClient } = require('@supabase/supabase-js');
  const { connectToWhatsApp } = require('./wa'); // Import dari file whatsapp.js


  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  function generateOtpCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  router.post('/request-otp', async (req, res) => {
    const { phone } = req.body;

    // Ambil data user berdasarkan nomor
    const { data: dataNomor, error: dataNomorError } = await supabase
      .from('users')
      .select('phone_number')
      .eq('phone_number', phone)
      .maybeSingle();


    if (dataNomor) {
      return res.status(400).json({ error: `Nomor ${phone} sudah digunakan.` });
    }


    if (!phone || !phone.startsWith('+62')) {
      return res.status(400).json({ error: 'Nomor WA tidak valid. Harus format internasional, misal: +628123456789' });
    }


    const otpCode = generateOtpCode();
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000).toISOString(); // 2 menit dari sekarang
    const hashOtpCode = await bcrypt.hash(otpCode, 10); // Enkripsi OTP
    const { error } = await supabase.from('otp_codes').insert({
      phone,
      code: hashOtpCode,
      sent: true,
      expires_at: expiresAt,
    });

    if (error) {
      console.error('❌ Gagal simpan OTP:', error.message);
      return res.status(500).json({ error: 'Gagal menyimpan OTP' });
    }
    // 2. Kirim pesan WhatsApp dengan kode OTP 
    const waNumber = phone.replace('+', '') + '@s.whatsapp.net'; // Bersihkan nomor dan tambahkan sufix
    const message = `Kode OTP Anda adalah: *${otpCode}*\nJangan dibagikan ke siapapun.`;

    const sock = await connectToWhatsApp();
    await sock.sendMessage(waNumber, { text: message });
    console.log(`✅ OTP untuk ${phone} berhasil dikirim.`);
    return res.status(200).json({ message: `OTP telah dikirim ke ${phone}.` });
  });

  module.exports = router;
