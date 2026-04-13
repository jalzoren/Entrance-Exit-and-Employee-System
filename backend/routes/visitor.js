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
  from: `"Visitor Management System" <${process.env.EMAIL_USER}>`,
  to: email,
  subject: 'Your Visitor QR Code - Exit Pass',
  html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Visitor QR Code</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          background-color: #f4f7f5;
        }
        
        .email-wrapper {
          max-width: 550px;
          margin: 20px auto;
          background: #ffffff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 8px 32px rgba(1, 49, 29, 0.12);
        }
        
        /* Header - using your modal colors */
        .email-header {
          background: linear-gradient(135deg, #01311d 0%, #548772 100%);
          padding: 32px 24px;
          text-align: center;
        }
        
        .email-header h1 {
          color: #ffffff;
          font-size: 26px;
          font-weight: 700;
          margin-bottom: 8px;
          letter-spacing: -0.3px;
          font-family: 'Montserrat', sans-serif;
        }
        
        .email-header p {
          color: rgba(255, 255, 255, 0.9);
          font-size: 13px;
          font-weight: 500;
        }
        
        /* Content */
        .email-content {
          padding: 32px 28px;
          background: #ffffff;
        }
        
        .greeting {
          font-size: 22px;
          font-weight: 700;
          color: #01311d;
          margin-bottom: 12px;
          font-family: 'Montserrat', sans-serif;
        }
        
        .message {
          color: #2c3e3a;
          font-size: 15px;
          margin-bottom: 20px;
          line-height: 1.5;
        }
        
        /* QR Code Box */
        .qr-container {
          background: #fcfbf4;
          border: 2px solid #e0e8e4;
          border-radius: 12px;
          padding: 20px;
          text-align: center;
          margin: 24px 0;
        }
        
        .qr-label {
          background: #548772;
          color: white;
          display: inline-block;
          padding: 6px 16px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
          margin-bottom: 16px;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }
        
        .qr-image {
          margin: 16px 0;
          padding: 12px;
          background: white;
          display: inline-block;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }
        
        .qr-image img {
          max-width: 180px;
          height: auto;
          display: block;
          margin: 0 auto;
        }
        
        /* Info Cards */
        .visitor-info {
          background: #f8faf8;
          border-radius: 10px;
          padding: 16px;
          margin: 20px 0;
        }
        
        .info-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #e0e8e4;
        }
        
        .info-row:last-child {
          border-bottom: none;
        }
        
        .info-label {
          font-size: 12px;
          font-weight: 600;
          color: #548772;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        
        .info-value {
          font-size: 14px;
          font-weight: 500;
          color: #01311d;
        }
        
        /* Warning Box - using your accent color */
        .warning-box {
          background: #fff8e7;
          border-left: 4px solid #d99201;
          padding: 14px 18px;
          border-radius: 8px;
          margin: 20px 0;
        }
        
        .warning-box p {
          color: #8a6e2d;
          font-size: 13px;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .warning-icon {
          font-size: 18px;
          font-weight: bold;
        }
        
        /* Instructions */
        .instructions {
          background: #e8f5e9;
          border-radius: 8px;
          padding: 14px 18px;
          margin: 20px 0;
        }
        
        .instructions p {
          color: #2e7d32;
          font-size: 13px;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        /* Footer */
        .email-footer {
          background: #f8faf8;
          padding: 20px 28px;
          text-align: center;
          border-top: 1px solid #e0e8e4;
        }
        
        .email-footer p {
          color: #6b7c78;
          font-size: 12px;
          margin: 5px 0;
        }
        
        .email-footer .footer-note {
          color: #01311d;
          font-weight: 600;
          margin-top: 8px;
        }
        
        @media (max-width: 600px) {
          .email-wrapper {
            margin: 10px;
            border-radius: 12px;
          }
          
          .email-content {
            padding: 24px 20px;
          }
          
          .email-header {
            padding: 24px 20px;
          }
          
          .email-header h1 {
            font-size: 22px;
          }
          
          .greeting {
            font-size: 20px;
          }
        }
      </style>
    </head>
    <body>
      <div class="email-wrapper">
        <div class="email-header">
          <h1>EXIT PASS</h1>
          <p>Visitor Management System</p>
        </div>
        
        <div class="email-content">
          <div class="greeting">
            Hello, ${full_name}!
          </div>
          
          <div class="message">
            Thank you for your visit. Please present the QR code below when exiting the premises.
          </div>
          
          <div class="qr-container">
            <div class="qr-label">EXIT QR CODE</div>
            <div class="qr-image">
              <img src="cid:visitorqr" alt="Exit QR Code" />
            </div>
            <p style="font-size: 12px; color: #6b7c78; margin-top: 12px;">
              Scan this QR code at the exit gate
            </p>
          </div>
          
          <div class="visitor-info">
            <div class="info-row">
              <span class="info-label">Visitor Name</span>
              <span class="info-value">${full_name}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Pass Type</span>
              <span class="info-value">Exit Pass</span>
            </div>
            <div class="info-row">
              <span class="info-label">Valid Until</span>
              <span class="info-value">Today only</span>
            </div>
          </div>
          
          <div class="warning-box">
            <p>
              <span class="warning-icon"></span>
              <strong>IMPORTANT:</strong> Do not share this QR code with anyone.
            </p>
          </div>
          
          <div class="instructions">
            <p>
              <span></span>
              Show this QR code to the security personnel when exiting
            </p>
          </div>
        </div>
        
        <div class="email-footer">
          <p>This is an automated message from Visitor Management System</p>
          <p>© 2024 Pamantasan ng Lungsod ng Pasig. Entry-Exit Monitoring System. All rights reserved.</p>
          <p class="footer-note">Thank you for your cooperation!</p>
        </div>
      </div>
    </body>
    </html>
  `,
  attachments: [{
    filename: 'visitor_qr.png',
    content: Buffer.from(qrImage.split(',')[1], 'base64'),
    cid: 'visitorqr',
  }],
});

    return res.json({ message: `Visitor pass issued for ${full_name.trim()}. Welcome!` });

  } catch (err) {
    console.error('[Visitor Log Error]', err);
    return res.status(500).json({ message: 'Server error. Please try again.' });
  }
});

module.exports = router;