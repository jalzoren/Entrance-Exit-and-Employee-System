const express = require("express");
const router  = express.Router();
const db      = require("./db");

async function getPhTime(pool) {
  const connection = pool || db;
  const [rows] = await connection.query(
    "SELECT NOW() AS ph_now" // ← mysql2 now returns this in +08:00 due to db.js fix
  );
  return new Date(rows[0].ph_now);
}

async function getTodayPhRange(pool) {
  const now = await getPhTime(pool);

  const y  = now.getFullYear();
  const mo = String(now.getMonth() + 1).padStart(2, '0');
  const d  = String(now.getDate()).padStart(2, '0');

  return {
    now,
    dayStart: `${y}-${mo}-${d} 00:00:00`,
    dayEnd:   `${y}-${mo}-${d} 23:59:59`,
  };
}

router.get("/", async (req, res) => {
  try {
    const now = await getPhTime();
    res.json({
      success:    true,
      serverTime: now.toISOString(),
      phTime:     now.toLocaleString('en-PH', { timeZone: 'Asia/Manila' }),
    });
  } catch (error) {
    console.error("Error fetching server time:", error);
    res.status(500).json({ success: false, message: "Failed to fetch server time" });
  }
});

module.exports = { getPhTime, getTodayPhRange, router };