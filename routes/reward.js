const express = require('express');
const router = express.Router();
const {
  getAllRewards,
  getMyRewards,
  checkAndGrantRewards,
  getRewardEarners
} = require('../controllers/rewardController');
const { authenticateToken } = require('../middleware/auth');

// 所有路由都需要登入
router.use(authenticateToken);

// 取得所有成就定義（含完成人數）
router.get('/all', getAllRewards);

// 取得我的成就
router.get('/my', getMyRewards);

// 手動觸發成就檢查
router.post('/check', checkAndGrantRewards);

// 取得成就完成者名單
router.get('/earners/:rewardId', getRewardEarners);

module.exports = router;
