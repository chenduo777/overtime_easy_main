const { pool } = require('../config/database');

// 取得個人統計（指定月份）
async function getMyStats(req, res) {
  const studentId = req.user.studentId;
  const { period } = req.query; // 格式：YYYY-MM

  // 如果沒有指定月份，使用當月
  const targetPeriod = period || new Date().toISOString().substring(0, 7);

  try {
    // 查詢統計數據
    const [stats] = await pool.query(
      `SELECT
         SUM(WorkMinutes) as TotalWorkMinutes,
         SUM(OvertimeMinutes) as TotalOvertimeMinutes,
         COUNT(DISTINCT WorkDate) as AttendanceDays
       FROM AttendanceRecord
       WHERE StudentID = ? AND DATE_FORMAT(WorkDate, '%Y-%m') = ?`,
      [studentId, targetPeriod]
    );

    const data = stats[0];

    res.json({
      period: targetPeriod,
      attendance: {
        totalDays: new Date(targetPeriod.split('-')[0], targetPeriod.split('-')[1], 0).getDate(), // 當月總天數
        completedDays: data.AttendanceDays || 0
      },
      work: {
        TotalWorkMinutes: data.TotalWorkMinutes || 0,
        TotalWorkHours: ((data.TotalWorkMinutes || 0) / 60).toFixed(2)
      },
      overtime: {
        TotalOvertimeMinutes: data.TotalOvertimeMinutes || 0,
        TotalOvertimeHours: ((data.TotalOvertimeMinutes || 0) / 60).toFixed(2)
      }
    });
  } catch (error) {
    console.error('統計查詢錯誤：', error);
    res.status(500).json({ error: '查詢失敗' });
  }
}

// 加班排行榜（Top N）
async function getOvertimeLeaderboard(req, res) {
  const { period, limit = 100 } = req.query; // Default limit increased to show more
  // 支援 YYYY-MM 或 YYYY
  const targetPeriod = period || new Date().toISOString().substring(0, 7);
  const dateFormat = targetPeriod.length === 4 ? '%Y' : '%Y-%m';

  try {
    let sql = `
      SELECT
        s.StudentID,
        s.Name,
        COALESCE(SUM(ar.OvertimeMinutes), 0) as TotalOvertimeMinutes
      FROM Student s
      LEFT JOIN AttendanceRecord ar ON s.StudentID = ar.StudentID
    `;

    const queryParams = [];

    // 判斷是否為週查詢 (格式: YYYY-Www)
    if (targetPeriod.includes('W')) {
      // 週查詢
      const [year, week] = targetPeriod.split('-W');
      // MySQL YEARWEEK mode 1: Monday is first day of week
      // We construct a date string for the Monday of that week to use with YEARWEEK

      const yearWeekVal = year + week;
      sql += ` AND YEARWEEK(ar.WorkDate, 1) = ?`;
      queryParams.push(yearWeekVal);
    } else {
      // 月或年查詢
      sql += ` AND DATE_FORMAT(ar.WorkDate, ?) = ?`;
      queryParams.push(dateFormat, targetPeriod);
    }

    sql += `
      GROUP BY s.StudentID, s.Name
      ORDER BY TotalOvertimeMinutes DESC, s.StudentID ASC
      LIMIT ?`;

    queryParams.push(parseInt(limit));

    const [rankings] = await pool.query(sql, queryParams);

    res.json({
      period: targetPeriod,
      type: 'overtime',
      rankings: rankings.map((r, index) => ({
        rank: index + 1,
        studentId: r.StudentID,
        name: r.Name,
        totalOvertimeMinutes: r.TotalOvertimeMinutes,
        totalOvertimeHours: (r.TotalOvertimeMinutes / 60).toFixed(2)
      }))
    });
  } catch (error) {
    console.error('排行榜查詢錯誤：', error);
    res.status(500).json({ error: '查詢失敗' });
  }
}

// 違規排行榜已移除 - 系統不再追蹤違規記錄
async function getViolationLeaderboard(req, res) {
  res.json({
    message: '違規功能已移除',
    period: req.query.period || new Date().toISOString().substring(0, 7),
    type: 'violation',
    rankings: []
  });
}

// 綜合排行榜（總工時排行）
async function getCombinedLeaderboard(req, res) {
  const { period, limit = 100 } = req.query;
  const targetPeriod = period || new Date().toISOString().substring(0, 7);
  const dateFormat = targetPeriod.length === 4 ? '%Y' : '%Y-%m';

  try {
    let sql = `
      SELECT
        s.StudentID,
        s.Name,
        COALESCE(SUM(ar.WorkMinutes), 0) as TotalWorkMinutes,
        COALESCE(SUM(ar.OvertimeMinutes), 0) as TotalOvertimeMinutes
      FROM Student s
      LEFT JOIN AttendanceRecord ar ON s.StudentID = ar.StudentID
    `;

    const queryParams = [];

    if (targetPeriod.includes('W')) {
      const [year, week] = targetPeriod.split('-W');
      const yearWeekVal = year + week;
      sql += ` AND YEARWEEK(ar.WorkDate, 1) = ?`;
      queryParams.push(yearWeekVal);
    } else {
      sql += ` AND DATE_FORMAT(ar.WorkDate, ?) = ?`;
      queryParams.push(dateFormat, targetPeriod);
    }

    sql += `
      GROUP BY s.StudentID, s.Name
      ORDER BY TotalWorkMinutes DESC, s.StudentID ASC
      LIMIT ?`;

    queryParams.push(parseInt(limit));

    const [rankings] = await pool.query(sql, queryParams);

    res.json({
      period: targetPeriod,
      type: 'combined',
      description: '總工時排行',
      rankings: rankings.map((r, index) => ({
        rank: index + 1,
        studentId: r.StudentID,
        name: r.Name,
        totalWorkMinutes: r.TotalWorkMinutes,
        totalWorkHours: (r.TotalWorkMinutes / 60).toFixed(2),
        totalOvertimeMinutes: r.TotalOvertimeMinutes,
        totalOvertimeHours: (r.TotalOvertimeMinutes / 60).toFixed(2)
      }))
    });
  } catch (error) {
    console.error('排行榜查詢錯誤：', error);
    res.status(500).json({ error: '查詢失敗' });
  }
}

// 系統總覽
async function getSystemOverview(req, res) {
  try {
    // 總學生數
    const [totalStudents] = await pool.query('SELECT COUNT(*) as total FROM Student');

    // 今日打卡人數（使用本地日期，避免 UTC 時區偏移）
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const [todayClocks] = await pool.query(
      `SELECT
         COUNT(DISTINCT StudentID) as clockedIn,
         COUNT(DISTINCT CASE WHEN ClockOut IS NOT NULL THEN StudentID END) as completed
       FROM AttendanceRecord
       WHERE WorkDate = ?`,
      [today]
    );

    // 本月統計
    const currentPeriod = new Date().toISOString().substring(0, 7);
    const [monthlyStats] = await pool.query(
      `SELECT
         SUM(WorkMinutes) as totalWork,
         SUM(OvertimeMinutes) as totalOvertime
       FROM AttendanceRecord
       WHERE DATE_FORMAT(WorkDate, '%Y-%m') = ?`,
      [currentPeriod]
    );

    res.json({
      students: {
        total: totalStudents[0].total
      },
      today: {
        date: today,
        clockedIn: todayClocks[0].clockedIn || 0,
        completed: todayClocks[0].completed || 0
      },
      thisMonth: {
        period: currentPeriod,
        totalWorkHours: ((monthlyStats[0].totalWork || 0) / 60).toFixed(2),
        totalOvertimeHours: ((monthlyStats[0].totalOvertime || 0) / 60).toFixed(2)
      }
    });
  } catch (error) {
    console.error('總覽查詢錯誤：', error);
    res.status(500).json({ error: '查詢失敗' });
  }
}

module.exports = {
  getMyStats,
  getOvertimeLeaderboard,
  getViolationLeaderboard,
  getCombinedLeaderboard,
  getSystemOverview
};
