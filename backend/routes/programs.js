const express = require('express');
const pool = require("../src/db"); 
const router = express.Router();

// Helper function to get Philippine Time
const getPHDate = () => {
  const now = new Date();
  const phTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
  return phTime.toISOString().split('T')[0];
};

const getPHDateTime = () => {
  const now = new Date();
  const phTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
  return phTime.toISOString().slice(0, 19).replace('T', ' ');
};

// ============ DEPARTMENT ROUTES ============

// Get all departments (with optional search and status filter)
router.get('/departments', async (req, res) => {
    try {
        const { search, status } = req.query;
        
        let query = 'SELECT id, dept_code, dept_name, status, created_at, updated_at FROM departments WHERE 1=1';
        let params = [];
        
        if (search) {
            query += ' AND (dept_name LIKE ? OR dept_code LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }
        
        if (status && status !== 'All') {
            query += ' AND status = ?';
            params.push(status);
        }
        
        query += ' ORDER BY dept_name ASC';
        
        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching departments:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Get single department by ID
router.get('/departments/:id', async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT id, dept_code, dept_name, status, created_at, updated_at FROM departments WHERE id = ?', 
            [req.params.id]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Department not found' });
        }
        
        res.json(rows[0]);
    } catch (error) {
        console.error('Error fetching department:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Create new department
router.post('/departments', async (req, res) => {
    try {
        const { dept_code, dept_name, status } = req.body;
        const created_at = getPHDateTime();
        const updated_at = getPHDateTime();
        
        if (!dept_code || !dept_name) {
            return res.status(400).json({ error: 'Department code and name are required' });
        }
        
        const [result] = await pool.query(
            'INSERT INTO departments (dept_code, dept_name, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
            [dept_code.toUpperCase(), dept_name, status || 'Active', created_at, updated_at]
        );
        
        const [newDepartment] = await pool.query(
            'SELECT id, dept_code, dept_name, status, created_at, updated_at FROM departments WHERE id = ?', 
            [result.insertId]
        );
        
        res.status(201).json(newDepartment[0]);
    } catch (error) {
        console.error('Error adding department:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Department code or name already exists' });
        }
        res.status(500).json({ error: 'Database error' });
    }
});

// Update department
router.put('/departments/:id', async (req, res) => {
    try {
        const { dept_code, dept_name, status } = req.body;
        const updated_at = getPHDateTime();
        
        if (!dept_code || !dept_name) {
            return res.status(400).json({ error: 'Department code and name are required' });
        }
        
        const [result] = await pool.query(
            'UPDATE departments SET dept_code = ?, dept_name = ?, status = ?, updated_at = ? WHERE id = ?',
            [dept_code.toUpperCase(), dept_name, status, updated_at, req.params.id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Department not found' });
        }
        
        const [updatedDepartment] = await pool.query(
            'SELECT id, dept_code, dept_name, status, created_at, updated_at FROM departments WHERE id = ?', 
            [req.params.id]
        );
        
        res.json(updatedDepartment[0]);
    } catch (error) {
        console.error('Error updating department:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Department code or name already exists' });
        }
        res.status(500).json({ error: 'Database error' });
    }
});

// ============ FIXED: Get affected counts before archiving department ============
router.get('/departments/:id/archive-impact', async (req, res) => {
    try {
        console.log('📊 Archive impact check for department ID:', req.params.id);
        
        const [dept] = await pool.query(
            'SELECT dept_name FROM departments WHERE id = ?',
            [req.params.id]
        );
        
        if (dept.length === 0) {
            return res.status(404).json({ error: 'Department not found' });
        }
        
        const deptName = dept[0].dept_name;
        console.log('📊 Department name:', deptName);
        
        const [programsCount] = await pool.query(
            'SELECT COUNT(*) as count FROM programs WHERE department = ? AND programStatus = "Active"',
            [deptName]
        );
        
        const [studentsCount] = await pool.query(
            'SELECT COUNT(*) as count FROM students WHERE college_department = ? AND status != "Inactive"',
            [deptName]
        );
        
        console.log('📊 Programs count:', programsCount[0].count);
        console.log('📊 Students count:', studentsCount[0].count);
        
        res.json({
            programsCount: programsCount[0].count || 0,
            studentsCount: studentsCount[0].count || 0
        });
    } catch (error) {
        console.error('Error fetching archive impact:', error);
        res.status(500).json({ 
            programsCount: 0, 
            studentsCount: 0, 
            error: error.message 
        });
    }
});

// Archive department (cascades to programs and students)
router.patch('/departments/:id/archive', async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const updated_at = getPHDateTime();
        
        const [dept] = await connection.query(
            'SELECT dept_name FROM departments WHERE id = ?',
            [req.params.id]
        );
        
        if (dept.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Department not found' });
        }
        
        const deptName = dept[0].dept_name;
        
        const [deptResult] = await connection.query(
            'UPDATE departments SET status = "Inactive", updated_at = ? WHERE id = ?',
            [updated_at, req.params.id]
        );
        
        if (deptResult.affectedRows === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Department not found' });
        }
        
        const [programsResult] = await connection.query(
            'UPDATE programs SET programStatus = "Inactive" WHERE department = ? AND programStatus = "Active"',
            [deptName]
        );
        
        const [studentsResult] = await connection.query(
            'UPDATE students SET status = "Inactive" WHERE college_department = ? AND status != "Inactive"',
            [deptName]
        );
        
        await connection.commit();
        
        res.json({ 
            message: 'Department and all associated programs/students archived successfully',
            affectedPrograms: programsResult.affectedRows,
            affectedStudents: studentsResult.affectedRows
        });
        
    } catch (error) {
        await connection.rollback();
        console.error('Error archiving department with cascade:', error);
        res.status(500).json({ error: 'Database error during cascading archive' });
    } finally {
        connection.release();
    }
});

// Get affected counts before archiving program
router.get('/programs/:id/archive-impact', async (req, res) => {
    try {
        const [program] = await pool.query(
            'SELECT programName FROM programs WHERE id = ?',
            [req.params.id]
        );
        
        if (program.length === 0) {
            return res.status(404).json({ error: 'Program not found' });
        }
        
        const programName = program[0].programName;
        
        const [studentsCount] = await pool.query(
            'SELECT COUNT(*) as count FROM students WHERE program_name = ? AND status != "Inactive"',
            [programName]
        );
        
        res.json({
            studentsCount: studentsCount[0].count || 0
        });
    } catch (error) {
        console.error('Error fetching archive impact:', error);
        res.json({
            studentsCount: 0
        });
    }
});

// Get total departments count
router.get('/departments/total/count', async (req, res) => {
    try {
        const [result] = await pool.query('SELECT COUNT(*) as total FROM departments');
        res.json({ total: result[0].total || 0 });
    } catch (error) {
        console.error('Error fetching departments count:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Get total programs count
router.get('/programs/total/count', async (req, res) => {
    try {
        const [result] = await pool.query('SELECT COUNT(*) as total FROM programs');
        res.json({ total: result[0].total || 0 });
    } catch (error) {
        console.error('Error fetching programs count:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Restore department
router.patch('/departments/:id/restore', async (req, res) => {
    try {
        const updated_at = getPHDateTime();
        
        const [result] = await pool.query(
            'UPDATE departments SET status = "Active", updated_at = ? WHERE id = ?',
            [updated_at, req.params.id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Department not found' });
        }
        
        res.json({ message: 'Department restored successfully' });
    } catch (error) {
        console.error('Error restoring department:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Delete department permanently
router.delete('/departments/:id', async (req, res) => {
    try {
        const [programs] = await pool.query(
            'SELECT COUNT(*) as count FROM programs WHERE department = (SELECT dept_name FROM departments WHERE id = ?)',
            [req.params.id]
        );
        
        if (programs[0].count > 0) {
            return res.status(400).json({ 
                error: 'Cannot delete department with existing programs. Archive or reassign programs first.' 
            });
        }
        
        const [result] = await pool.query('DELETE FROM departments WHERE id = ?', [req.params.id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Department not found' });
        }
        
        res.json({ message: 'Department deleted successfully' });
    } catch (error) {
        console.error('Error deleting department:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Get active departments only
router.get('/departments/active', async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT id, dept_code, dept_name FROM departments WHERE status = "Active" ORDER BY dept_name'
        );
        res.json(rows);
    } catch (error) {
        console.error('Error fetching active departments:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Get active programs only
router.get('/programs/active', async (req, res) => {
    try {
        const { department } = req.query;
        
        let query = `
            SELECT p.* 
            FROM programs p
            JOIN departments d ON p.department = d.dept_name
            WHERE d.status = "Active" AND p.programStatus = "Active"
        `;
        let params = [];
        
        if (department) {
            query += ' AND p.department = ?';
            params.push(department);
        }
        
        query += ' ORDER BY p.programName ASC';
        
        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching active programs:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// ============ PROGRAM ROUTES ============

// Get all programs
router.get('/programs', async (req, res) => {
    try {
        const { search, department, programType, programStatus } = req.query;
        
        let query = 'SELECT *, duration FROM programs WHERE 1=1';
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
        
        if (programType && programType !== 'All') {
            query += ' AND programType = ?';
            params.push(programType);
        }
        
        if (programStatus && programStatus !== 'All') {
            query += ' AND programStatus = ?';
            params.push(programStatus);
        }
        
        query += ' ORDER BY id DESC';
        
        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching programs:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Get archived programs
router.get('/programs/archived', async (req, res) => {
    try {
        const { search, department, programType } = req.query;
        
        let query = 'SELECT *, duration FROM programs WHERE programStatus = "Inactive"';
        let params = [];
        
        if (search) {
            query += ' AND (programCode LIKE ? OR programName LIKE ? OR department LIKE ?)';
            const searchPattern = `%${search}%`;
            params.push(searchPattern, searchPattern, searchPattern);
        }
        
        if (department && department !== 'All') {
            query += ' AND department = ?';
            params.push(department);
        }
        
        if (programType && programType !== 'All') {
            query += ' AND programType = ?';
            params.push(programType);
        }
        
        query += ' ORDER BY id DESC';
        
        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching archived programs:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Get single program by ID
router.get('/programs/:id', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT *, duration FROM programs WHERE id = ?', [req.params.id]);
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Program not found' });
        }
        
        res.json(rows[0]);
    } catch (error) {
        console.error('Error fetching program:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Create new program
router.post('/programs', async (req, res) => {
    try {
        const { programCode, programName, department, programType, programStatus, duration } = req.body;
        const dateCreated = getPHDate();
        
        const [result] = await pool.query(
            `INSERT INTO programs (programCode, programName, department, programType, programStatus, duration, dateCreated) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [programCode, programName, department, programType, programStatus, duration, dateCreated]
        );
        
        const [newProgram] = await pool.query('SELECT *, duration FROM programs WHERE id = ?', [result.insertId]);
        res.status(201).json(newProgram[0]);
    } catch (error) {
        console.error('Error adding program:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Program code already exists' });
        }
        res.status(500).json({ error: 'Database error' });
    }
});

// Update program
router.put('/programs/:id', async (req, res) => {
    try {
        const { programCode, programName, department, programType, programStatus, duration } = req.body;
        
        const [result] = await pool.query(
            `UPDATE programs SET 
             programCode = ?, 
             programName = ?, 
             department = ?, 
             programType = ?, 
             programStatus = ?,
             duration = ?
             WHERE id = ?`,
            [programCode, programName, department, programType, programStatus, duration, req.params.id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Program not found' });
        }
        
        const [updatedProgram] = await pool.query('SELECT *, duration FROM programs WHERE id = ?', [req.params.id]);
        res.json(updatedProgram[0]);
    } catch (error) {
        console.error('Error updating program:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Partial update program
router.patch('/programs/:id', async (req, res) => {
    try {
        const { programStatus } = req.body;
        
        if (!programStatus) {
            return res.status(400).json({ error: 'programStatus is required' });
        }
        
        const [result] = await pool.query(
            'UPDATE programs SET programStatus = ? WHERE id = ?',
            [programStatus, req.params.id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Program not found' });
        }
        
        const [updatedProgram] = await pool.query('SELECT *, duration FROM programs WHERE id = ?', [req.params.id]);
        res.json(updatedProgram[0]);
    } catch (error) {
        console.error('Error updating program status:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Archive program with cascade to students
router.patch('/programs/:id/archive', async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const [program] = await connection.query(
            'SELECT programName FROM programs WHERE id = ?',
            [req.params.id]
        );
        
        if (program.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Program not found' });
        }
        
        const programName = program[0].programName;
        
        const [progResult] = await connection.query(
            'UPDATE programs SET programStatus = "Inactive" WHERE id = ?',
            [req.params.id]
        );
        
        const [studentsResult] = await connection.query(
            'UPDATE students SET status = "Inactive" WHERE program_name = ? AND status != "Inactive"',
            [programName]
        );
        
        await connection.commit();
        
        res.json({ 
            message: 'Program and all associated students archived successfully',
            affectedStudents: studentsResult.affectedRows
        });
        
    } catch (error) {
        await connection.rollback();
        console.error('Error archiving program with cascade:', error);
        res.status(500).json({ error: 'Database error during cascading archive' });
    } finally {
        connection.release();
    }
});

// Restore program
router.patch('/programs/:id/restore', async (req, res) => {
    try {
        const [result] = await pool.query(
            'UPDATE programs SET programStatus = "Active" WHERE id = ?',
            [req.params.id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Program not found' });
        }
        
        res.json({ message: 'Program restored successfully' });
    } catch (error) {
        console.error('Error restoring program:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

module.exports = router;