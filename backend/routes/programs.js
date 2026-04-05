const express = require('express');
const pool = require("../src/db"); 
const router = express.Router();

// Helper function to get Philippine Time
const getPHDate = () => {
  const now = new Date();
  const phTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
  return phTime.toISOString().split('T')[0];
};

// ============ DEPARTMENT ROUTES ============

router.get('/departments', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT dept_name FROM departments ORDER BY dept_name');
        res.json(rows.map(row => row.dept_name));
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
});

router.post('/departments', async (req, res) => {
    try {
        const { dept_name } = req.body;
        const [result] = await pool.query('INSERT INTO departments (dept_name) VALUES (?)', [dept_name]);
        res.status(201).json({ id: result.insertId, dept_name });
    } catch (error) {
        console.error(error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Department already exists' });
        }
        res.status(500).json({ error: 'Database error' });
    }
});

// ============ PROGRAM ROUTES ============

router.get('/programs', async (req, res) => {
    try {
        const { search, department, programType, programStatus } = req.query;
        
        let query = 'SELECT * FROM programs WHERE 1=1';
        let params = [];
        
        if (search) {
            query += ' AND (programCode LIKE ? OR programName LIKE ? OR department LIKE ?)';
            const searchPattern = `%${search}%`;
            params.push(searchPattern, searchPattern, searchPattern);
        }
        
        if (department) {
            query += ' AND department = ?';
            params.push(department);
        }
        
        // Fix: Only add programType filter if NOT 'All'
        if (programType && programType !== 'All') {
            query += ' AND programType = ?';
            params.push(programType);
        }
        
        // Fix: Only add programStatus filter if NOT 'All'
        if (programStatus && programStatus !== 'All') {
            query += ' AND programStatus = ?';
            params.push(programStatus);
        }
        
        query += ' ORDER BY id DESC';
        
        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
});

router.post('/programs', async (req, res) => {
    try {
        const { programCode, programName, department, programType, programStatus } = req.body;
        const dateCreated = getPHDate();
        
        const [result] = await pool.query(
            `INSERT INTO programs (programCode, programName, department, programType, programStatus, dateCreated) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [programCode, programName, department, programType, programStatus, dateCreated]
        );
        
        const [newProgram] = await pool.query('SELECT * FROM programs WHERE id = ?', [result.insertId]);
        res.status(201).json(newProgram[0]);
    } catch (error) {
        console.error(error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Program code already exists' });
        }
        res.status(500).json({ error: 'Database error' });
    }
});

router.put('/programs/:id', async (req, res) => {
    try {
        const { programCode, programName, department, programType, programStatus } = req.body;
        
        const [result] = await pool.query(
            `UPDATE programs SET 
             programCode = ?, 
             programName = ?, 
             department = ?, 
             programType = ?, 
             programStatus = ?
             WHERE id = ?`,
            [programCode, programName, department, programType, programStatus, req.params.id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Program not found' });
        }
        
        const [updatedProgram] = await pool.query('SELECT * FROM programs WHERE id = ?', [req.params.id]);
        res.json(updatedProgram[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
});

router.patch('/programs/:id/archive', async (req, res) => {
    try {
        const [result] = await pool.query(
            'UPDATE programs SET programStatus = "Inactive" WHERE id = ?',
            [req.params.id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Program not found' });
        }
        
        res.json({ message: 'Program archived successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
});

module.exports = router;