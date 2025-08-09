// supabase/functions/verify-reset-password/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
serve(async (req)=>{
  const { email, otp, newPassword } = await req.json();
  
  if (!email || !otp || !newPassword) {
    return new Response(JSON.stringify({
      error: 'Email, OTP, dan password wajib diisi'
    }), {
      status: 400
    });
}
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
    const { data: deletedData, error: deleteError } = await supabase.from('email_otps').delete().lt('expires_at', new Date().toISOString());
    const { data, error } = await supabase.from('email_otps').select('*').eq('email', email).eq('otp_code', otp).order('expires_at', {
    ascending: false
  }).limit(1).single();
  if (error || !data || new Date(data.expires_at) < new Date()) {
    return new Response(JSON.stringify({
      error: 'OTP tidak valid atau kadaluarsa'
    }), {
      status: 403
    });
  }
  const { data: user } = await supabase.auth.admin.getUserByEmail(email);
  if (!user) return new Response(JSON.stringify({
    error: 'User tidak ditemukan'
  }), {
    status: 404
  });
  const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
    password: newPassword
  });
  if (updateError) {
    return new Response(JSON.stringify({
      error: updateError.message
    }), {
      status: 500
    });
  }
  // Hapus OTP setelah berhasil
  await supabase.from("email_otps").delete().eq("id", data.id);
  return new Response(JSON.stringify({
    success: true
  }), {
    status: 200
  });
});
