const express = require("express");
const router = express.Router();
const axios = require("axios");
const pool = require("../src/db"); // MySQL connection
const { cosineSimilarity } = require("../src/utils"); // helper

router.post("/recognize", async (req, res) => {
  try {
    const { image } = req.body;

    // -------------------------
    // Step 1: Send image to Python FastAPI
    // -------------------------
    const pyResponse = await axios.post("http://127.0.0.1:8000/generate-embedding", {
      images: [image]
    });

    const data = pyResponse.data;

    if (!data.success || data.embeddings.length === 0) {
      console.log("No faces detected or embedding failed");
      return res.json({ detected: false, authenticated: false });
    }

    const capturedEmbedding = data.embeddings[0];
    console.log("Captured embedding quality:", data.quality_scores[0]);

    // -------------------------
    // Step 2: Fetch all stored embeddings
    // -------------------------
    const [rows] = await pool.query(
      "SELECT student_id, face_embedding, face_position FROM student_face_embeddings"
    );

    console.log("Number of stored embeddings:", rows.length);

    // -------------------------
    // Step 3: Compare embeddings
    // -------------------------
    let matchedStudent = null;
    let maxSimilarity = 0;
    let matchedPosition = null;

    for (const row of rows) {
      const storedEmbedding = JSON.parse(row.face_embedding);
      const sim = cosineSimilarity(capturedEmbedding, storedEmbedding);

      console.log(`Comparing to student ${row.student_id} (${row.face_position}), similarity: ${sim.toFixed(3)}`);

      if (sim > 0.75 && sim > maxSimilarity) {
        maxSimilarity = sim;
        matchedStudent = row.student_id;
        matchedPosition = row.face_position;
      }
    }

    if (!matchedStudent) {
      console.log("No matching student found.");
      return res.json({
        detected: true,
        authenticated: false,
        time: new Date().toLocaleTimeString()
      });
    }

    // -------------------------
    // Step 4: Determine ENTRY/EXIT
    // -------------------------
    const [lastLogRows] = await pool.query(
      "SELECT action FROM entry_exit_logs WHERE student_id = ? ORDER BY log_time DESC LIMIT 1",
      [matchedStudent]
    );

    let action = "ENTRY"; // default
    if (lastLogRows.length > 0 && lastLogRows[0].action === "ENTRY") {
      action = "EXIT";
    }

    const now = new Date(); // proper timestamp
    console.log(`Student ${matchedStudent} authenticated. Action: ${action}`);

    // -------------------------
    // Step 5: Insert into entry_exit_logs
    // -------------------------
    const [authInsert] = await pool.query(
      "INSERT INTO authentication (student_id, method, auth_status, accuracy, duration, timestamp) VALUES (?, 'FACIAL', 'SUCCESS', ?, ?, NOW())",
      [matchedStudent, (maxSimilarity*100).toFixed(2), 0, now]
    );

    const auth_id = authInsert.insertId;

    await pool.query(
      "INSERT INTO entry_exit_logs (student_id, auth_id, action, log_time) VALUES (?, ?, ?, NOW())",
      [matchedStudent, auth_id, action, now]
    );

    // -------------------------
    // Step 6: Respond to React UI
    // -------------------------
    return res.json({
      detected: true,
      authenticated: true,
      name: matchedStudent,
      department: "BSIT", // fetch from students table if needed
      time: now.toLocaleTimeString(),
      log_type: action
    });

  } catch (err) {
    console.error("Recognition Error:", err.message);
    return res.json({ detected: false, authenticated: false });
  }
});

module.exports = router;