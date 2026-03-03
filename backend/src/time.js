const express = require("express");
const router = express.Router();
const db = require("./db");

router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT UTC_TIMESTAMP() AS currentTime");

    res.json({
      success: true,
      serverTime: rows[0].currentTime,
    });

  } catch (error) {
    console.error("Error fetching server time:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch server time",
    });
  }
});

module.exports = router;
