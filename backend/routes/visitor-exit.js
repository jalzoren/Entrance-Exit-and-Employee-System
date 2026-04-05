const express = require('express');
const router = express.Router();
const db = require('../src/db');
const { getPhTime } = require('../src/time');

router.post('/', async (req, res) => {
  const { qr_data } = req.body;

  if (!qr_data)
    return res.status(400).json({ message: 'No QR data received.' });

  if (!qr_data.startsWith('VISITOR_EXIT:')) {
    return res.status(400).json({ message: 'Invalid QR format.' });
  }

  const qrToken = qr_data.replace('VISITOR_EXIT:', '');

  try {
    // ✅ Get latest record of this QR
    const [rows] = await db.query(
      `SELECT * FROM visitor_logs 
       WHERE qr_token = ?
       ORDER BY log_time DESC
       LIMIT 1`,
      [qrToken]
    );

    if (!rows.length) {
      return res.status(404).json({
        message: 'QR not found.',
      });
    }

    const lastLog = rows[0];

    // ❌ Already exited
    if (lastLog.action === 'EXIT') {
      return res.status(409).json({
        message: 'This QR has already been used for exit.',
      });
    }

    const now = getPhTime();

    // ✅ INSERT EXIT RECORD (NEW ROW)
    await db.query(
      `INSERT INTO visitor_logs 
       (full_name, email, reason, other_reason, action, log_time, qr_token)
       VALUES (?, ?, ?, ?, 'EXIT', ?, ?)`,
      [
        lastLog.full_name,
        lastLog.email,
        lastLog.reason,
        lastLog.other_reason,
        now,
        qrToken,
      ]
    );

    return res.json({
      message: `Goodbye ${lastLog.full_name}! Exit recorded.`,
    });

  } catch (err) {
    console.error('[Visitor Exit Error]', err);
    return res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;