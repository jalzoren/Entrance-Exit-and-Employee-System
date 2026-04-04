const express = require('express');
const router  = express.Router();
const db      = require('../src/db');
const { getPhTime } = require('../src/time');

router.post('/', async (req, res) => {
  const { full_name, reason, other_reason } = req.body;

  if (!full_name?.trim())
    return res.status(400).json({ message: 'Full name is required.' });

  if (!reason?.trim())
    return res.status(400).json({ message: 'Reason for visit is required.' });

  try {
    const now = getPhTime();

    await db.query(
      `INSERT INTO visitor_logs (full_name, reason, other_reason, action, log_time)
       VALUES (?, ?, ?, 'ENTRY', ?)`,
      [
        full_name.trim(),
        reason.trim(),
        other_reason?.trim() || null,
        now,
      ]
    );

    return res.json({
      message: `Visitor pass issued for ${full_name.trim()}. Welcome!`,
    });

  } catch (err) {
    console.error('[Visitor Log Error]', err);
    return res.status(500).json({ message: 'Server error. Please try again.' });
  }
});

module.exports = router;