require('dotenv').config()
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; 
const supabase = createClient(supabaseUrl, supabaseKey);

router.post('/verify-otp', async (req, res) => {
  const { phone, code } = req.body;

  //  Hapus OTP expired lebih dulu
  await supabase
    .from('otp_codes')
    .delete()
    .eq('phone', phone)
    .lt('expires_at', new Date().toISOString());

  //  Ambil OTP aktif terbaru
  const { data: dataNomor, error } = await supabase
    .from('otp_codes')
    .select('id, phone, code, expires_at')
    .eq('phone', phone)
    .eq('sent', true)
    .eq('is_verif', false)
    .order('expires_at', { ascending: false });

  if (error || !dataNomor || dataNomor.length === 0) {
    console.error('❌ OTP tidak ditemukan:', error?.message || 'Tidak ada data');
    return res.status(404).json({ error: 'Kode OTP tidak valid atau kedaluwarsa' });
  }

  const otp = dataNomor[0];

  const isValid = await bcrypt.compare(code, otp.code);
  if (!isValid) {
    return res.status(400).json({ error: 'Kode OTP salah' });
  }

  // ✅ Update sebagai terverifikasi
  const { error: updateError } = await supabase
    .from('otp_codes')
    .update({ is_verif: true })
    .eq('id', otp.id);

  if (updateError) {
    return res.status(500).json({ error: 'Gagal memverifikasi OTP di database.' });
  }

  // 🔐 Generate JWT
  const token = jwt.sign(
    {
      sub: otp.id,
      phone: otp.phone,
      role: 'authenticated',
    },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  return res.json({ token, message: 'OTP berhasil diverifikasi' });
});

module.exports = router;