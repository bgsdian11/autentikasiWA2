const express = require('express');
const cors = require('cors');
const requestOtp = require('./requestOtp');
const verifyOtp = require('./verifOtp');

const app = express();
app.use(cors());
app.use(express.json());

app.use(requestOtp);  // POST /request-otp
app.use(verifyOtp);   // POST /verify-otp

const PORT = process.env.PORT || 3333;
app.listen(PORT, () => {
  // console.log(`🚀 Server berjalan di http://10.0.2.2:${PORT}`);
  console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
});
