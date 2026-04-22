// routes/qrScan.js
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

// ── POST /api/qrscan ──────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { qr_data, mode } = req.body;

  console.log('[QR Scan] ==========================================');
  console.log('[QR Scan] Raw QR data:', qr_data);
  console.log('[QR Scan] QR data type:', typeof qr_data);
  console.log('[QR Scan] QR data length:', qr_data?.length);
  console.log('[QR Scan] Mode:', mode);
  console.log('[QR Scan] ==========================================');

  if (!qr_data)
    return res.status(400).json({ message: 'No QR data received.' });

  if (!mode || !['ENTRY', 'EXIT'].includes(mode))
    return res.status(400).json({ message: 'Invalid mode. Must be ENTRY or EXIT.' });

  try {
    // ── Gate check (inside handler where req/res exist) ────────────────
    const open = await isGateOpen(mode); // ← moved inside handler
    if (!open) {
      return res.status(403).json({
        message: `The ${mode === 'ENTRY' ? 'entry' : 'exit'} gate is currently closed.`,
        action:  'GATE_CLOSED',
      });
    }

    // ── Get server-authoritative PH time once, reuse everywhere ───────
    const { now, dayStart, dayEnd } = await getTodayPhRange(db);
    console.log('[QR Scan] PH now:', now.toString());
    console.log('[QR Scan] Window:', dayStart, '→', dayEnd);

    // ══ VISITOR EXIT ══════════════════════════════════════════════════
    if (qr_data.startsWith('VISITOR_EXIT:')) {
      if (mode !== 'EXIT')
        return res.status(400).json({ message: 'Visitor QR can only be used for EXIT.' });

      const qrToken = qr_data.split(':')[1];
      const [rows] = await db.query(
        'SELECT * FROM visitor_logs WHERE qr_token = ? AND action = "ENTRY"',
        [qrToken]
      );

      if (!rows.length)
        return res.status(409).json({ message: 'Visitor already exited or QR invalid.' });

      const visitor = rows[0];
      await db.query(
        'UPDATE visitor_logs SET action = "EXIT", log_time = ? WHERE visitor_id = ?',
        [now, visitor.visitor_id]
        [now, visitor.visitor_id]
      );

      return res.json({
        success: true,
        message: `EXIT recorded for visitor ${visitor.full_name}.`,
        action: 'EXIT',
        student: visitor.full_name,
        student_id: visitor.visitor_id,
        department: 'Visitor',
        year_level: 'Not Specified',
        course: 'Not Specified',
        gender: 'Not Specified'
      });
    }

    // ══ STUDENT ENTRY/EXIT ════════════════════════════════════════════
    const match = qr_data.match(/\[([^\]]+)\]/);
    if (!match)
      return res.status(400).json({ message: 'Invalid QR code format. Could not read student ID.' });

    const student_id = match[1].trim();

    // Query database for student
    const [studentRows] = await db.query(
      'SELECT * FROM students WHERE student_id = ?',
      [student_id]
    );

    if (!studentRows.length) {
      console.log('[QR Scan] Student not found in database:', student_id);
      return res.status(404).json({ message: 'Student not found. Invalid QR code.' });
    }

    const student = studentRows[0];
    const fullName = `${student.last_name}, ${student.first_name}`;
    const yearLevelNumber = student.year_level;
    const collegeDept = student.college_department || "Not Specified";
    const course = student.program_name || "Not Specified";

    console.log('[QR Scan] Student found in database:', {
      id: student.student_id,
      name: fullName,
      year_level: yearLevelNumber,
      year_level_type: typeof yearLevelNumber,
      department: collegeDept
    });

    // Check last action today
    const [lastLogs] = await db.query(
      `SELECT action FROM entry_exit_logs
       WHERE student_id = ?
         AND log_time BETWEEN ? AND ?
       ORDER BY log_time DESC
       LIMIT 1`,
      [student_id, dayStart, dayEnd]
    );

    const lastAction = lastLogs.length ? lastLogs[0].action : null;
    console.log('[QR Scan] Last action today:', lastAction ?? 'none');

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

    // ── Record authentication ──────────────────────────────────────────
    const [authResult] = await db.query(
      `INSERT INTO authentication (student_id, method, auth_status, timestamp)
       VALUES (?, 'QR', 'SUCCESS', ?)`,
      [student_id, now]
    );
    console.log('[QR Scan] Auth record inserted, ID:', authResult.insertId);

    // ── Insert entry/exit log ──────────────────────────────────────────
    await db.query(
      `INSERT INTO entry_exit_logs (student_id, auth_id, action, log_time)
       VALUES (?, ?, ?, ?)`,
      [student_id, authResult.insertId, mode, now]
    );
    console.log('[QR Scan] Log saved to entry_exit_logs, log_id:', logResult.insertId);

    // Return COMPLETE student data
    const response = {
      success: true,
      message: `${mode === 'ENTRY' ? 'Entry' : 'Exit'} recorded for ${fullName}.`,
      action: mode,
      student: fullName,
      student_id: student.student_id,
      department: collegeDept,
      year_level: yearLevelNumber,
      course: course,
      gender: "Not Specified",
      status: student.status || "Not Specified"
    };
    
    console.log('[QR Scan] Sending response:', response);
    console.log('[QR Scan] ==========================================');
    
    return res.json(response);

  } catch (err) {
    console.error('[QR Scan Error]', err);
    return res.status(500).json({ 
      success: false,
      message: 'Server error. Please try again.' 
    });
  }
});

module.exports = router;