const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

// 學生註冊
async function register(req, res) {
  const { studentId, name, password } = req.body;

  // 驗證輸入
  if (!studentId || !name || !password) {
    return res.status(400).json({ error: '學號、姓名和密碼為必填' });
  }

  try {
    // 檢查學號是否已存在
    const [existing] = await pool.query(
      'SELECT StudentID FROM Student WHERE StudentID = ?',
      [studentId]
    );

    if (existing.length > 0) {
      return res.status(409).json({ error: '此學號已被註冊' });
    }

    // 加密密碼
    const hashedPassword = await bcrypt.hash(password, 10);

    // 開始交易
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // 1. 新增學生資料
      await connection.query(
        'INSERT INTO Student (StudentID, Name) VALUES (?, ?)',
        [studentId, name]
      );

      // 2. 新增帳號資料
      await connection.query(
        'INSERT INTO AppAccount (AccountID, Password) VALUES (?, ?)',
        [studentId, hashedPassword]
      );

      await connection.commit();
      connection.release();

      res.status(201).json({
        message: '註冊成功',
        student: { studentId, name }
      });
    } catch (err) {
      await connection.rollback();
      connection.release();
      throw err;
    }
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
    // 查詢學生與帳號資料
    const [rows] = await pool.query(
      `SELECT s.StudentID, s.Name, a.Password
       FROM Student s
       INNER JOIN AppAccount a ON s.StudentID = a.AccountID
       WHERE s.StudentID = ?`,
      [studentId]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: '學號或密碼錯誤' });
    }

    const student = rows[0];

    // 驗證密碼
    const isPasswordValid = await bcrypt.compare(password, student.Password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: '學號或密碼錯誤' });
    }

    // 更新最後登入時間
    await pool.query(
      'UPDATE AppAccount SET LastLogin = NOW() WHERE AccountID = ?',
      [studentId]
    );

    // 產生 JWT Token
    const token = jwt.sign(
      { studentId: student.StudentID, name: student.Name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' } // Token 7天有效
    );

    res.json({
      message: '登入成功',
      token,
      student: {
        studentId: student.StudentID,
        name: student.Name
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
      'SELECT StudentID, Name, CreatedAt FROM Student WHERE StudentID = ?',
      [req.user.studentId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: '找不到用戶資料' });
    }

    res.json({ student: rows[0] });
  } catch (error) {
    console.error('取得資料錯誤：', error);
    res.status(500).json({ error: '取得資料失敗' });
  }
}

module.exports = { register, login, getProfile };
