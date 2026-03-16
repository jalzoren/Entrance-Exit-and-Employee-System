// backend/routes/importStudents.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const XLSX = require("xlsx");
const db = require("../src/db"); 

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 6 * 1024 * 1024, // 6MB max 
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/octet-stream", 
    ];
    const allowedExts = [".csv", ".xlsx"];
    const fileExt = "." + file.originalname.split(".").pop().toLowerCase();

    if (allowedMimes.includes(file.mimetype) || allowedExts.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error("Only .csv and .xlsx files are allowed."), false);
    }
  },
});

const REQUIRED_COLUMNS = [
  "Student ID",
  "First Name",
  "Last Name",
  "Middle Name",
  "College Department",
  "Year Level",
  "Enrollment Status",
];

// Valid values for controlled fields
const VALID_DEPARTMENTS = [
  "College of Nursing",
  "College of Engineering",
  "College of Education",
  "College of Computer Studies",
  "College of Business Administration",
  "College of Arts and Sciences",
  "College of Hospitality Management"
];

const VALID_YEAR_LEVELS = {
  "1": 1,   "1st": 1,
  "2": 2,   "2nd": 2,
  "3": 3,   "3rd": 3,
  "4": 4,   "4th": 4,
};
const VALID_STATUSES = ["Inactive", "Regular", "Irregular"];
// Student ID format: 2-digit year + dash + 5-digit number e.g. "24-00001"
const STUDENT_ID_REGEX = /^\d{2}-\d{5}$/;

const validateRow = (row, rowNumber) => {
  const errors = [];

  const studentId = (row["Student ID"] || "").toString().trim();
  const firstName = (row["First Name"] || "").toString().trim();
  const lastName = (row["Last Name"] || "").toString().trim();
  const middleName = (row["Middle Name"] || "").toString().trim();
  const collegeDept = (row["College Department"] || "").toString().trim();
  const yearLevel = (row["Year Level"] || "").toString().trim();
  const enrollmentStatus = (row["Enrollment Status"] || "").toString().trim();

  // 1: No empty required fields ──
  if (!studentId) errors.push(`Row ${rowNumber}: Student ID is empty.`);
  if (!firstName) errors.push(`Row ${rowNumber}: First Name is empty.`);
  if (!middleName) errors.push(`Row ${rowNumber}: Middle Name is empty.`);
  if (!lastName) errors.push(`Row ${rowNumber}: Last Name is empty.`);
  if (!collegeDept) errors.push(`Row ${rowNumber}: College Department is empty.`);
  if (!yearLevel) errors.push(`Row ${rowNumber}: Year Level is empty.`);
  if (!enrollmentStatus) errors.push(`Row ${rowNumber}: Enrollment Status is empty.`);

  // 2: Student ID format must be 24-00001
  if (studentId && !STUDENT_ID_REGEX.test(studentId)) {
    errors.push(`Row ${rowNumber}: Student ID "${studentId}" must follow format YYYY-NNNN (e.g. 24-00001).`);
  }

  // 4: College Department must be one of the valid options
  if (collegeDept && !VALID_DEPARTMENTS.includes(collegeDept)) {
    errors.push(
      `Row ${rowNumber}: College Department "${collegeDept}" is invalid. ` +
      `Valid options: ${VALID_DEPARTMENTS.join(", ")}.`
    );
  }

  // 5: Year Level must be one of the valid options
if (yearLevel && !(yearLevel.toLowerCase() in VALID_YEAR_LEVELS)) {
  errors.push(`Row ${rowNumber}: Year Level "${yearLevel}" is invalid. Valid options: 1, 2, 3, 4.`);
}

  // 6: Enrollment Status must be one of the valid options
  if (enrollmentStatus && !VALID_STATUSES.includes(enrollmentStatus)) {
    errors.push(
      `Row ${rowNumber}: Enrollment Status "${enrollmentStatus}" is invalid. ` +
      `Valid options: ${VALID_STATUSES.join(", ")}.`
    );
  }

  return errors;
};

// POST /api/import-students

router.post("/import-students", upload.single("file"), async (req, res) => {
  try {
    // 1: Ensure a file was actually attached 
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded." });
    }

    // 2: Parse the file buffer using xlsx library 
    const workbook  = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];


    const rows = XLSX.utils.sheet_to_json(worksheet, {
      defval: "",
    });

    // 3: Check if file has any data 
    if (rows.length === 0) {
      return res.status(400).json({ message: "The uploaded file is empty." });
    }

    // 4: Validate that all required columns are present
    const fileColumns   = Object.keys(rows[0]);
    const missingColumns = REQUIRED_COLUMNS.filter(
      (col) => !fileColumns.includes(col)
    );

    if (missingColumns.length > 0) {
      return res.status(400).json({
        message: `Missing required columns: ${missingColumns.join(", ")}. ` +
                `Please check your file format.`,
      });
    }

    // 5: Validate every row's content 
    const validationErrors = [];
    rows.forEach((row, index) => {
      const rowErrors = validateRow(row, index + 2);
      validationErrors.push(...rowErrors);
    });

    if (validationErrors.length > 0) {
      return res.status(400).json({
        message: "File contains validation errors. Please fix them and re-upload.",
        errors:  validationErrors,
      });
    }

    // 6: Check for duplicate Student IDs 
    const fileStudentIds = rows.map((row) => row["Student ID"].toString().trim());
    const duplicatesInFile = fileStudentIds.filter(
      (id, index) => fileStudentIds.indexOf(id) !== index
    );

    if (duplicatesInFile.length > 0) {
      return res.status(400).json({
        message: `Duplicate Student IDs found within the file: ${[...new Set(duplicatesInFile)].join(", ")}.`,
      });
    }

    // 7: Check for duplicates against the DATABASE 
    const placeholders = fileStudentIds.map(() => "?").join(", ");
    const [existingRows] = await db.query(
      `SELECT student_id FROM students WHERE student_id IN (${placeholders})`,
      fileStudentIds
    );

    if (existingRows.length > 0) {
      const existingIds = existingRows.map((r) => r.student_id);
      return res.status(400).json({
        message: `These Student IDs already exist in the database: ${existingIds.join(", ")}.`,
      });
    }

    // 8: All validations passed — insert rows into the database ──
    const insertedStudents = [];
    const failedRows  = [];

    for (const row of rows) {
      const studentId  = row["Student ID"].toString().trim();
      const firstName  = row["First Name"].toString().trim();
      const middleName = row["Middle Name"].toString().trim();
      const lastName   = row["Last Name"].toString().trim();
      const collegeDepartment = row["College Department"].trim();
      const yearLevel = VALID_YEAR_LEVELS[row["Year Level"].toString().trim().toLowerCase()];
      const status   = row["Enrollment Status"].trim();

      try {
        await db.query(
          `INSERT INTO students
            (student_id, first_name, last_name, middle_name, college_department, year_level, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
          [studentId, firstName, middleName, lastName, collegeDepartment, yearLevel, status]
        );
        insertedStudents.push(studentId);
      } catch (dbError) {
        failedRows.push({ studentId, error: dbError.message });
      }
    }

    // 9: Detailed summary
    return res.status(200).json({
      message: `Import complete. ${insertedStudents.length} student(s) added successfully.`,
      inserted: insertedStudents.length,
      failed: failedRows.length,
      failedDetails: failedRows,
      pendingFaceReg:  insertedStudents.length,
    });

  } catch (error) {
    console.error("Import error:", error);
    return res.status(500).json({
      message: error.message || "Server error during import.",
    });
  }
});

// GET /api/pending-face-registration

router.get("/pending-face-registration", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT COUNT(*) AS count FROM students 
      WHERE student_id NOT IN (
        SELECT DISTINCT student_id FROM student_face_embeddings
      )`
    );

    const count = rows[0].count;

    return res.status(200).json({
      count,
      message: count > 0
        ? `There are ${count} student(s) that need face registration.`
        : null,
    });
  } catch (error) {
    console.error("Pending face registration error:", error);
    return res.status(500).json({ message: "Server error." });
  }
});


module.exports = router;