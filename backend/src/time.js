// src/time.js
// ─────────────────────────────────────────────────────────────────────────────
// AUTHORITATIVE TIME SOURCE
//
// All timestamps in this system come from the MySQL server via CONVERT_TZ(),
// NOT from the Node.js process clock (which depends on the kiosk device's
// system time and can be wrong).
//
// Why MySQL and not the device?
//   - The database server's clock is managed by your IT infrastructure
//   - Kiosk devices can have drifted or manually-changed clocks
//   - All entries share the same time source → consistent, auditable logs
//
// Usage (in any route that needs the current PH time):
//   const { getPhTime } = require('../src/time');
//   const now = await getPhTime(db);   ← always await, always pass db
// ─────────────────────────────────────────────────────────────────────────────

const express = require("express");
const router  = express.Router();
const db      = require("./db");

/**
 * getPhTime(pool)
 *
 * Fetches the current Philippine Standard Time (UTC+8) directly from MySQL.
 * Returns a plain JavaScript Date object set to that moment.
 *
 * @param {import('mysql2/promise').Pool} pool - your mysql2 connection pool
 * @returns {Promise<Date>} current PH time as a Date object
 */
async function getPhTime() {
  // CONVERT_TZ converts MySQL's UTC_TIMESTAMP to Asia/Manila (UTC+8).
  // This works as long as MySQL's timezone tables are loaded.
  // If CONVERT_TZ returns NULL on your server, use the +08:00 offset fallback below.
  const [rows] = await db.query(`
    SELECT
      COALESCE(
        CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', 'Asia/Manila'),
        UTC_TIMESTAMP() + INTERVAL 8 HOUR       -- fallback if tz tables missing
      ) AS ph_now
  `);

  // MySQL returns a Date object for DATETIME columns when using mysql2
  return new Date(rows[0].ph_now);
}

/**
 * getTodayPhRange(pool)
 *
 * Returns { dayStart, dayEnd, now } for today in PH time.
 * Use these as BETWEEN bounds in queries instead of DATE(log_time) = ?
 * to avoid MySQL timezone mismatches.
 *
 * Example:
 *   const { dayStart, dayEnd, now } = await getTodayPhRange(db);
 *   await db.query('SELECT * FROM logs WHERE log_time BETWEEN ? AND ?', [dayStart, dayEnd]);
 *
 * @param {import('mysql2/promise').Pool} pool
 * @returns {Promise<{ now: Date, dayStart: string, dayEnd: string }>}
 */
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

// ── REST endpoint: GET /api/time ──────────────────────────────────────────────
// Used by the frontend clock if you want to display server time in the UI.
router.get("/", async (req, res) => {
  try {
    const now = await getPhTime(db);

    res.json({
      success:    true,
      serverTime: now.toISOString(),        // ISO string for easy JS parsing
      phTime:     now.toLocaleString('en-PH', { timeZone: 'Asia/Manila' }), // human-readable
    });

  } catch (error) {
    console.error("Error fetching server time:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch server time",
    });
  }
});

module.exports = { getPhTime, getTodayPhRange, router };