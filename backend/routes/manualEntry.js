const express = require('express');
const router  = express.Router();
const db      = require('../src/db');
const { getPhTime } = require('../src/time');

router.post('/', async (req, res) => {
  const { student_id } = req.body;

  if (!student_id)
    return res.status(400).json({ message: 'Student ID is required.' });

  try {
    // 1. Find the student
    const [rows] = await db.query(
      'SELECT * FROM students WHERE student_id = ?',
      [student_id.trim()]
    );

    if (!rows.length)
      return res.status(404).json({ message: 'Student not found. Please check your ID.' });

    const student = rows[0];
    const now     = getPhTime();
    const today   = now.toISOString().slice(0, 10); // YYYY-MM-DD

    // 2. Determine ENTRY or EXIT based on last log today
    const [lastLog] = await db.query(
      `SELECT eel.action FROM entry_exit_logs eel
       WHERE eel.student_id = ? AND DATE(eel.log_time) = ?
       ORDER BY eel.log_time DESC LIMIT 1`,
      [student_id, today]
    );

    const action = (!lastLog.length || lastLog[0].action === 'EXIT') ? 'ENTRY' : 'EXIT';

    // 3. Insert into authentication
    const [authResult] = await db.query(
      `INSERT INTO authentication (student_id, method, auth_status, timestamp)
       VALUES (?, 'MANUAL', 'SUCCESS', ?)`,
      [student_id, now]
    );

    const auth_id = authResult.insertId;

    // 4. Insert into entry_exit_logs
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
    console.error('[Manual Entry Error]', err);
    return res.status(500).json({ message: 'Server error. Please try again.' });
  }
});

module.exports = router;