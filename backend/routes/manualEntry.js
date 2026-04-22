// manualEntry.js
const express = require('express');
const router = express.Router();
const db = require('../src/db');
const { getTodayPhRange } = require('../src/time');

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
    // Query to get student by ID
    const query = 'SELECT * FROM students WHERE student_id = ?';
    const [rows] = await db.query(query, [student_id.trim()]);
    
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Student not found. Please check your ID.' });
    }

    const student = rows[0];
    const fullName = `${student.last_name}, ${student.first_name}`;
    
    // Get the year_level directly from database (this is the number: 1, 2, 3, 4, 5, 6)
    const yearLevelNumber = student.year_level;
    
    console.log('Student found in database:');
    console.log('  - Student ID:', student.student_id);
    console.log('  - Name:', fullName);
    console.log('  - Year Level (from DB):', yearLevelNumber);
    console.log('  - Department:', student.college_department);
    console.log('  - Program:', student.program_name);

    // Get PH time range
    const { now, dayStart, dayEnd } = await getTodayPhRange(db);

    // Check last action today
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
    console.log('Entry/Exit log record inserted');

    // Prepare response - send the EXACT year_level from database
    const response = {
      success: true,
      message: `${mode === 'ENTRY' ? 'Entry' : 'Exit'} recorded for ${fullName}.`,
      action: mode,
      student: fullName,
      student_id: student.student_id,
      department: student.college_department || "Not Specified",
      year_level: yearLevelNumber,  // This is the NUMBER from database (1,2,3,4,5,6)
      course: student.program_name || "Not Specified",
      gender: "Not Specified",
      status: student.status || "Not Specified"
    };
    
    console.log('Sending response with year_level:', yearLevelNumber);
    console.log('=== MANUAL ENTRY COMPLETE ===');
    
    return res.json(response);

  } catch (err) {
    console.error('=== MANUAL ENTRY ERROR ===', err);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.'
    });
  }
});

module.exports = router;