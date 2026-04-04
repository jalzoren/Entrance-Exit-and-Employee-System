const express = require('express');
const router  = express.Router();
const db      = require('../src/db');
const { getPhTime } = require('../src/time');

router.post('/', async (req, res) => {
  const { qr_data } = req.body;

  if (!qr_data)
    return res.status(400).json({ message: 'No QR data received.' });

  // QR contains the student_id (trim whitespace/newlines from scan)
  const student_id = qr_data.trim();

  try {
    // 1. Find the student
    const [rows] = await db.query(
      'SELECT * FROM students WHERE student_id = ?',
      [student_id]
    );

    if (!rows.length)
      return res.status(404).json({ message: 'Student not found. Invalid QR code.' });

    const student = rows[0];
    const now     = getPhTime();
    const today   = now.toISOString().slice(0, 10);

    // 2. Determine ENTRY or EXIT
    const [lastLog] = await db.query(
      `SELECT eel.action FROM entry_exit_logs eel
       WHERE eel.student_id = ? AND DATE(eel.log_time) = ?
       ORDER BY eel.log_time DESC LIMIT 1`,
      [student_id, today]
    );

    const action = (!lastLog.length || lastLog[0].action === 'EXIT') ? 'ENTRY' : 'EXIT';

    // 3. Insert authentication record
    const [authResult] = await db.query(
      `INSERT INTO authentication (student_id, method, auth_status, timestamp)
       VALUES (?, 'MANUAL', 'SUCCESS', ?)`,
      [student_id, now]
    );

    const auth_id = authResult.insertId;

    // 4. Insert entry/exit log
    await db.query(
      `INSERT INTO entry_exit_logs (student_id, auth_id, action, log_time)
       VALUES (?, ?, ?, ?)`,
      [student_id, auth_id, action, now]
    );

    const fullName = `${student.last_name}, ${student.first_name}`;
    return res.json({
      message: `${action} recorded for ${fullName}.`,
      action,
      student: fullName,
    });

  } catch (err) {
    console.error('[QR Scan Error]', err);
    return res.status(500).json({ message: 'Server error. Please try again.' });
  }
});

module.exports = router;