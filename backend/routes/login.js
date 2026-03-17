const express = require('express');
const bcrypt = require('bcrypt');
const pool = require("../src/db"); 
const router = express.Router();

// ============================
// 🔐 Secure Login Endpoint with Session
// ============================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // 1️⃣ Get user by email only
    const [rows] = await pool.query(
      'SELECT * FROM admins WHERE email = ?',
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const user = rows[0];

    // 2️⃣ Compare hashed password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // 3️⃣ Remove password before sending response
    const { password: _, ...userWithoutPassword } = user;

    // 4️⃣ Store user in session
    req.session.user = userWithoutPassword;
    req.session.userEmail = user.email;
    req.session.role = user.role;

    // Save session explicitly
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({
          success: false,
          message: 'Failed to create session'
        });
      }

      // Determine redirect based on role
      let redirect = '/dashboard';
      if (user.role === 'Super Admin') {
        redirect = '/superdashboard';
      }

      res.json({
        success: true,
        message: 'Login successful',
        user: userWithoutPassword,
        redirect: redirect
      });
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// ============================
// 🔍 Check Session Endpoint
// ============================
router.get('/check-session', (req, res) => {
  if (req.session.user) {
    res.json({
      authenticated: true,
      user: req.session.user,
      role: req.session.role
    });
  } else {
    res.json({ authenticated: false });
  }
});

// ============================
// 🚪 Logout Endpoint
// ============================
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to logout'
      });
    }
    
    res.clearCookie('connect.sid'); // Clear the session cookie
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  });
});

module.exports = router;