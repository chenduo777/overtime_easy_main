const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');

// Execute raw SQL query
async function executeQuery(req, res) {
    const { sql } = req.body;

    if (!sql) {
        return res.status(400).json({ error: 'SQL query is required' });
    }

    try {
        const [results] = await pool.query(sql);
        res.json({ results });
    } catch (error) {
        console.error('SQL Execution Error:', error);
        res.status(400).json({ error: error.message });
    }
}

// Get all students
async function getAllStudents(req, res) {
    try {
        const [rows] = await pool.query(
            `SELECT student_id, team_id, name, role, last_login, created_at 
             FROM Student 
             ORDER BY student_id ASC`
        );
        
        // 轉換欄位名稱以保持前端相容性
        const students = rows.map(r => ({
            studentId: r.student_id,
            teamId: r.team_id,
            name: r.name,
            role: r.role,
            lastLogin: r.last_login,
            createdAt: r.created_at
        }));
        
        res.json({ students });
    } catch (error) {
        console.error('Get Students Error:', error);
        res.status(500).json({ error: 'Failed to fetch students' });
    }
}

// Add a student (密碼直接存入 Student 表)
async function addStudent(req, res) {
    const { studentId, name, teamId, role } = req.body;

    if (!studentId || !name) {
        return res.status(400).json({ error: 'Student ID and Name are required' });
    }

    try {
        // 使用預設密碼 '123456'
        const defaultPassword = '123456';
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);

        await pool.query(
            `INSERT INTO Student (student_id, team_id, name, password, role) 
             VALUES (?, ?, ?, ?, ?)`,
            [studentId, teamId || null, name, hashedPassword, role || 'user']
        );

        res.status(201).json({ message: 'Student added successfully' });
    } catch (error) {
        console.error('Add Student Error:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(409).json({ error: 'Student ID already exists' });
        } else {
            res.status(500).json({ error: 'Failed to add student' });
        }
    }
}

// Update student
async function updateStudent(req, res) {
    const { id } = req.params;
    const { name, teamId, role } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'Name is required' });
    }

    try {
        await pool.query(
            `UPDATE Student SET name = ?, team_id = ?, role = ? WHERE student_id = ?`, 
            [name, teamId || null, role || 'user', id]
        );
        res.json({ message: 'Student updated successfully' });
    } catch (error) {
        console.error('Update Student Error:', error);
        res.status(500).json({ error: 'Failed to update student' });
    }
}

// Delete student
async function deleteStudent(req, res) {
    const { id } = req.params;

    try {
        // AttendanceRecord 和 StudentReward 會因 ON DELETE CASCADE 自動刪除
        await pool.query('DELETE FROM Student WHERE student_id = ?', [id]);
        res.json({ message: 'Student deleted successfully' });
    } catch (error) {
        console.error('Delete Student Error:', error);
        res.status(500).json({ error: 'Failed to delete student' });
    }
}

// Reset student password
async function resetPassword(req, res) {
    const { id } = req.params;
    const { newPassword } = req.body;

    const password = newPassword || '123456';

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query(
            'UPDATE Student SET password = ? WHERE student_id = ?',
            [hashedPassword, id]
        );
        res.json({ message: 'Password reset successfully' });
    } catch (error) {
        console.error('Reset Password Error:', error);
        res.status(500).json({ error: 'Failed to reset password' });
    }
}

module.exports = {
    executeQuery,
    getAllStudents,
    addStudent,
    updateStudent,
    deleteStudent,
    resetPassword
};
