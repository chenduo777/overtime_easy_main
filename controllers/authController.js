const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

// 取得所有組別（公開 API，供註冊頁面使用）
async function getTeams(req, res) {
  try {
    const [teams] = await pool.query(
      'SELECT team_id, team_name FROM Team ORDER BY team_id'
    );
    res.json({ teams });
  } catch (error) {
    console.error('取得組別錯誤：', error);
    res.status(500).json({ error: '取得組別失敗' });
  }
}

// 學生註冊
async function register(req, res) {
  const { studentId, name, password, teamId } = req.body;

  // 驗證輸入（teamId 為必填）
  if (!studentId || !name || !password || !teamId) {
    return res.status(400).json({ error: '學號、姓名、密碼和組別為必填' });
  }

  try {
    // 檢查學號是否已存在
    const [existing] = await pool.query(
      'SELECT student_id FROM Student WHERE student_id = ?',
      [studentId]
    );

    if (existing.length > 0) {
      return res.status(409).json({ error: '此學號已被註冊' });
    }

    // 加密密碼
    const hashedPassword = await bcrypt.hash(password, 10);

    // 新增學生資料（密碼直接存入 Student 表）
    await pool.query(
      `INSERT INTO Student (student_id, team_id, name, password, role) 
       VALUES (?, ?, ?, ?, 'user')`,
      [studentId, teamId || null, name, hashedPassword]
    );

    res.status(201).json({
      message: '註冊成功',
      student: { studentId, name }
    });
  } catch (error) {
    console.error('註冊錯誤：', error);
    res.status(500).json({ error: '註冊失敗，請稍後再試' });
  }
}

// 學生登入
async function login(req, res) {
  const { studentId, password } = req.body;

  // 驗證輸入
  if (!studentId || !password) {
    return res.status(400).json({ error: '學號和密碼為必填' });
  }

  try {
    // 查詢學生資料（密碼已在 Student 表中）
    const [rows] = await pool.query(
      `SELECT student_id, name, password, role, team_id
       FROM Student
       WHERE student_id = ?`,
      [studentId]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: '學號或密碼錯誤' });
    }

    const student = rows[0];

    // 驗證密碼
    const isPasswordValid = await bcrypt.compare(password, student.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: '學號或密碼錯誤' });
    }

    // 更新最後登入時間
    await pool.query(
      'UPDATE Student SET last_login = NOW() WHERE student_id = ?',
      [studentId]
    );

    // 產生 JWT Token
    const token = jwt.sign(
      { 
        studentId: student.student_id, 
        name: student.name,
        role: student.role,
        teamId: student.team_id
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' } // Token 7天有效
    );

    res.json({
      message: '登入成功',
      token,
      student: {
        studentId: student.student_id,
        name: student.name,
        role: student.role,
        teamId: student.team_id
      }
    });
  } catch (error) {
    console.error('登入錯誤：', error);
    res.status(500).json({ error: '登入失敗，請稍後再試' });
  }
}

// 取得當前用戶資訊
async function getProfile(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT student_id, team_id, name, role, last_login, created_at 
       FROM Student WHERE student_id = ?`,
      [req.user.studentId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: '找不到用戶資料' });
    }

    const student = rows[0];
    res.json({ 
      student: {
        studentId: student.student_id,
        teamId: student.team_id,
        name: student.name,
        role: student.role,
        lastLogin: student.last_login,
        createdAt: student.created_at
      }
    });
  } catch (error) {
    console.error('取得資料錯誤：', error);
    res.status(500).json({ error: '取得資料失敗' });
  }
}

module.exports = { register, login, getProfile, getTeams };
