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
      college_department,
      year_level,
      status,
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
       (student_id, first_name, last_name, middle_name,
        college_department, year_level, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        student_id,
        first_name,
        last_name,
        middle_name,
        college_department,
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

module.exports = router;