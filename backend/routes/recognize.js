const express = require("express");
const router = express.Router();
const axios = require("axios");
const pool = require("../src/db");
const { cosineSimilarity } = require("../src/utils");

const SIMILARITY_THRESHOLD = 0.55;

router.post("/recognize", async (req, res) => {
  try {
    const { image } = req.body;

    // Step 1: Send image to FastAPI for embedding
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

    const authTime = new Date().toLocaleTimeString();

    if (!matchedStudent) {
      // Step 4a: Record failed authentication
      const [authResult] = await pool.query(
        "INSERT INTO authentication (method, auth_status, accuracy, duration, timestamp) VALUES (?, ?, ?, ?, ?)",
        ["Facial Recognition", "Failed", maxSimilarity, 0, authTime]
      );

      console.log("Authentication failed");

      return res.json({
        detected: true,
        authenticated: false,
        time: authTime,
      });
    }

    // Step 4b: Record successful authentication
    const [authResult] = await pool.query(
      "INSERT INTO authentication (student_id, method, auth_status, accuracy, duration, timestamp) VALUES (?, ?, ?, ?, ?, ?)",
      [matchedStudent, "Facial Recognition", "Success", maxSimilarity, 0, authTime]
    );

    const auth_id = authResult.insertId;

    // Step 5: Determine Entrance/Exit
    const [lastLogRows] = await pool.query(
      "SELECT action FROM entry_exit_logs WHERE student_id = ? ORDER BY log_time DESC LIMIT 1",
      [matchedStudent]
    );

    let action = "Entrance"; // default
    if (lastLogRows.length > 0 && lastLogRows[0].action === "Entrance") {
      action = "Exit";
    }

    // Step 6: Store entry/exit log
    await pool.query(
      "INSERT INTO entry_exit_logs (student_id, auth_id, action, log_time) VALUES (?, ?, ?, ?)",
      [matchedStudent, auth_id, action, authTime]
    );

    console.log(`Student ${matchedStudent} authenticated. Action: ${action}`);

    // Step 7: Respond to React
    return res.json({
      detected: true,
      authenticated: true,
      name: matchedStudent,
      department: "BSIT",
      time: authTime,
      log_type: action,
    });

  } catch (err) {
    console.error("Recognition Error:", err.message);
    return res.json({ detected: false, authenticated: false });
  }
});

module.exports = router;