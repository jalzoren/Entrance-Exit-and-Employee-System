require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');

const router = express.Router();

// Create MySQL pool using .env
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

// Email transporter using .env
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

// Generate random 6-digit code
const generateCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};



// ===============================
// 1️⃣ Send OTP Code
// ===============================
router.post('/forgot-password/send-code', async (req, res) => {
  try {
    const { email } = req.body;

    const [rows] = await pool.query(
      'SELECT * FROM admins WHERE email = ?',
      [email]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Email not found'
      });
    }

    const user = rows[0];
    const resetCode = generateCode();
    const codeExpiry = new Date(Date.now() + 15 * 60000); // 15 mins

    await pool.query(
      'UPDATE admins SET reset_code = ?, code_expiry = ? WHERE admin_id = ?',
      [resetCode, codeExpiry, user.admin_id]
    );

    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: email,
      subject: 'Password Reset Code - EEMS',
      html: `
        <h2>Password Reset</h2>
        <p>Hello ${user.fullname || 'User'},</p>
        <p>Your verification code is:</p>
        <h1>${resetCode}</h1>
        <p>This code expires in 15 minutes.</p>
      `
    });

    res.json({
      success: true,
      message: 'Verification code sent'
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Failed to send code'
    });
  }
});



// ===============================
// 2️⃣ Verify Code
// ===============================
router.post('/forgot-password/verify-code', async (req, res) => {
  try {
    const { email, code } = req.body;

    const [rows] = await pool.query(
      'SELECT * FROM admins WHERE email = ? AND reset_code = ? AND code_expiry > NOW()',
      [email, code]
    );

    if (rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired code'
      });
    }

    res.json({
      success: true,
      message: 'Code verified'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Verification failed'
    });
  }
});



// ===============================
// 3️⃣ Reset Password
// ===============================
router.post('/forgot-password/reset', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    const [rows] = await pool.query(
      'SELECT * FROM admins WHERE email = ? AND reset_code = ? AND code_expiry > NOW()',
      [email, code]
    );

    if (rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired code'
      });
    }

    // 🔐 Hash password before saving
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await pool.query(
      'UPDATE admins SET password = ?, reset_code = NULL, code_expiry = NULL WHERE email = ?',
      [hashedPassword, email]
    );

    res.json({
      success: true,
      message: 'Password reset successful'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to reset password'
    });
  }
});

module.exports = router;