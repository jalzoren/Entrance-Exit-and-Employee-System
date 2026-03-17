const express = require("express");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const timeRoute = require("./time");

const app = express();

// Update CORS to allow your frontend origin with credentials
app.use(cors({
  origin: 'http://localhost:5173', // Your Vite frontend URL
  credentials: true // Allow cookies to be sent
}));

// Increase request size limit for images
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(cookieParser());

// Session configuration
app.use(session({
  secret: 'your-secret-key-change-this-to-something-secure',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true if using HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax'
  }
}));

app.use("/api/time", timeRoute);

module.exports = app;