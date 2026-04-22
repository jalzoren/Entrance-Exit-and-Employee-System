// systemSettings.js
const express = require('express');
const router  = express.Router();
const db      = require('../src/db');
const { getPhTime } = require('../src/time');

// ── Helper: get all settings as a flat object ─────────────────────────────────
async function getAllSettings() {
  const [rows] = await db.query('SELECT `key`, `value` FROM system_settings');
  return rows.reduce((acc, r) => { acc[r.key] = r.value; return acc; }, {});
}

// ── GET /api/settings ─────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const settings = await getAllSettings();
    res.json(settings);
  } catch (err) {
    console.error('[settings GET]', err);
    res.status(500).json({ message: 'Failed to load settings.' });
  }
});

// ── PUT /api/settings ─────────────────────────────────────────────────────────
// Body: { key: value, key: value, ... }
router.put('/', async (req, res) => {
  const updates = req.body;
  if (!updates || typeof updates !== 'object')
    return res.status(400).json({ message: 'Invalid settings payload.' });

  try {
    // Use INSERT ... ON DUPLICATE KEY UPDATE for upsert
    const entries = Object.entries(updates);
    for (const [key, value] of entries) {
      await db.query(
        `INSERT INTO system_settings (\`key\`, value) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE value = VALUES(value)`,
        [key, String(value)]
      );
    }
    res.json({ message: 'Settings saved successfully.' });
  } catch (err) {
    console.error('[settings PUT]', err);
    res.status(500).json({ message: 'Failed to save settings.' });
  }
});

// ── GET /api/settings/gate-status ─────────────────────────────────────────────
// Returns whether current PH time is within entry/exit windows
router.get('/gate-status', async (req, res) => {
  try {
    const settings = await getAllSettings();
    const now      = await getPhTime();

    const hhmm = (d) =>
      `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;

    const currentTime = hhmm(now);

    const entryOpen = currentTime >= settings.gate_entry_start &&
                      currentTime <= settings.gate_entry_end;
    const exitOpen  = currentTime >= settings.gate_exit_start  &&
                      currentTime <= settings.gate_exit_end;

    res.json({
      currentTime,
      entryOpen,
      exitOpen,
      entryWindow: `${settings.gate_entry_start} – ${settings.gate_entry_end}`,
      exitWindow:  `${settings.gate_exit_start} – ${settings.gate_exit_end}`,
      blockOutside: settings.block_outside_window === 'true',
    });
  } catch (err) {
    console.error('[gate-status]', err);
    res.status(500).json({ message: 'Failed to get gate status.' });
  }
});

// ── GET /api/settings/academic-year ──────────────────────────────────────────
// Returns current academic year, semester, and whether promotion is due
router.get('/academic-year', async (req, res) => {
  try {
    const settings = await getAllSettings();
    const now      = await getPhTime();
    const today    = now.toISOString().slice(0, 10); // YYYY-MM-DD

    const sem1Start = settings.sem1_start;
    const sem1End   = settings.sem1_end;
    const sem2Start = settings.sem2_start;
    const sem2End   = settings.sem2_end;

    // Auto-detect current semester based on today's date
    let currentSemester = null;
    if (today >= sem1Start && today <= sem1End) currentSemester = '1';
    else if (today >= sem2Start && today <= sem2End) currentSemester = '2';
    else currentSemester = 'Break'; // between semesters

    // Check if promotion is due:
    // Promotion happens at the end of 2nd semester for Regular students
    const promotionDue = today > sem2End && settings.semester === '2';

    res.json({
      schoolYear:       `${settings.school_year_start}-${settings.school_year_end}`,
      semester:         settings.semester,         // stored/configured
      detectedSemester: currentSemester,           // auto-detected from date
      sem1: { start: sem1Start, end: sem1End },
      sem2: { start: sem2Start, end: sem2End },
      promotionDue,
      today,
    });
  } catch (err) {
    console.error('[academic-year]', err);
    res.status(500).json({ message: 'Failed to get academic year info.' });
  }
});

// ── POST /api/settings/promote-students ──────────────────────────────────────
// Increments year_level for all Regular students (run at end of school year)
router.post('/promote-students', async (req, res) => {
  try {
    // Only promote Regular students who are not already in Year 4+
    const [result] = await db.query(`
      UPDATE students
      SET
        year_level = year_level + 1,
        updated_at = NOW()
      WHERE status = 'Regular'
        AND year_level < 4
    `);

    // Graduate 4th year Regular students
    const [graduate] = await db.query(`
      UPDATE students
      SET status = 'Graduated', updated_at = NOW()
      WHERE status = 'Regular' AND year_level = 4
    `);

    console.log(`[Promotion] Promoted: ${result.affectedRows} | Graduated: ${graduate.affectedRows}`);

    res.json({
      message:   'Student promotion complete.',
      promoted:  result.affectedRows,
      graduated: graduate.affectedRows,
    });
  } catch (err) {
    console.error('[promote-students]', err);
    res.status(500).json({ message: 'Promotion failed.' });
  }
});

module.exports = router;