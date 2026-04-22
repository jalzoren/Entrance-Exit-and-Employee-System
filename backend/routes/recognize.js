// routes/recognize.js
const express = require("express");
const router  = express.Router();
const axios   = require("axios");
const pool    = require("../src/db");
const { cosineSimilarity }        = require("../src/utils");
const { getTodayPhRange, getPhTime } = require("../src/time"); // ← added getPhTime

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: check if the gate is open for the given mode
// Uses pool (not db) — consistent with the rest of this file
// ─────────────────────────────────────────────────────────────────────────────
async function isGateOpen(mode) {
  const startKey = mode === 'ENTRY' ? 'gate_entry_start' : 'gate_exit_start';
  const endKey   = mode === 'ENTRY' ? 'gate_entry_end'   : 'gate_exit_end';

  const [rows] = await pool.query(                            // ← pool, not db
    "SELECT `key`, value FROM system_settings WHERE `key` IN (?, ?, ?)",
    [startKey, endKey, 'block_outside_window']
  );

  const s = rows.reduce((acc, r) => { acc[r.key] = r.value; return acc; }, {});

  // If enforcement is disabled, always allow
  if (s.block_outside_window !== 'true') return true;

  const now  = await getPhTime(pool);                         // ← getPhTime now imported
  const hhmm = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

  const start = mode === 'ENTRY' ? s.gate_entry_start : s.gate_exit_start;
  const end   = mode === 'ENTRY' ? s.gate_entry_end   : s.gate_exit_end;

  return hhmm >= start && hhmm <= end;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/recognize
// ─────────────────────────────────────────────────────────────────────────────
router.post("/recognize", async (req, res) => {
  try {
    const { image, mode } = req.body;

    // ── Gate check (moved inside handler where req/res are available) ──
    const open = await isGateOpen(mode);                      // ← inside handler
    if (!open) {
      return res.status(403).json({
        recognized: false,
        message: `The ${mode === 'ENTRY' ? 'entry' : 'exit'} gate is currently closed.`,
        action:  'GATE_CLOSED',
      });
    }

    // ── Step 1: Send image to Python FastAPI ──────────────────────────
    const pyResponse = await axios.post("http://127.0.0.1:8000/generate-embedding", {
      images: [image]
    });

    const data = pyResponse.data;

    if (!data.success || data.embeddings.length === 0) {
      console.log("No faces detected or embedding failed");
      return res.json({ recognized: false });
    }

    const capturedEmbedding = data.embeddings[0];
    console.log("Captured embedding quality:", data.quality_scores[0]);

    // ── Step 2: Fetch all stored embeddings ───────────────────────────
    const [rows] = await pool.query(
      "SELECT student_id, face_embedding, face_position FROM student_face_embeddings"
    );
    console.log("Number of stored embeddings:", rows.length);

    // ── Step 3: Compare embeddings ────────────────────────────────────
    let matchedStudent = null;
    let maxSimilarity  = 0;

    for (const row of rows) {
      const storedEmbedding = JSON.parse(row.face_embedding);
      const sim = cosineSimilarity(capturedEmbedding, storedEmbedding);
      console.log(`Comparing student ${row.student_id} (${row.face_position}): ${sim.toFixed(3)}`);

      if (sim > 0.75 && sim > maxSimilarity) {
        maxSimilarity  = sim;
        matchedStudent = row.student_id;
      }
    }

    if (!matchedStudent) {
      console.log("No matching student found.");
      return res.json({ recognized: false });
    }

    // ── Step 4: Get server-authoritative PH time ──────────────────────
    const { now, dayStart, dayEnd } = await getTodayPhRange(pool);
    console.log('[recognize] PH now:', now.toString());
    console.log('[recognize] Window:', dayStart, '→', dayEnd);

    // ── Step 5: Get last log for today (timezone-safe BETWEEN) ────────
    const [lastLogRows] = await pool.query(
      `SELECT action FROM entry_exit_logs
       WHERE student_id = ?
         AND log_time BETWEEN ? AND ?
       ORDER BY log_time DESC
       LIMIT 1`,
      [matchedStudent, dayStart, dayEnd]
    );

    const lastAction = lastLogRows.length ? lastLogRows[0].action : null;
    console.log(`[recognize] student ${matchedStudent} lastAction today: ${lastAction ?? 'none'}`);

    // ── Step 6: Validate against mode ────────────────────────────────
    if (mode === 'ENTRY' && lastAction === 'ENTRY') {
      return res.json({ recognized: true, validated: false, message: `You've already entered the school.` });
    }
    if (mode === 'EXIT' && lastAction === 'EXIT') {
      return res.json({ recognized: true, validated: false, message: `You've already exited the school.` });
    }
    if (mode === 'EXIT' && !lastAction) {
      return res.json({ recognized: true, validated: false, message: `No entry record found for today. Please enter first.` });
    }

    // ── Step 7: Determine action ──────────────────────────────────────
    const action = mode || (lastAction === 'ENTRY' ? 'EXIT' : 'ENTRY');
    console.log(`Student ${matchedStudent} authenticated. Action: ${action}`);

    // ── Step 8: Fetch student details ─────────────────────────────────
    const [studentRows] = await pool.query(
      'SELECT first_name, last_name, college_department FROM students WHERE student_id = ?',
      [matchedStudent]
    );

    const studentInfo = studentRows[0] ?? {};
    const fullName    = studentInfo.first_name
      ? `${studentInfo.last_name}, ${studentInfo.first_name}`
      : matchedStudent;

    // ── Step 9: Insert authentication record ──────────────────────────
    const [authInsert] = await pool.query(
      `INSERT INTO authentication (student_id, method, auth_status, accuracy, duration, timestamp)
       VALUES (?, 'FACIAL', 'SUCCESS', ?, ?, ?)`,
      [matchedStudent, (maxSimilarity * 100).toFixed(2), 0, now]
    );

    // ── Step 10: Insert entry/exit log ────────────────────────────────
    await pool.query(
      `INSERT INTO entry_exit_logs (student_id, auth_id, action, log_time)
       VALUES (?, ?, ?, ?)`,
      [matchedStudent, authInsert.insertId, action, now]
    );

    // ── Step 11: Respond to React UI ──────────────────────────────────
    return res.json({
      recognized:  true,
      validated:   true,
      student:     fullName,
      student_id:  matchedStudent,
      department:  studentInfo.college_department ?? 'N/A',
      action,
    });

  } catch (err) {
    console.error("Recognition Error:", err.message);
    return res.json({ recognized: false });
  }
});

module.exports = router;