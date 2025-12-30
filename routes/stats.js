const express = require('express');
const router = express.Router();
const {
  getMyStats,
  getOvertimeLeaderboard,
  getViolationLeaderboard,
  getCombinedLeaderboard,
  getTeamLeaderboard,
  getSystemOverview
} = require('../controllers/statsController');
const { authenticateToken } = require('../middleware/auth');

// 所有路由都需要登入
router.use(authenticateToken);

// 個人統計
router.get('/my', getMyStats);

// 加班排行榜
router.get('/leaderboard/overtime', getOvertimeLeaderboard);

// 組別排行榜
router.get('/leaderboard/team', getTeamLeaderboard);

// 違規排行榜
router.get('/leaderboard/violation', getViolationLeaderboard);

// 綜合排行榜
router.get('/leaderboard/combined', getCombinedLeaderboard);

// 系統總覽（公開給所有登入用戶）
router.get('/overview', getSystemOverview);

module.exports = router;
