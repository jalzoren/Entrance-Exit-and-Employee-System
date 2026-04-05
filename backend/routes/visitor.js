// visitor.js
const express    = require('express');
const router     = express.Router();
const db         = require('../src/db');
const { getTodayPhRange } = require('../src/time'); // no pool arg needed

const QRCode     = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');

router.post('/', async (req, res) => {
  const { full_name, email, reason, other_reason } = req.body;

  if (!full_name?.trim())
    return res.status(400).json({ message: 'Full name is required.' });

  if (!email?.trim())
    return res.status(400).json({ message: 'Email is required.' });

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email))
    return res.status(400).json({ message: 'Invalid email format.' });

  if (!reason?.trim())
    return res.status(400).json({ message: 'Reason for visit is required.' });

  try {
    // ── Server-authoritative PH time ───────────────────────────────────
    const { now, dayStart, dayEnd } = await getTodayPhRange();

    // ── Check if visitor already entered today (BETWEEN, not DATE()) ───
    const [existingLogs] = await db.query(
      `SELECT * FROM visitor_logs
       WHERE email = ?
         AND log_time BETWEEN ? AND ?
         AND action = 'ENTRY'`,
      [email.trim(), dayStart, dayEnd]
    );

    if (existingLogs.length > 0) {
      return res.status(409).json({
        message: `Visitor ${full_name.trim()} has already entered today.`,
        action: 'ALREADY_ENTERED',
      });
    }

    const qrToken = uuidv4();
    const qrData  = `VISITOR_EXIT:${qrToken}`;
    const qrImage = await QRCode.toDataURL(qrData);

    await db.query(
      `INSERT INTO visitor_logs (full_name, email, reason, other_reason, action, log_time, qr_token)
       VALUES (?, ?, ?, ?, 'ENTRY', ?, ?)`,
      [full_name.trim(), email.trim(), reason.trim(), other_reason?.trim() || null, now, qrToken]
    );

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });

    await transporter.sendMail({
      from:    `"Visitor System" <${process.env.EMAIL_USER}>`,
      to:      email,
      subject: 'Your Visitor QR Code (EXIT PASS)',
      html: `
        <h3>Hello ${full_name},</h3>
        <p>Here is your QR code for EXIT:</p>
        <p>Please present this when leaving the premises.</p>
        <img src="cid:visitorqr" style="max-width:100%;height:auto;" />
        <p><b>Do not share this QR code.</b></p>
      `,
      attachments: [{
        filename: 'visitor_qr.png',
        content:  Buffer.from(qrImage.split(',')[1], 'base64'),
        cid:      'visitorqr',
      }],
    });

    return res.json({ message: `Visitor pass issued for ${full_name.trim()}. Welcome!` });

  } catch (err) {
    console.error('[Visitor Log Error]', err);
    return res.status(500).json({ message: 'Server error. Please try again.' });
  }
});

module.exports = router;