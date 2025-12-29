const express = require('express');
const router = express.Router();
const { register, login, getProfile } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

// 註冊
router.post('/register', register);

// 登入
router.post('/login', login);

// 取得個人資料（需要登入）
router.get('/profile', authenticateToken, getProfile);

module.exports = router;
