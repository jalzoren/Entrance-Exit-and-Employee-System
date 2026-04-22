// routes/manualEntry.js
const express = require('express');
const router  = express.Router();
const db      = require('../src/db');
const { getTodayPhRange, getPhTime } = require('../src/time'); // ← added getPhTime

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: check if the gate is open for the given mode
// ─────────────────────────────────────────────────────────────────────────────
async function isGateOpen(mode) {
  const [rows] = await db.query(
    "SELECT `key`, value FROM system_settings WHERE `key` IN (?, ?, ?)",
    [
      mode === 'ENTRY' ? 'gate_entry_start' : 'gate_exit_start',
      mode === 'ENTRY' ? 'gate_entry_end'   : 'gate_exit_end',
      'block_outside_window',
    ]
  );
  const s = rows.reduce((acc, r) => { acc[r.key] = r.value; return acc; }, {});

  if (s.block_outside_window !== 'true') return true; // enforcement off

  const now  = await getPhTime(db); // ← getPhTime now imported
  const hhmm = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

  const start = mode === 'ENTRY' ? s.gate_entry_start : s.gate_exit_start;
  const end   = mode === 'ENTRY' ? s.gate_entry_end   : s.gate_exit_end;

  return hhmm >= start && hhmm <= end;
}

// ── POST /api/manualentry ─────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { student_id, mode } = req.body;

  console.log('=== MANUAL ENTRY REQUEST ===');
  console.log('Student ID:', student_id);
  console.log('Mode:', mode);

  if (!student_id) {
    return res.status(400).json({ message: 'Student ID is required.' });
  }

  if (!mode || !['ENTRY', 'EXIT'].includes(mode)) {
    return res.status(400).json({ message: 'Invalid mode. Must be ENTRY or EXIT.' });
  }

  try {
    // ── Gate check (inside handler where req/res exist) ────────────────
    const open = await isGateOpen(mode); // ← moved inside handler
    if (!open) {
      return res.status(403).json({
        message: `The ${mode === 'ENTRY' ? 'entry' : 'exit'} gate is currently closed.`,
        action:  'GATE_CLOSED',
      });
    }

    // 1. Find the student
    const [rows] = await db.query(
      'SELECT * FROM students WHERE student_id = ?',
      [student_id.trim()]
    );

    if (!rows.length)
      return res.status(404).json({ message: 'Student not found. Please check your ID.' });
    }

    const student = rows[0];
    const fullName = `${student.last_name}, ${student.first_name}`;

    // 2. Get server-authoritative PH time + today's date window
    const { now, dayStart, dayEnd } = await getTodayPhRange(db);
    console.log('[Manual Entry]', student_id.trim(), '| mode:', mode);
    console.log('[Manual Entry] Window:', dayStart, '→', dayEnd);

    // 3. Check last action today
    const [lastLogs] = await db.query(
      `SELECT action FROM entry_exit_logs
       WHERE student_id = ?
         AND log_time BETWEEN ? AND ?
       ORDER BY log_time DESC
       LIMIT 1`,
      [student_id.trim(), dayStart, dayEnd]
    );

    const lastAction = lastLogs.length ? lastLogs[0].action : null;
    console.log('Last action today:', lastAction || 'none');

    // Validate based on mode
    if (mode === 'ENTRY' && lastAction === 'ENTRY') {
      return res.status(409).json({
        message: `You've already entered the school.`,
        action: 'ALREADY_ENTERED'
      });
    }

    if (mode === 'EXIT' && lastAction === 'EXIT') {
      return res.status(409).json({
        message: `You've already exited the school.`,
        action: 'ALREADY_EXITED'
      });
    }

    if (mode === 'EXIT' && !lastAction) {
      return res.status(409).json({
        message: `No entry record found for today. Please enter first.`,
        action: 'NO_ENTRY'
      });
    }

    // Insert authentication record
    const [authResult] = await db.query(
      `INSERT INTO authentication (student_id, method, auth_status, timestamp)
       VALUES (?, 'MANUAL', 'SUCCESS', ?)`,
      [student_id.trim(), now]
    );
    console.log('Authentication record inserted, ID:', authResult.insertId);

    // Insert entry/exit log
    await db.query(
      `INSERT INTO entry_exit_logs (student_id, auth_id, action, log_time)
       VALUES (?, ?, ?, ?)`,
      [student_id.trim(), authResult.insertId, mode, now]
    );

    console.log('[Manual Entry]', mode, 'logged for', fullName);

    return res.json({
      message:    `${mode} recorded for ${fullName}.`,
      action:     mode,
      student:    fullName,
      department: student.college_department,
    });

  } catch (err) {
    console.error('=== MANUAL ENTRY ERROR ===', err);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.'
    });
  }
});

module.exports = router;