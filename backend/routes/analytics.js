// routes/analytics.js
const express = require('express');
const router  = express.Router();
const db      = require('../src/db');
const { getTodayPhRange } = require('../src/time');

const formatStudentName = (row) => {
  const lastName = row.last_name?.trim();
  const firstName = row.first_name?.trim();
  const middleName = row.middle_name?.trim();

  if (lastName && (firstName || middleName)) {
    return `${lastName}, ${[firstName, middleName].filter(Boolean).join(' ')}`;
  }

  return [firstName, middleName, lastName].filter(Boolean).join(' ') || row.student_id || 'Unknown';
};

const formatYearLevel = (yearLevel) => {
  const numericLevel = Number(yearLevel);

  if (!Number.isFinite(numericLevel) || numericLevel <= 0) {
    return 'Not Specified';
  }

  const suffix = numericLevel === 1 ? 'st' : numericLevel === 2 ? 'nd' : numericLevel === 3 ? 'rd' : 'th';
  return `${numericLevel}${suffix} Year`;
};

const formatMethod = (method) => {
  if (method === 'FACIAL') return 'Face Recognition';
  if (method === 'MANUAL') return 'Manual Entry';
  if (method === 'QR') return 'QR Code';
  return 'Unknown';
};

const formatActionLabel = (action) => (action === 'EXIT' ? 'Exit' : 'Entrance');

const formatVisitorReason = (reason, otherReason) => {
  if (reason === 'Other' && otherReason?.trim()) {
    return otherReason.trim();
  }

  return reason || 'Not Specified';
};

// ── GET /api/analytics/metrics ────────────────────────────────────────────────
router.get('/metrics', async (req, res) => {
  try {
    console.log('\n📊 [ANALYTICS/METRICS] START - Fetching time range...');
    let dayStart, dayEnd;
    try {
      const timeRange = await getTodayPhRange();
      dayStart = timeRange.dayStart;
      dayEnd = timeRange.dayEnd;
      console.log('[analytics/metrics] ✅ Time range retrieved:', dayStart, '→', dayEnd);
    } catch (timeErr) {
      console.error('[analytics/metrics] ❌ ERROR getting time range:', timeErr.message);
      console.error('[analytics/metrics] Stack:', timeErr.stack);
      return res.status(500).json({ message: 'Failed to get time range: ' + timeErr.message });
    }

    // ── DEBUG: Check all logs in database (no filter) ────────────────────
    console.log('\n🔍 [DEBUG] Checking ALL logs in entry_exit_logs table:');
    const [allLogs] = await db.query(`SELECT student_id, action, log_time FROM entry_exit_logs ORDER BY log_time DESC LIMIT 20`);
    console.log(`   Total recent logs (last 20): ${allLogs.length}`);
    allLogs.forEach(log => console.log(`   → ${log.student_id} | ${log.action} | ${log.log_time}`));

    // ── DEBUG: Intermediate query - see what logs fall in our window ──────
    console.log('\n🔍 [DEBUG] Logs within time window:');
    const [logsInWindow] = await db.query(`
      SELECT student_id, action, log_time
      FROM entry_exit_logs
      WHERE log_time BETWEEN ? AND ?
      ORDER BY log_time DESC
    `, [dayStart, dayEnd]);
    console.log(`   Found ${logsInWindow.length} logs in window [${dayStart} → ${dayEnd}]`);
    logsInWindow.forEach(log => console.log(`   → ${log.student_id} | ${log.action} | ${log.log_time}`));

    // ── DEBUG: Show the subquery result (before filtering) ────────────────
    console.log('\n🔍 [DEBUG] Last action per student (before filtering):');
    const [subqueryResult] = await db.query(`
      SELECT student_id,
        GROUP_CONCAT(action ORDER BY log_time DESC SEPARATOR ',') AS all_actions,
        SUBSTRING_INDEX(
          GROUP_CONCAT(action ORDER BY log_time DESC SEPARATOR ','),
          ',', 1
        ) AS last_action,
        MAX(log_time) AS latest_log_time
      FROM entry_exit_logs
      WHERE log_time BETWEEN ? AND ?
      GROUP BY student_id
      ORDER BY latest_log_time DESC
    `, [dayStart, dayEnd]);
    console.log(`   Found ${subqueryResult.length} students:`);
    subqueryResult.forEach(row => 
      console.log(`   → ${row.student_id} | all_actions=[${row.all_actions}] | last_action=${row.last_action} | latest=${row.latest_log_time}`)
    );

    // ── Students currently on campus (last log today = ENTRY) ────────────
    console.log('\n🔍 [DEBUG] Counting students with last_action = ENTRY:');
    const [onCampusRows] = await db.query(`
      SELECT COUNT(*) AS on_campus
      FROM (
        SELECT student_id,
          SUBSTRING_INDEX(
            GROUP_CONCAT(action ORDER BY log_time DESC SEPARATOR ','),
            ',', 1
          ) AS last_action
        FROM entry_exit_logs
        WHERE log_time BETWEEN ? AND ?
        GROUP BY student_id
      ) latest
      WHERE last_action = 'ENTRY'
    `, [dayStart, dayEnd]);
    console.log(`   Result: ${onCampusRows[0].on_campus} students on campus`);
    console.log('[analytics/metrics] onCampus result:', onCampusRows[0]);

    // ── (Removed - now part of DEBUG section above) ────────────────────

    // ── Today's total entries ────────────────────────────────────────────
    console.log('\n🔍 [DEBUG] Counting ENTRY actions:');
    const [entriesRows] = await db.query(`
      SELECT COUNT(*) AS total
      FROM entry_exit_logs
      WHERE action = 'ENTRY' AND log_time BETWEEN ? AND ?
    `, [dayStart, dayEnd]);
    console.log(`   Total ENTRY actions today: ${entriesRows[0].total}`);
    console.log('[analytics/metrics] totalEntries:', entriesRows[0].total);

    // ── Facial recognition success rate today ────────────────────────────
    console.log('\n🔍 [DEBUG] Facial recognition stats:');
    const [facialRows] = await db.query(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN auth_status = 'SUCCESS' THEN 1 ELSE 0 END) AS success
      FROM authentication
      WHERE method = 'FACIAL' AND timestamp BETWEEN ? AND ?
    `, [dayStart, dayEnd]);
    console.log(`   Total FACIAL attempts: ${facialRows[0].total}, Success: ${facialRows[0].success}`);
    console.log('[analytics/metrics] facial auth:', facialRows[0]);

    const facialTotal     = Number(facialRows[0].total);
    const facialSuccess   = Number(facialRows[0].success);
    const authSuccessRate = facialTotal > 0
      ? Math.round((facialSuccess / facialTotal) * 100) : 0;

    // ── Peak entry hour today ────────────────────────────────────────────
    console.log('\n🔍 [DEBUG] Peak entry hour:');
    const [peakRows] = await db.query(`
      SELECT HOUR(log_time) AS hour, COUNT(*) AS total
      FROM entry_exit_logs
      WHERE action = 'ENTRY' AND log_time BETWEEN ? AND ?
      GROUP BY HOUR(log_time)
      ORDER BY total DESC
      LIMIT 1
    `, [dayStart, dayEnd]);
    console.log(`   Peak hour result: ${peakRows.length > 0 ? `${peakRows[0].hour}:00 with ${peakRows[0].total} entries` : 'none'}`);
    console.log('[analytics/metrics] peakHour:', peakRows[0] ?? 'none');

    const peakHour = peakRows.length > 0
      ? { hour: peakRows[0].hour, total: Number(peakRows[0].total) } : null;

    // ── Total registered active students ────────────────────────────────
    console.log('\n🔍 [DEBUG] Total active students:');
    const [totalStudentsRows] = await db.query(
      `SELECT COUNT(*) AS total FROM students WHERE status != 'Inactive'`
    );
    console.log(`   Total active students: ${totalStudentsRows[0].total}`);
    console.log('[analytics/metrics] totalStudents:', totalStudentsRows[0].total);

    const payload = {
      onCampus:        Number(onCampusRows[0].on_campus),
      totalEntries:    Number(entriesRows[0].total),
      totalStudents:   Number(totalStudentsRows[0].total),
      authSuccessRate,
      peakHour,
    };
    console.log('\n✅ [ANALYTICS/METRICS] FINAL RESPONSE:');
    console.log('   onCampus:', payload.onCampus);
    console.log('   totalEntries:', payload.totalEntries);
    console.log('   totalStudents:', payload.totalStudents);
    console.log('   authSuccessRate:', payload.authSuccessRate);
    console.log('   peakHour:', payload.peakHour);
    console.log('[analytics/metrics] → responding with:', payload);

    res.json(payload);

  } catch (err) {
    console.error('[analytics/metrics] ERROR:', err);
    res.status(500).json({ message: 'Failed to fetch metrics.' });
  }
});

// ── GET /api/analytics/traffic?days=7|30|365 ─────────────────────────────────
router.get('/traffic', async (req, res) => {
  const days = parseInt(req.query.days) || 7;
  console.log('[analytics/traffic] Fetching traffic for days:', days);

  try {
    let rows;

    if (days <= 30) {
      [rows] = await db.query(`
        SELECT
          DATE(log_time) AS period,
          action,
          COUNT(*)       AS total
        FROM entry_exit_logs
        WHERE log_time >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
          AND log_time <= NOW()
        GROUP BY DATE(log_time), action
        ORDER BY period ASC
      `, [days]);
    } else {
      [rows] = await db.query(`
        SELECT
          DATE_FORMAT(log_time, '%Y-%m') AS period,
          action,
          COUNT(*)                       AS total
        FROM entry_exit_logs
        WHERE log_time >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
          AND log_time <= NOW()
        GROUP BY DATE_FORMAT(log_time, '%Y-%m'), action
        ORDER BY period ASC
      `);
    }

    console.log('[analytics/traffic] Raw DB rows:', rows.length);
    rows.forEach(r => console.log('  →', r.period, r.action, r.total));

    // Pivot into { date, entrance, exit }
    const map = new Map();
    rows.forEach(row => {
      const key = row.period instanceof Date
        ? row.period.toISOString().slice(0, 10)
        : String(row.period);
      if (!map.has(key)) map.set(key, { date: key, entrance: 0, exit: 0 });
      if (row.action === 'ENTRY') map.get(key).entrance = Number(row.total);
      if (row.action === 'EXIT')  map.get(key).exit     = Number(row.total);
    });

    // Fill missing days with 0s so chart is always continuous
    if (days <= 30) {
      const filled = new Map();
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        filled.set(key, map.get(key) ?? { date: key, entrance: 0, exit: 0 });
      }
      const result = Array.from(filled.values());
      console.log('[analytics/traffic] → responding with', result.length, 'days');
      return res.json(result);
    }

    const result = Array.from(map.values());
    console.log('[analytics/traffic] → responding with', result.length, 'months');
    res.json(result);

  } catch (err) {
    console.error('[analytics/traffic] ERROR:', err);
    res.status(500).json({ message: 'Failed to fetch traffic data.' });
  }
});

// ── GET /api/analytics/college-distribution ───────────────────────────────────
router.get('/college-distribution', async (req, res) => {
  try {
    console.log('\n📊 [ANALYTICS/COLLEGE-DISTRIBUTION] START - Fetching time range...');
    let dayStart, dayEnd;
    try {
      const timeRange = await getTodayPhRange();
      dayStart = timeRange.dayStart;
      dayEnd = timeRange.dayEnd;
      console.log('[analytics/college-distribution] ✅ Time range retrieved:', dayStart, '→', dayEnd);
    } catch (timeErr) {
      console.error('[analytics/college-distribution] ❌ ERROR getting time range:', timeErr.message);
      console.error('[analytics/college-distribution] Stack:', timeErr.stack);
      return res.status(500).json({ message: 'Failed to get time range: ' + timeErr.message });
    }

    console.log('\n🔍 [DEBUG] Getting students on campus with college info:');
    const [rows] = await db.query(`
      SELECT s.college_department AS name, COUNT(*) AS value
      FROM (
        SELECT student_id,
          SUBSTRING_INDEX(
            GROUP_CONCAT(action ORDER BY log_time DESC SEPARATOR ','),
            ',', 1
          ) AS last_action
        FROM entry_exit_logs
        WHERE log_time BETWEEN ? AND ?
        GROUP BY student_id
      ) latest
      JOIN students s ON s.student_id = latest.student_id
      WHERE latest.last_action = 'ENTRY'
      GROUP BY s.college_department
      ORDER BY value DESC
    `, [dayStart, dayEnd]);

    console.log(`   Result rows: ${rows.length}`);
    rows.forEach(r => console.log(`   → ${r.name}: ${r.value} students`));
    console.log('✅ [ANALYTICS/COLLEGE-DISTRIBUTION] Responding:', rows.map(r => ({ name: r.name, value: Number(r.value) })));

    res.json(rows.map(r => ({ name: r.name, value: Number(r.value) })));

  } catch (err) {
    console.error('[analytics/college-distribution] ERROR:', err);
    res.status(500).json({ message: 'Failed to fetch college distribution.' });
  }
});

// ── GET /api/analytics/departments ───────────────────────────────────────────
router.get('/departments', async (req, res) => {
  try {
    console.log('\n📊 [ANALYTICS/DEPARTMENTS] START - Fetching time range...');
    let dayStart, dayEnd;
    try {
      const timeRange = await getTodayPhRange();
      dayStart = timeRange.dayStart;
      dayEnd = timeRange.dayEnd;
      console.log('[analytics/departments] ✅ Time range retrieved:', dayStart, '→', dayEnd);
    } catch (timeErr) {
      console.error('[analytics/departments] ❌ ERROR getting time range:', timeErr.message);
      console.error('[analytics/departments] Stack:', timeErr.stack);
      return res.status(500).json({ message: 'Failed to get time range: ' + timeErr.message });
    }

    console.log('\n🔍 [DEBUG] Getting on-campus students by department:');
    const [onCampusRows] = await db.query(`
      SELECT latest.student_id, s.college_department
      FROM (
        SELECT student_id,
          SUBSTRING_INDEX(
            GROUP_CONCAT(action ORDER BY log_time DESC SEPARATOR ','),
            ',', 1
          ) AS last_action
        FROM entry_exit_logs
        WHERE log_time BETWEEN ? AND ?
        GROUP BY student_id
      ) latest
      JOIN students s ON s.student_id = latest.student_id
      WHERE latest.last_action = 'ENTRY'
    `, [dayStart, dayEnd]);

    console.log(`   On-campus students found: ${onCampusRows.length}`);
    onCampusRows.forEach(r => console.log(`   → ${r.student_id} | ${r.college_department}`));

    console.log('\n🔍 [DEBUG] Getting total students per department:');
    const [totalRows] = await db.query(`
      SELECT college_department, COUNT(*) AS total
      FROM students
      WHERE status != 'Inactive'
      GROUP BY college_department
    `);
    console.log(`   Total departments: ${totalRows.length}`);
    const totalMap = new Map(totalRows.map(r => [r.college_department, Number(r.total)]));

    const deptMap = new Map();
    onCampusRows.forEach(r => {
      const dept = r.college_department;
      deptMap.set(dept, (deptMap.get(dept) || 0) + 1);
    });

    const totalOnCampus = Array.from(deptMap.values()).reduce((s, v) => s + v, 0);

    const data = Array.from(deptMap, ([dept, count]) => ({
      fullCollegeName: dept,
      collegeName:     dept,
      presenceNow:     count,
      totalStudents:   totalMap.get(dept) ?? 0,
      percentage:      totalOnCampus > 0 ? Math.round((count / totalOnCampus) * 100) : 0,
    })).sort((a, b) => b.presenceNow - a.presenceNow);

    console.log(`\n✅ [ANALYTICS/DEPARTMENTS] FINAL RESPONSE (${data.length} departments):`);
    data.forEach(d => console.log(`   → ${d.collegeName}: ${d.presenceNow}/${d.totalStudents} (${d.percentage}%)`));
    res.json(data);

  } catch (err) {
    console.error('[analytics/departments] ERROR:', err);
    res.status(500).json({ message: 'Failed to fetch department data.' });
  }
});

// ── GET /api/analytics/auth-methods ──────────────────────────────────────────
router.get('/auth-methods', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        method,
        COUNT(*) AS attempts,
        SUM(CASE WHEN auth_status = 'SUCCESS' THEN 1 ELSE 0 END) AS success
      FROM authentication
      GROUP BY method
      ORDER BY attempts DESC
    `);

    console.log('[analytics/auth-methods] Raw rows:', rows.length);
    rows.forEach(r => console.log('  →', r.method, 'attempts:', r.attempts, 'success:', r.success));

    const data = rows.map((r, i) => ({
      id:          i + 1,
      method:      r.method === 'FACIAL' ? 'Facial Recognition'
                 : r.method === 'MANUAL' ? 'Manual Input' : 'QR Scan',
      attempts:    Number(r.attempts),
      success:     Number(r.success),
      successRate: Number(r.attempts) > 0
        ? `${Math.round((Number(r.success) / Number(r.attempts)) * 100)}% (${r.success}/${r.attempts})`
        : '0%',
    }));

    res.json(data);

  } catch (err) {
    console.error('[analytics/auth-methods] ERROR:', err);
    res.status(500).json({ message: 'Failed to fetch auth method data.' });
  }
});

// ── GET /api/analytics/records ───────────────────────────────────────────────
router.get('/records', async (req, res) => {
  try {
    const [studentRows] = await db.query(`
      SELECT
        eel.log_id,
        eel.student_id,
        eel.action,
        eel.log_time,
        s.first_name,
        s.last_name,
        s.middle_name,
        s.college_department,
        s.year_level,
        a.method
      FROM entry_exit_logs eel
      LEFT JOIN students s ON s.student_id = eel.student_id
      LEFT JOIN authentication a ON a.auth_id = eel.auth_id
      ORDER BY eel.log_time DESC, eel.log_id DESC
    `);

    const [visitorRows] = await db.query(`
      SELECT
        visitor_id,
        full_name,
        email,
        reason,
        other_reason,
        action,
        log_time,
        qr_token
      FROM visitor_logs
      ORDER BY log_time DESC, visitor_id DESC
    `);

    const students = studentRows.map((row) => ({
      id: row.log_id,
      timestamp: row.log_time,
      studentId: row.student_id,
      name: formatStudentName(row),
      collegeDept: row.college_department || 'Not Specified',
      yearLevel: formatYearLevel(row.year_level),
      action: row.action,
      actionLabel: formatActionLabel(row.action),
      method: formatMethod(row.method),
      methodCode: row.method || 'UNKNOWN',
    }));

    const visitors = visitorRows.map((row) => ({
      id: row.visitor_id,
      timestamp: row.log_time,
      visitorId: row.visitor_id,
      name: row.full_name || 'Unknown',
      email: row.email || 'Not Specified',
      reason: row.reason || 'Not Specified',
      otherReason: row.other_reason || '',
      visitReason: formatVisitorReason(row.reason, row.other_reason),
      action: row.action,
      actionLabel: formatActionLabel(row.action),
      qrToken: row.qr_token || '',
    }));

    res.json({
      generatedAt: new Date().toISOString(),
      studentCount: students.length,
      visitorCount: visitors.length,
      students,
      visitors,
    });
  } catch (err) {
    console.error('[analytics/records] ERROR:', err);
    res.status(500).json({ message: 'Failed to fetch entry and exit records.' });
  }
});

// ── GET /api/analytics/report?from=YYYY-MM-DD&to=YYYY-MM-DD&dept= ────────────
router.get('/report', async (req, res) => {
  try {
    const { from, to, dept } = req.query;
    const { dayStart, dayEnd } = await getTodayPhRange();

    const rangeStart = from ? `${from} 00:00:00` : dayStart;
    const rangeEnd   = to   ? `${to} 23:59:59`   : dayEnd;

    console.log('[analytics/report] Range:', rangeStart, '→', rangeEnd, '| dept:', dept ?? 'all');

    let logsQuery = `
      SELECT
        eel.log_id, eel.student_id, eel.action, eel.log_time,
        s.first_name, s.last_name, s.college_department,
        s.program_name, s.year_level,
        a.method, a.auth_status, a.accuracy
      FROM entry_exit_logs eel
      JOIN students s  ON s.student_id = eel.student_id
      JOIN authentication a ON a.auth_id = eel.auth_id
      WHERE eel.log_time BETWEEN ? AND ?
    `;
    const params = [rangeStart, rangeEnd];

    if (dept) { logsQuery += ' AND s.college_department = ?'; params.push(dept); }
    logsQuery += ' ORDER BY eel.log_time DESC';

    const [logRows]    = await db.query(logsQuery, params);
    const [deptTotals] = await db.query(
      `SELECT college_department, COUNT(*) AS total FROM students WHERE status != 'Inactive' GROUP BY college_department`
    );

    console.log('[analytics/report] logRows found:', logRows.length);

    const deptTotalMap   = new Map(deptTotals.map(r => [r.college_department, Number(r.total)]));
    const uniqueStudents = new Set(logRows.map(r => r.student_id));
    const deptMap    = new Map();
    const methodMap  = new Map();
    const trafficMap = new Map();

    logRows.forEach(r => {
      const d = r.college_department;
      deptMap.set(d, (deptMap.get(d) || 0) + 1);

      const m = r.method === 'FACIAL' ? 'Facial Recognition'
              : r.method === 'MANUAL' ? 'Manual Input' : 'QR Scan';
      methodMap.set(m, (methodMap.get(m) || 0) + 1);

      const key = new Date(r.log_time).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
      if (!trafficMap.has(key)) trafficMap.set(key, { date: key, entrance: 0, exit: 0 });
      if (r.action === 'ENTRY') trafficMap.get(key).entrance++;
      if (r.action === 'EXIT')  trafficMap.get(key).exit++;
    });

    const totalLogs = logRows.length;

    const collegeData = Array.from(deptMap, ([name, count]) => ({
      name,
      count,
      totalStudents: deptTotalMap.get(name) ?? 0,
      percentage: totalLogs > 0 ? Math.round((count / totalLogs) * 100) : 0,
    })).sort((a, b) => b.count - a.count);

    const methodData = Array.from(methodMap, ([name, count]) => ({
      name, count,
      percentage: totalLogs > 0 ? Math.round((count / totalLogs) * 100) : 0,
      total: totalLogs,
    }));

    const trafficChartData = Array.from(trafficMap.values());
    const highestDay = trafficChartData.length
      ? trafficChartData.reduce((a, b) => b.entrance > a.entrance ? b : a) : null;
    const lowestDay  = trafficChartData.length
      ? trafficChartData.reduce((a, b) => b.entrance < a.entrance ? b : a) : null;

    const studentLogs = logRows.map((r, i) => ({
      no:         i + 1,
      dateTime:   new Date(r.log_time).toLocaleString('en-PH', { hour12: true }),
      studentId:  r.student_id,
      name:       `${r.last_name}, ${r.first_name}`,
      department: r.college_department,
      program:    r.program_name || 'N/A',
      yearLevel:  r.year_level,
      action:     r.action === 'ENTRY' ? 'Entrance' : 'Exit',
      method:     r.method === 'FACIAL' ? 'Facial Recognition'
                : r.method === 'MANUAL' ? 'Manual Input' : 'QR Scan',
      accuracy:   r.accuracy ? `${r.accuracy}%` : 'N/A',
    }));

    res.json({
      generatedAt:    new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' }),
      dateRange:      `${rangeStart.slice(0,10)} to ${rangeEnd.slice(0,10)}`,
      totalStudents:  uniqueStudents.size,
      totalLogs,
      collegeData,
      methodData,
      trafficChartData,
      trafficData: {
        highest: highestDay ? `${highestDay.date} (${highestDay.entrance} entries)` : 'N/A',
        lowest:  lowestDay  ? `${lowestDay.date} (${lowestDay.entrance} entries)` : 'N/A',
      },
      studentLogs,
    });

  } catch (err) {
    console.error('[analytics/report] ERROR:', err);
    res.status(500).json({ message: 'Failed to generate report data.' });
  }
});

module.exports = router;