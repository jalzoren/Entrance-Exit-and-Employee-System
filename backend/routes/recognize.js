// routes/recognize.js
const express = require("express");
const router = express.Router();
const axios = require("axios");
const pool = require("../src/db"); // MySQL connection
const { cosineSimilarity } = require("../src/utils"); // your similarity helper

// Similarity threshold (adjustable)
const SIMILARITY_THRESHOLD = 0.55;

router.post("/recognize", async (req, res) => {
  try {
    const { image } = req.body;

    // Step 1: Send image to Python FastAPI for embedding
    const response = await axios.post("http://127.0.0.1:8000/generate-embedding", {
      images: [image],
    });

    const data = response.data;

    if (!data.success || data.embeddings.length === 0) {
      console.log("No faces detected or embedding generation failed");
      return res.json({ detected: false, authenticated: false });
    }

    const capturedEmbedding = data.embeddings[0];
    console.log("Captured embedding quality:", data.quality_scores[0]);

    // Step 2: Fetch all stored embeddings
    const [rows] = await pool.query(
      "SELECT student_id, face_embedding, face_position FROM student_face_embeddings"
    );

    console.log("Number of stored embeddings:", rows.length);

    let matchedStudent = null;
    let matchedLogType = null;
    let maxSimilarity = 0;

    // Step 3: Compare embeddings
    for (const row of rows) {
      if (!row.face_embedding) continue;

      const storedEmbedding = JSON.parse(row.face_embedding);
      const sim = cosineSimilarity(capturedEmbedding, storedEmbedding);

      console.log(`Comparing to student ${row.student_id} (${row.face_position || "unknown"}), similarity: ${sim.toFixed(3)}`);

      if (sim > SIMILARITY_THRESHOLD && sim > maxSimilarity) {
        maxSimilarity = sim;
        matchedStudent = row.student_id;
      }
    }

    if (!matchedStudent) {
      console.log("No matching student found.");
      return res.json({
        detected: true,
        authenticated: false,
        time: new Date().toLocaleTimeString(),
      });
    }

    // Step 4: Determine Entrance/Exit
    const [lastLogRows] = await pool.query(
      "SELECT log_type FROM attendance_logs WHERE student_id = ? ORDER BY log_time DESC LIMIT 1",
      [matchedStudent]
    );

    let logType = "Entrance"; // default
    if (lastLogRows.length > 0 && lastLogRows[0].log_type === "Entrance") {
      logType = "Exit";
    }

    // Step 5: Store attendance log
    await pool.query(
      "INSERT INTO attendance_logs (student_id, log_type) VALUES (?, ?)",
      [matchedStudent, logType]
    );

    console.log(`Student ${matchedStudent} authenticated. LogType: ${logType}`);

    // Step 6: Respond to React UI
    return res.json({
      detected: true,
      authenticated: true,
      name: matchedStudent,
      department: "BSIT", // optional: fetch real department
      time: new Date().toLocaleTimeString(),
      log_type: logType,
    });
  } catch (err) {
    console.error("Recognition Error:", err.message);
    return res.json({ detected: false, authenticated: false });
  }
});

module.exports = router;