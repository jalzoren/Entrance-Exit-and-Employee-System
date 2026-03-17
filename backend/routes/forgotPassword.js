const express = require('express');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const pool = require("../src/db"); 
const router = express.Router();

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

// Get PH Time (UTC+8)
const getPHTime = () => {
  const now = new Date();
  // Convert to PH time (UTC+8)
  const phTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
  return phTime;
};

// Format expiration time for email (12-hour format with AM/PM)
const formatExpirationTime = (expiryDate) => {
  return expiryDate.toLocaleString('en-PH', { 
    timeZone: 'Asia/Manila',
    hour: 'numeric', 
    minute: 'numeric', 
    hour12: true,
    month: 'short',
    day: 'numeric'
  });
};

// Password validation function
const validatePassword = (password) => {
  const errors = [];
  
  if (password.length < 8) {
    errors.push('at least 8 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('one number');
  }
  if (!/[@$!%*?&]/.test(password)) {
    errors.push('one special character (@$!%*?&)');
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
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
    
    // Get current PH time
    const now = new Date();
    // Add 8 hours to convert UTC to PH time
    const phNow = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    
    // Set expiry to 15 minutes from now in PH time
    const codeExpiry = new Date(phNow.getTime() + 15 * 60000);
    
    const expiryTime = formatExpirationTime(codeExpiry);

    // Store PH time in database
    await pool.query(
      'UPDATE admins SET reset_code = ?, code_expiry = ? WHERE email = ?',
      [resetCode, codeExpiry, email]
    );

    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: email,
      subject: 'Password Reset Code - EEMS',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #333; text-align: center;">Password Reset Request</h2>
          <p>Hello ${user.fullname || 'User'},</p>
          <p>We received a request to reset your password. Use the verification code below:</p>
          <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; border-radius: 5px; margin: 20px 0;">
            ${resetCode}
          </div>
          <p><strong>This code expires at ${expiryTime} (PH Time)</strong> (15 minutes from request).</p>
          <p>If you didn't request this, please ignore this email or contact support.</p>
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
          <p style="color: #777; font-size: 12px; text-align: center;">
            Entrance and Exit Monitoring System
          </p>
        </div>
      `
    });

    res.json({
      success: true,
      message: 'Verification code sent'
    });

  } catch (error) {
    console.error('Send code error:', error);
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
      'SELECT * FROM admins WHERE email = ? AND reset_code = ?',
      [email, code]
    );

    if (rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid code'
      });
    }

    const user = rows[0];
    
    // Get current PH time
    const now = new Date();
    const phNow = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    
    const expiry = new Date(user.code_expiry);

    if (expiry < phNow) {
      // Clear expired code
      await pool.query(
        'UPDATE admins SET reset_code = NULL, code_expiry = NULL WHERE email = ?',
        [email]
      );
      
      return res.status(400).json({
        success: false,
        message: 'Code has expired'
      });
    }

    res.json({
      success: true,
      message: 'Code verified'
    });

  } catch (error) {
    console.error('Verification error:', error);
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
      'SELECT * FROM admins WHERE email = ? AND reset_code = ?',
      [email, code]
    );

    if (rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired code'
      });
    }

    const user = rows[0];
    
    // Get current PH time
    const now = new Date();
    const phNow = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    
    const expiry = new Date(user.code_expiry);

    if (expiry < phNow) {
      await pool.query(
        'UPDATE admins SET reset_code = NULL, code_expiry = NULL WHERE email = ?',
        [email]
      );
      
      return res.status(400).json({
        success: false,
        message: 'Code has expired'
      });
    }

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Password must contain: ' + passwordValidation.errors.join(', ')
      });
    }

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
    console.error('Reset error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset password'
    });
  }
});

module.exports = router;