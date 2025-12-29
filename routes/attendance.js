const express = require('express');
const router = express.Router();
const { clockInOut, getTodayStatus, getRecords } = require('../controllers/attendanceController');
const { authenticateToken } = require('../middleware/auth');

// 所有路由都需要登入
router.use(authenticateToken);

// 單鍵打卡（上班或下班）
router.post('/clock', clockInOut);

// 查詢今日打卡狀態
router.get('/today', getTodayStatus);

// 查詢出勤紀錄
router.get('/records', getRecords);

module.exports = router;
