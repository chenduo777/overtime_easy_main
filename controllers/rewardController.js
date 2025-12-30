const { pool } = require('../config/database');
const { calculateOvertime } = require('../utils/overtimeCalculator');

// 成就條件定義
const REWARD_CONDITIONS = {
  // Bronze 成就
  1: { type: 'total_overtime', threshold: 60 },        // 初出茅廬: 總加班 ≥ 1小時 (60分鐘)
  2: { type: 'early_bird', threshold: 1 },             // 早早就來: 09:30前打卡至少1次
  3: { type: 'night_knight', threshold: 1 },           // 黑夜騎士: 23:30後下班至少1次
  
  // Silver 成就  
  4: { type: 'long_day', threshold: 780 },             // 心肝情願: 單日工時 ≥ 13小時 (780分鐘)
  5: { type: 'total_overtime', threshold: 3000 },      // 肝肝臟: 總加班 ≥ 50小時 (3000分鐘)
  6: { type: 'kurapika', threshold: 1 },               // 庫拉皮卡: 02:00後下班至少1次
  
  // Gold 成就
  7: { type: 'total_overtime', threshold: 6000 },      // 百班無奈: 總加班 ≥ 100小時 (6000分鐘)
  8: { type: 'total_overtime', threshold: 60000 }      // 實驗室肝帝: 總加班 ≥ 1000小時 (60000分鐘)
};

// 計算學生的總加班時數（分鐘）
async function calculateTotalOvertime(studentId) {
  const [records] = await pool.query(
    `SELECT 
       DATE_FORMAT(work_date, '%Y-%m-%d') as work_date,
       clock_in,
       clock_out
     FROM AttendanceRecord
     WHERE student_id = ? AND clock_in IS NOT NULL AND clock_out IS NOT NULL`,
    [studentId]
  );

  let totalMinutes = 0;
  for (const r of records) {
    totalMinutes += calculateOvertime(r.clock_in, r.clock_out, r.work_date);
  }
  return totalMinutes;
}

// 檢查早早就來 (09:30前打卡)
async function checkEarlyBird(studentId) {
  const [result] = await pool.query(
    `SELECT COUNT(*) as count
     FROM AttendanceRecord
     WHERE student_id = ? 
       AND TIME(clock_in) < '09:30:00'
       AND clock_in IS NOT NULL`,
    [studentId]
  );
  return result[0].count;
}

// 檢查黑夜騎士 (23:30後下班，或跨日下班)
async function checkNightKnight(studentId) {
  const [result] = await pool.query(
    `SELECT COUNT(*) as count
     FROM AttendanceRecord
     WHERE student_id = ?
       AND (
         TIME(clock_out) >= '23:30:00'
         OR DATE(clock_out) > work_date
       )
       AND clock_out IS NOT NULL`,
    [studentId]
  );
  return result[0].count;
}

// 檢查心肝情願 (單日工時 ≥ 13小時)
async function checkLongDay(studentId) {
  const [result] = await pool.query(
    `SELECT COUNT(*) as count
     FROM AttendanceRecord
     WHERE student_id = ?
       AND work_minutes >= 780`,
    [studentId]
  );
  return result[0].count;
}

// 檢查庫拉皮卡 (02:00後下班，跨日)
async function checkKurapika(studentId) {
  const [result] = await pool.query(
    `SELECT COUNT(*) as count
     FROM AttendanceRecord
     WHERE student_id = ?
       AND DATE(clock_out) > work_date
       AND TIME(clock_out) >= '02:00:00'
       AND clock_out IS NOT NULL`,
    [studentId]
  );
  return result[0].count;
}

// 檢查單一成就是否達成
async function checkRewardCondition(studentId, rewardId) {
  const condition = REWARD_CONDITIONS[rewardId];
  if (!condition) return false;

  let value = 0;
  
  switch (condition.type) {
    case 'total_overtime':
      value = await calculateTotalOvertime(studentId);
      break;
    case 'early_bird':
      value = await checkEarlyBird(studentId);
      break;
    case 'night_knight':
      value = await checkNightKnight(studentId);
      break;
    case 'long_day':
      value = await checkLongDay(studentId);
      break;
    case 'kurapika':
      value = await checkKurapika(studentId);
      break;
    default:
      return false;
  }

  return value >= condition.threshold;
}

// ====== API 函數 ======

// 取得所有成就定義（含完成人數）
async function getAllRewards(req, res) {
  try {
    const [rewards] = await pool.query(`
      SELECT 
        r.reward_id,
        r.title,
        r.description,
        r.level,
        r.icon_url,
        COUNT(sr.id) as earned_count
      FROM Reward r
      LEFT JOIN StudentReward sr ON r.reward_id = sr.reward_id
      GROUP BY r.reward_id, r.title, r.description, r.level, r.icon_url
      ORDER BY 
        FIELD(r.level, 'Gold', 'Silver', 'Bronze'),
        r.reward_id
    `);

    res.json({ rewards });
  } catch (error) {
    console.error('取得成就錯誤：', error);
    res.status(500).json({ error: '取得成就失敗' });
  }
}

// 取得當前用戶已獲得的成就
async function getMyRewards(req, res) {
  const studentId = req.user.studentId;

  try {
    const [rewards] = await pool.query(`
      SELECT 
        r.reward_id,
        r.title,
        r.description,
        r.level,
        r.icon_url,
        sr.earned_at
      FROM StudentReward sr
      JOIN Reward r ON sr.reward_id = r.reward_id
      WHERE sr.student_id = ?
      ORDER BY sr.earned_at DESC
    `, [studentId]);

    res.json({ rewards });
  } catch (error) {
    console.error('取得我的成就錯誤：', error);
    res.status(500).json({ error: '取得成就失敗' });
  }
}

// 檢查並授予成就（給內部使用）
async function checkAndGrantRewardsForStudent(studentId) {
  try {
    // 取得所有成就
    const [allRewards] = await pool.query('SELECT reward_id FROM Reward');
    
    // 取得學生已獲得的成就
    const [earnedRewards] = await pool.query(
      'SELECT reward_id FROM StudentReward WHERE student_id = ?',
      [studentId]
    );
    const earnedIds = new Set(earnedRewards.map(r => r.reward_id));

    const newlyEarned = [];

    // 檢查每個未獲得的成就
    for (const reward of allRewards) {
      if (earnedIds.has(reward.reward_id)) continue;

      const isEarned = await checkRewardCondition(studentId, reward.reward_id);
      
      if (isEarned) {
        // 授予成就
        await pool.query(
          'INSERT IGNORE INTO StudentReward (student_id, reward_id, earned_at) VALUES (?, ?, NOW())',
          [studentId, reward.reward_id]
        );
        newlyEarned.push(reward.reward_id);
      }
    }

    return newlyEarned;
  } catch (error) {
    console.error('檢查成就錯誤：', error);
    return [];
  }
}

// 檢查並授予成就（API 端點）
async function checkAndGrantRewards(req, res) {
  const studentId = req.user.studentId;

  try {
    const newlyEarned = await checkAndGrantRewardsForStudent(studentId);

    if (newlyEarned.length > 0) {
      // 取得新獲得成就的詳細資料
      const [rewards] = await pool.query(
        `SELECT reward_id, title, level, icon_url FROM Reward WHERE reward_id IN (?)`,
        [newlyEarned]
      );
      
      res.json({
        message: '恭喜獲得新成就！',
        newRewards: rewards
      });
    } else {
      res.json({
        message: '繼續努力！',
        newRewards: []
      });
    }
  } catch (error) {
    console.error('檢查成就錯誤：', error);
    res.status(500).json({ error: '檢查成就失敗' });
  }
}

// 取得成就完成者名單
async function getRewardEarners(req, res) {
  const { rewardId } = req.params;

  try {
    const [earners] = await pool.query(`
      SELECT 
        s.student_id,
        s.name,
        sr.earned_at
      FROM StudentReward sr
      JOIN Student s ON sr.student_id = s.student_id
      WHERE sr.reward_id = ?
      ORDER BY sr.earned_at ASC
    `, [rewardId]);

    res.json({ earners });
  } catch (error) {
    console.error('取得成就完成者錯誤：', error);
    res.status(500).json({ error: '查詢失敗' });
  }
}

module.exports = {
  getAllRewards,
  getMyRewards,
  checkAndGrantRewards,
  checkAndGrantRewardsForStudent,
  getRewardEarners
};
