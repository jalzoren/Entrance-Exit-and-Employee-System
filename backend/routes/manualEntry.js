// manualEntry.js
const express = require('express');
const router  = express.Router();
const db      = require('../src/db');
const { getTodayPhRange } = require('../src/time'); 

router.post('/', async (req, res) => {
  const { student_id, mode } = req.body;

  if (!student_id)
    return res.status(400).json({ message: 'Student ID is required.' });

  if (!mode || !['ENTRY', 'EXIT'].includes(mode))
    return res.status(400).json({ message: 'Invalid mode. Must be ENTRY or EXIT.' });

  try {
    // 1. Find the student
    const [rows] = await db.query(
      'SELECT * FROM students WHERE student_id = ?',
      [student_id.trim()]
    );

    if (!rows.length)
      return res.status(404).json({ message: 'Student not found. Please check your ID.' });

    const student  = rows[0];
    const fullName = `${student.last_name}, ${student.first_name}`;

    // 2. Get server-authoritative PH time + today's date window
    //    now      → used for INSERT timestamps
    //    dayStart → used for BETWEEN query (replaces DATE(log_time) = ?)
    //    dayEnd   → same
    const { now, dayStart, dayEnd } = await getTodayPhRange(db);

    console.log('[Manual Entry]', student_id.trim(), '| mode:', mode);
    console.log('[Manual Entry] Window:', dayStart, '→', dayEnd);
    // 3. Check last action today using BETWEEN (timezone-safe)
    const [lastLogs] = await db.query(
      `SELECT action FROM entry_exit_logs
       WHERE student_id = ?
         AND log_time BETWEEN ? AND ?
       ORDER BY log_time DESC
       LIMIT 1`,
      [student_id.trim(), dayStart, dayEnd]
    );

    const lastAction = lastLogs.length ? lastLogs[0].action : null;
    console.log('[Manual Entry] lastAction:', lastAction ?? 'none today');

    // 4. Validate against mode
    if (mode === 'ENTRY' && lastAction === 'ENTRY')
      return res.status(409).json({ message: `You've already entered the school.`, action: 'ALREADY_ENTERED' });

    if (mode === 'EXIT' && lastAction === 'EXIT')
      return res.status(409).json({ message: `You've already exited the school.`, action: 'ALREADY_EXITED' });

    if (mode === 'EXIT' && !lastAction)
      return res.status(409).json({ message: `No entry record found for today. Please enter first.`, action: 'NO_ENTRY' });

    // 5. Insert authentication record
    const [authResult] = await db.query(
      `INSERT INTO authentication (student_id, method, auth_status, timestamp)
       VALUES (?, 'MANUAL', 'SUCCESS', ?)`,
      [student_id.trim(), now]
    );

    // 6. Insert entry/exit log
    await db.query(
      `INSERT INTO entry_exit_logs (student_id, auth_id, action, log_time)
       VALUES (?, ?, ?, ?)`,
      [student_id.trim(), authResult.insertId, mode, now]
    );

    console.log('[Manual Entry] ', mode, 'logged for', fullName);

    return res.json({
      message:    `${mode} recorded for ${fullName}.`,
      action:     mode,
      student:    fullName,
      department: student.college_department,
    });

  } catch (err) {
    console.error('[Manual Entry Error]', err);
    return res.status(500).json({ message: 'Server error. Please try again.' });
  }
});

module.exports = router;