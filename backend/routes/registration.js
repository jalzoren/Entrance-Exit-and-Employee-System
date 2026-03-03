const express = require("express");
const axios = require("axios");
const db = require("../src/db");

const router = express.Router();


router.post("/validate-face", async (req, res) => {
    try {
      const { images } = req.body;
  
      if (!images || images.length !== 5) {
        return res.status(400).json({ error: "5 images required" });
      }
  
      const response = await axios.post(
        "http://127.0.0.1:8000/generate-embedding",
        { images }
      );
  
      if (!response.data.embedding) {
        return res.status(400).json({ error: "Face validation failed" });
      }
  
      res.json({ message: "Face validated successfully" });
  
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Face validation failed" });
    }
  });

router.post("/register", async (req, res) => {
  const connection = await db.getConnection();

  try {
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

    // 1️⃣ Save student info first
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

    // 2️⃣ Send images to Python
    const response = await axios.post(
      "http://127.0.0.1:8000/generate-embedding",
      { images }
    );

    if (response.data.error) {
      throw new Error(response.data.error);
    }

    const embedding = response.data.embedding;

    // 3️⃣ Save embedding in separate table
    await connection.query(
      `INSERT INTO student_face_embeddings 
       (student_id, face_embedding)
       VALUES (?, ?)`,
      [
        student_id,
        JSON.stringify(embedding)
      ]
    );

    await connection.commit();

    res.json({ message: "Student registered successfully" });

  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ message: "Registration failed" });

  } finally {
    connection.release();
  }
});

// GET all students
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
      console.error(error);
      res.status(500).json({ message: "Failed to fetch students" });
    }
  });

module.exports = router;