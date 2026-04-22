// qrScan.js
const express = require('express');
const router  = express.Router();
const db      = require('../src/db');
const { getTodayPhRange } = require('../src/time'); 

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

  const { now, dayStart, dayEnd } = await getTodayPhRange(db);
  console.log('[QR Scan] PH now:', now.toString());

  try {
    // VISITOR EXIT
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

    // STUDENT ENTRY/EXIT - Extract student ID from QR code
    let student_id = null;
    
    console.log('[QR Scan] Attempting to extract student ID from:', qr_data);
    
    // Pattern 1: [23-00174] or [23-00174] something
    let match = qr_data.match(/\[([^\]]+)\]/);
    if (match) {
      student_id = match[1].trim();
      console.log('[QR Scan] Pattern 1 (brackets) matched:', student_id);
    }
    
    // Pattern 2: Look for XX-XXXXX format (2 digits, dash, 5 digits)
    if (!student_id) {
      match = qr_data.match(/(\d{2}-\d{5})/);
      if (match) {
        student_id = match[1].trim();
        console.log('[QR Scan] Pattern 2 (XX-XXXXX) matched:', student_id);
      }
    }
    
    // Pattern 3: Look for XXXX-XXXXX (4 digits, dash, 5 digits)
    if (!student_id) {
      match = qr_data.match(/(\d{4}-\d{5})/);
      if (match) {
        student_id = match[1].trim();
        console.log('[QR Scan] Pattern 3 (XXXX-XXXXX) matched:', student_id);
      }
    }
    
    // Pattern 4: Just digits - could be student ID without dash
    if (!student_id) {
      match = qr_data.match(/(\d{7})/);
      if (match) {
        const digits = match[1].trim();
        // Format as XX-XXXXX (first 2 digits, dash, last 5 digits)
        student_id = `${digits.substring(0, 2)}-${digits.substring(2, 7)}`;
        console.log('[QR Scan] Pattern 4 (7 digits) matched, formatted to:', student_id);
      }
    }
    
    // Pattern 5: Use entire QR data if it's just the ID
    if (!student_id) {
      const trimmed = qr_data.trim();
      if (trimmed.length === 7 && /^\d+$/.test(trimmed)) {
        student_id = `${trimmed.substring(0, 2)}-${trimmed.substring(2, 7)}`;
        console.log('[QR Scan] Pattern 5 (7 digit string) matched, formatted to:', student_id);
      } else if (trimmed.length === 8 && trimmed.includes('-')) {
        student_id = trimmed;
        console.log('[QR Scan] Pattern 5 (direct ID) matched:', student_id);
      }
    }
    
    if (!student_id) {
      console.log('[QR Scan] Failed to extract student ID from QR data');
      return res.status(400).json({ 
        message: 'Invalid QR code format. Could not read student ID. Expected format: 23-00174 or [23-00174]',
        received: qr_data
      });
    }
    
    console.log('[QR Scan] Final extracted student_id:', student_id);

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

    // Insert authentication record
    const [authResult] = await db.query(
      `INSERT INTO authentication (student_id, method, auth_status, timestamp)
       VALUES (?, 'QR', 'SUCCESS', ?)`,
      [student_id, now]
    );
    console.log('[QR Scan] Auth record inserted, ID:', authResult.insertId);

    // Insert into entry_exit_logs table
    const [logResult] = await db.query(
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