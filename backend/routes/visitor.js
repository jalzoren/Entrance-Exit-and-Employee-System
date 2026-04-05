// visitor.js
const express = require('express');
const router  = express.Router();
const db      = require('../src/db');
const { getPhTime } = require('../src/time');

const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');

router.post('/', async (req, res) => {
  const { full_name, email, reason, other_reason } = req.body;

  if (!full_name?.trim())
    return res.status(400).json({ message: 'Full name is required.' });

  if (!email?.trim())
    return res.status(400).json({ message: 'Email is required.' });

  // basic email format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email))
    return res.status(400).json({ message: 'Invalid email format.' });

  if (!reason?.trim())
    return res.status(400).json({ message: 'Reason for visit is required.' });

  try {
    const now = getPhTime();

    const qrToken = uuidv4();
    const qrData = `VISITOR_EXIT:${qrToken}`;
    const qrImage = await QRCode.toDataURL(qrData);

    await db.query(
      `INSERT INTO visitor_logs (full_name, email, reason, other_reason, action, log_time)
       VALUES (?, ?, ?, ?, 'ENTRY', ?)`,
      [
        full_name.trim(),
        email.trim(),
        reason.trim(),
        other_reason?.trim() || null,
        now,
      ]
    );

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'your_email@gmail.com',       // 🔴 CHANGE THIS
        pass: 'your_app_password_here',     // 🔴 Gmail App Password
      },
    });

    await transporter.sendMail({
      from: '"Visitor System" <your_email@gmail.com>',
      to: email,
      subject: 'Your Visitor QR Code (EXIT PASS)',
      html: `
        <h3>Hello ${full_name},</h3>
        <p>Here is your QR code for EXIT.</p>
        <p>Please present this when leaving the premises.</p>
        <img src="${qrImage}" />
        <p><b>Do not share this QR code.</b></p>
      `,
    });

    return res.json({
      message: `Visitor pass issued for ${full_name.trim()}. Welcome!`,
    });

  } catch (err) {
    console.error('[Visitor Log Error]', err);
    return res.status(500).json({ message: 'Server error. Please try again.' });
  }
});

module.exports = router;