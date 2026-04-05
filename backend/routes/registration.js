// routes/registration.js
const express = require("express");
const axios = require("axios");
const db = require("../src/db");

const router = express.Router();

/* --------------------------------------------------
FACE VALIDATION
-------------------------------------------------- */

router.post("/validate-face", async (req, res) => {
  try {

    const { images } = req.body;

    if (!images || images.length !== 5) {
      return res.status(400).json({
        error: "Exactly 5 images required"
      });
    }

    console.log("Images received:", images.length);

    const response = await axios.post(
      "http://127.0.0.1:8000/generate-embedding",
      { images }
    );

    console.log("Python response:", response.data);

    const embeddings =
      response.data.embeddings ||
      (response.data.embedding ? [response.data.embedding] : null);

    if (
      !response.data ||
      response.data.success !== true ||
      !embeddings ||
      embeddings.length === 0
    ) {
      return res.status(400).json({
        error: "Face not detected properly. Please retake photos."
      });
    }

    res.json({
      message: "Face validated successfully",
      embeddings_detected: embeddings.length
    });

  } catch (error) {

    console.error("VALIDATION ERROR:", error);

    res.status(500).json({
      error: "Face validation failed"
    });

  }
});

/* --------------------------------------------------
VALIDATE FRAME
-------------------------------------------------- */

router.post("/validate-frame", async (req, res) => {
  try {
    const { image, expected_pose } = req.body;

    if (!image) {
      return res.status(400).json({ error: "image is required" });
    }

    // Forward to Python face service
    const response = await axios.post(
      "http://127.0.0.1:8000/validate-frame",
      {
        image,
        expected_pose: expected_pose || "center",
      },
      {
        // Tight timeout — this endpoint must be fast.
        // If Python takes >1.5s something is wrong; don't block the UI.
        timeout: 1500,
      }
    );
 
    // Pass Python's response straight through to the frontend
    // Shape: { face_detected, glasses_detected, pose_ok, pose_label, message }
    res.json(response.data);
 
  } catch (error) {
    // On timeout or Python error, return a safe "not ready" response.
    // The frontend handles this gracefully — it just keeps the check as failed.
    console.error("validate-frame error:", error.message);
    res.json({
      face_detected:    false,
      glasses_detected: false,
      pose_ok:          false,
      pose_label:       "error",
      message:          "Validation service unavailable",
    });
  }
});


/* --------------------------------------------------
REGISTER STUDENT
-------------------------------------------------- */

router.post("/register", async (req, res) => {

  let connection;

  try {

    connection = await db.getConnection();
    await connection.beginTransaction();

    const {
      student_id,
      first_name,
      last_name,
      middle_name,
      extension_name,   
      college_department,
      program,
      year_level,
      status,
      email,       
      images
    } = req.body;

    if (!student_id || !images || images.length !== 5) {
      throw new Error("Missing required student data or images");
    }

    console.log("Registering student:", student_id);

    /* -----------------------------
       SAVE STUDENT INFO
    ----------------------------- */

    await connection.query(
      `INSERT INTO students
      (student_id, email, first_name, last_name, middle_name, extension_name,
        college_department, program_name, year_level, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        student_id,
        email?.trim().toLowerCase() ?? null,   // emails are lowercase by convention
        first_name?.trim().toUpperCase(),
        last_name?.trim().toUpperCase(),
        middle_name?.trim().toUpperCase() || null,
        extension_name?.trim() || null,
        college_department,
        program || null,
        year_level,
        status
      ]
    );

    console.log("Student info saved");

    /* -----------------------------
       CALL PYTHON API
    ----------------------------- */

    const response = await axios.post(
      "http://127.0.0.1:8000/generate-embedding",
      { images }
    );

    console.log("Python response:", response.data);

    const embeddings =
      response.data.embeddings ||
      (response.data.embedding ? [response.data.embedding] : null);

    console.log("Total embeddings received:", embeddings ? embeddings.length : 0);

    /* -----------------------------
       VALIDATE EMBEDDINGS
    ----------------------------- */

    if (!response.data.success) {
      throw new Error("Face detection failed");
    }

    if (!embeddings || embeddings.length !== 5) {
      throw new Error("Expected 5 face embeddings");
    }

    /* -----------------------------
       FACE POSITIONS
    ----------------------------- */

    const positions = [
      "center",
      "left",
      "right",
      "up",
      "down"
    ];

    /* -----------------------------
       SAVE ALL EMBEDDINGS
    ----------------------------- */

    for (let i = 0; i < embeddings.length; i++) {

      const emb = embeddings[i];

      if (!emb || emb.length !== 512) {
        throw new Error("Invalid embedding size");
      }

      await connection.query(
        `INSERT INTO student_face_embeddings
         (student_id, face_position, face_embedding)
         VALUES (?, ?, ?)`,
        [
          student_id,
          positions[i],
          JSON.stringify(emb)
        ]
      );

    }

    console.log("All 5 face embeddings saved");

    await connection.commit();

    res.json({
      message: "Student registered successfully"
    });

  } catch (err) {

    if (connection) {
      await connection.rollback();
    }

    console.error("REGISTER ERROR:", err);

    res.status(500).json({
      message: err.message || "Registration failed"
    });

  } finally {

    if (connection) {
      connection.release();
    }

  }

});


/* --------------------------------------------------
GET ALL STUDENTS
-------------------------------------------------- */

router.get("/students", async (req, res) => {

  try {

    const [rows] = await db.query(`
      SELECT
        student_id,
        first_name,
        last_name,
        middle_name,
        college_department,
        program_name,
        year_level,
        status,
        created_at,
        updated_at
      FROM students
      ORDER BY created_at DESC
    `);

    res.json(rows);

  } catch (error) {

    console.error("FETCH ERROR:", error);

    res.status(500).json({
      message: "Failed to fetch students"
    });

  }

});

/* --------------------------------------------------
UPDATE STUDENT STATUS
-------------------------------------------------- */

router.put("/students/:student_id", async (req, res) => {
  try {
    const { student_id } = req.params;
    const {
      first_name,
      last_name,
      middle_name,
      extension_name,
      college_department,
      program_name,
      year_level,
      status
    } = req.body;

    if (!status || (status !== 'Regular' && status !== 'Irregular' && status !== 'Inactive')) {
      return res.status(400).json({
        message: "Invalid status. Must be 'Regular', 'Irregular', or 'Inactive'"
      });
    }

    
    const [result] = await db.query(
      `UPDATE students 
      SET first_name = ?, last_name = ?, middle_name = ?,
          extension_name = ?, college_department = ?, program_name = ?,
          year_level = ?, status = ?,
          updated_at = CURRENT_TIMESTAMP 
      WHERE student_id = ?`,
      [
        first_name?.trim().toUpperCase(),
        last_name?.trim().toUpperCase(),
        middle_name?.trim().toUpperCase() || null,
        extension_name?.trim() || null,
        college_department,
        program_name || null,
        year_level,
        status,
        student_id
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Student not found"
      });
    }

    res.json({
      message: "Student status updated successfully",
      student_id,
      status
    });

  } catch (error) {
    console.error("UPDATE ERROR:", error);
    res.status(500).json({
      message: "Failed to update student status"
    });
  }
});

/* --------------------------------------------------
GET ARCHIVED STUDENTS
-------------------------------------------------- */

router.get("/archived-students", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        student_id,
        email,
        first_name,
        last_name,
        middle_name,
        extension_name,
        college_department,
        program_name,
        year_level,
        status,
        created_at,
        updated_at
      FROM students
      WHERE status = 'Inactive'
      ORDER BY updated_at DESC
    `);

    res.json(rows);

  } catch (error) {
    console.error("FETCH ARCHIVED ERROR:", error);
    res.status(500).json({
      message: "Failed to fetch archived students"
    });
  }
});

module.exports = router;