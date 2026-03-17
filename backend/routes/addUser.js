const express = require('express');
const bcrypt = require('bcrypt');
const pool = require("../src/db"); 
const router = express.Router();

// GET all users
router.get('/users', async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT admin_id, email, fullname, role, created FROM admins ORDER BY created DESC'
        );
        res.json(rows);
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// POST create new user
router.post('/users', async (req, res) => {
    try {
        const { lastName, firstName, middleName, email, idnum, role, password } = req.body;
        
        // Validate required fields
        if (!lastName || !firstName || !email || !role || !password || !idnum) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Combine name fields into fullname (Format: Last, First Middle)
        const fullname = middleName 
            ? `${lastName}, ${firstName} ${middleName}`
            : `${lastName}, ${firstName}`;
        
        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        // Insert into database - admin_id is the ID number from the form
        const sql = 'INSERT INTO admins (admin_id, email, fullname, role, password) VALUES (?, ?, ?, ?, ?)';
        
        const [result] = await pool.query(sql, [idnum, email, fullname, role, hashedPassword]);
        
        // Fetch the newly created user
        const [newUser] = await pool.query(
            'SELECT admin_id, email, fullname, role, created FROM admins WHERE admin_id = ?',
            [idnum] // Use idnum since that's the admin_id
        );
        
        res.status(201).json(newUser[0]);
        
    } catch (err) {
        console.error('Error creating user:', err);
        
        // Handle duplicate entry error
        if (err.code === 'ER_DUP_ENTRY') {
            // Check if it's duplicate email or admin_id
            if (err.sqlMessage.includes('email')) {
                return res.status(400).json({ error: 'Email already exists' });
            } else if (err.sqlMessage.includes('PRIMARY')) {
                return res.status(400).json({ error: 'ID Number already exists' });
            }
        }
        
        res.status(500).json({ error: 'Database error' });
    }
});

// PUT update user
router.put('/users/:id', async (req, res) => {
    try {
        const { id } = req.params; // This is the admin_id
        const { lastName, firstName, middleName, email, role, idnum } = req.body;
        
        if (!lastName || !firstName || !email || !role || !idnum) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        const fullname = middleName 
            ? `${lastName}, ${firstName} ${middleName}`
            : `${lastName}, ${firstName}`;
        
        // If ID number is being changed, we need to handle it carefully
        // For simplicity, let's assume admin_id cannot be changed
        const sql = 'UPDATE admins SET email = ?, fullname = ?, role = ? WHERE admin_id = ?';
        
        const [result] = await pool.query(sql, [email, fullname, role, id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({ message: 'User updated successfully' });
        
    } catch (err) {
        console.error('Error updating user:', err);
        
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Email already exists' });
        }
        
        res.status(500).json({ error: 'Database error' });
    }
});

// DELETE user
router.delete('/users/:id', async (req, res) => {
    try {
        const { id } = req.params; // This is the admin_id
        
        const [result] = await pool.query('DELETE FROM admins WHERE admin_id = ?', [id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({ message: 'User deleted successfully' });
        
    } catch (err) {
        console.error('Error deleting user:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// GET single user by ID
router.get('/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const [rows] = await pool.query(
            'SELECT admin_id, email, fullname, role, created FROM admins WHERE admin_id = ?',
            [id]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json(rows[0]);
    } catch (err) {
        console.error('Error fetching user:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

module.exports = router;