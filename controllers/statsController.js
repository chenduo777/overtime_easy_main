const { pool } = require('../config/database');
const { calculateOvertime, isWeekend } = require('../utils/overtimeCalculator');

// 取得個人統計（指定月份）- 使用即時計算加班時數
async function getMyStats(req, res) {
  const studentId = req.user.studentId;
  const { period } = req.query; // 格式：YYYY-MM

  // 如果沒有指定月份，使用當月
  const targetPeriod = period || new Date().toISOString().substring(0, 7);

  try {
    // 查詢該月份所有記錄
    const [records] = await pool.query(
      `SELECT
         DATE_FORMAT(work_date, '%Y-%m-%d') as work_date,
         clock_in,
         clock_out,
         work_minutes
       FROM AttendanceRecord
       WHERE student_id = ? AND DATE_FORMAT(work_date, '%Y-%m') = ?`,
      [studentId, targetPeriod]
    );

    // 計算統計數據
    let totalWorkMinutes = 0;
    let totalOvertimeMinutes = 0;
    const uniqueDates = new Set();

    records.forEach(r => {
      totalWorkMinutes += (r.work_minutes || 0);
      if (r.clock_in && r.clock_out) {
        totalOvertimeMinutes += calculateOvertime(r.clock_in, r.clock_out, r.work_date);
      }
      uniqueDates.add(r.work_date);
    });

    res.json({
      period: targetPeriod,
      attendance: {
        totalDays: new Date(targetPeriod.split('-')[0], targetPeriod.split('-')[1], 0).getDate(),
        completedDays: uniqueDates.size
      },
      work: {
        totalWorkMinutes: totalWorkMinutes,
        totalWorkHours: (totalWorkMinutes / 60).toFixed(2)
      },
      overtime: {
        totalOvertimeMinutes: totalOvertimeMinutes,
        totalOvertimeHours: (totalOvertimeMinutes / 60).toFixed(2)
      }
    });
  } catch (error) {
    console.error('統計查詢錯誤：', error);
    res.status(500).json({ error: '查詢失敗' });
  }
}

// 加班排行榜（Top N）- 使用後端即時計算精確加班時數
async function getOvertimeLeaderboard(req, res) {
  const { period, limit = 100 } = req.query;
  const targetPeriod = period || new Date().toISOString().substring(0, 7);

  try {
    // 構建日期條件
    let dateCondition = '';
    const queryParams = [];

    if (targetPeriod.includes('W')) {
      // 週查詢 (格式: YYYY-Www)
      const [year, week] = targetPeriod.split('-W');
      const yearWeekVal = year + week;
      dateCondition = 'YEARWEEK(ar.work_date, 1) = ?';
      queryParams.push(yearWeekVal);
    } else if (targetPeriod.length === 4) {
      // 年查詢
      dateCondition = "DATE_FORMAT(ar.work_date, '%Y') = ?";
      queryParams.push(targetPeriod);
    } else {
      // 月查詢
      dateCondition = "DATE_FORMAT(ar.work_date, '%Y-%m') = ?";
      queryParams.push(targetPeriod);
    }

    // 查詢所有學生及其出勤記錄
    const [records] = await pool.query(`
      SELECT 
        s.student_id,
        s.name,
        DATE_FORMAT(ar.work_date, '%Y-%m-%d') as work_date,
        ar.clock_in,
        ar.clock_out,
        ar.work_minutes
      FROM Student s
      LEFT JOIN AttendanceRecord ar ON s.student_id = ar.student_id
        AND ${dateCondition}
      ORDER BY s.student_id
    `, queryParams);

    // 使用精確計算彙整每位學生的加班時數
    const studentMap = new Map();
    
    for (const r of records) {
      if (!studentMap.has(r.student_id)) {
        studentMap.set(r.student_id, { 
          name: r.name, 
          totalOvertimeMinutes: 0 
        });
      }
      if (r.clock_in && r.clock_out && r.work_date) {
        const overtime = calculateOvertime(r.clock_in, r.clock_out, r.work_date);
        studentMap.get(r.student_id).totalOvertimeMinutes += overtime;
      }
    }

    // 轉換為陣列並排序
    const rankings = [...studentMap.entries()]
      .map(([studentId, data]) => ({
        studentId,
        name: data.name,
        totalOvertimeMinutes: data.totalOvertimeMinutes,
        totalOvertimeHours: (data.totalOvertimeMinutes / 60).toFixed(2)
      }))
      .sort((a, b) => b.totalOvertimeMinutes - a.totalOvertimeMinutes)
      .slice(0, parseInt(limit))
      .map((item, index) => ({ rank: index + 1, ...item }));

    res.json({
      period: targetPeriod,
      type: 'overtime',
      rankings
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

// 組別加班排行榜 - 按組別彙整加班時數
async function getTeamLeaderboard(req, res) {
  const { period } = req.query;
  const targetPeriod = period || new Date().toISOString().substring(0, 7);

  try {
    // 構建日期條件
    let dateCondition = '';
    const queryParams = [];

    if (targetPeriod.includes('W')) {
      const [year, week] = targetPeriod.split('-W');
      const yearWeekVal = year + week;
      dateCondition = 'YEARWEEK(ar.work_date, 1) = ?';
      queryParams.push(yearWeekVal);
    } else if (targetPeriod.length === 4) {
      dateCondition = "DATE_FORMAT(ar.work_date, '%Y') = ?";
      queryParams.push(targetPeriod);
    } else {
      dateCondition = "DATE_FORMAT(ar.work_date, '%Y-%m') = ?";
      queryParams.push(targetPeriod);
    }

    // 查詢所有組別及其學生的出勤記錄
    const [records] = await pool.query(`
      SELECT 
        t.team_id,
        t.team_name,
        s.student_id,
        DATE_FORMAT(ar.work_date, '%Y-%m-%d') as work_date,
        ar.clock_in,
        ar.clock_out
      FROM Team t
      LEFT JOIN Student s ON t.team_id = s.team_id
      LEFT JOIN AttendanceRecord ar ON s.student_id = ar.student_id
        AND ${dateCondition}
      ORDER BY t.team_id
    `, queryParams);

    // 彙整每組的加班時數
    const teamMap = new Map();
    
    for (const r of records) {
      if (!teamMap.has(r.team_id)) {
        teamMap.set(r.team_id, { 
          teamName: r.team_name, 
          totalOvertimeMinutes: 0,
          memberCount: new Set()
        });
      }
      if (r.student_id) {
        teamMap.get(r.team_id).memberCount.add(r.student_id);
      }
      if (r.clock_in && r.clock_out && r.work_date) {
        const overtime = calculateOvertime(r.clock_in, r.clock_out, r.work_date);
        teamMap.get(r.team_id).totalOvertimeMinutes += overtime;
      }
    }

    // 轉換為陣列並排序
    const rankings = [...teamMap.entries()]
      .map(([teamId, data]) => ({
        teamId,
        teamName: data.teamName,
        memberCount: data.memberCount.size,
        totalOvertimeMinutes: data.totalOvertimeMinutes,
        totalOvertimeHours: (data.totalOvertimeMinutes / 60).toFixed(2)
      }))
      .sort((a, b) => b.totalOvertimeMinutes - a.totalOvertimeMinutes)
      .map((item, index) => ({ rank: index + 1, ...item }));

    res.json({
      period: targetPeriod,
      type: 'team',
      rankings
    });
  } catch (error) {
    console.error('組別排行榜查詢錯誤：', error);
    res.status(500).json({ error: '查詢失敗' });
  }
}

// 綜合排行榜（總工時排行）- 使用後端即時計算
async function getCombinedLeaderboard(req, res) {
  const { period, limit = 100 } = req.query;
  const targetPeriod = period || new Date().toISOString().substring(0, 7);

  try {
    // 構建日期條件
    let dateCondition = '';
    const queryParams = [];

    if (targetPeriod.includes('W')) {
      const [year, week] = targetPeriod.split('-W');
      const yearWeekVal = year + week;
      dateCondition = 'YEARWEEK(ar.work_date, 1) = ?';
      queryParams.push(yearWeekVal);
    } else if (targetPeriod.length === 4) {
      dateCondition = "DATE_FORMAT(ar.work_date, '%Y') = ?";
      queryParams.push(targetPeriod);
    } else {
      dateCondition = "DATE_FORMAT(ar.work_date, '%Y-%m') = ?";
      queryParams.push(targetPeriod);
    }

    // 查詢所有學生及其出勤記錄
    const [records] = await pool.query(`
      SELECT 
        s.student_id,
        s.name,
        DATE_FORMAT(ar.work_date, '%Y-%m-%d') as work_date,
        ar.clock_in,
        ar.clock_out,
        ar.work_minutes
      FROM Student s
      LEFT JOIN AttendanceRecord ar ON s.student_id = ar.student_id
        AND ${dateCondition}
      ORDER BY s.student_id
    `, queryParams);

    // 彙整每位學生的工時和加班時數
    const studentMap = new Map();
    
    for (const r of records) {
      if (!studentMap.has(r.student_id)) {
        studentMap.set(r.student_id, { 
          name: r.name, 
          totalWorkMinutes: 0,
          totalOvertimeMinutes: 0 
        });
      }
      if (r.work_minutes) {
        studentMap.get(r.student_id).totalWorkMinutes += r.work_minutes;
      }
      if (r.clock_in && r.clock_out && r.work_date) {
        const overtime = calculateOvertime(r.clock_in, r.clock_out, r.work_date);
        studentMap.get(r.student_id).totalOvertimeMinutes += overtime;
      }
    }

    // 轉換為陣列並排序
    const rankings = [...studentMap.entries()]
      .map(([studentId, data]) => ({
        studentId,
        name: data.name,
        totalWorkMinutes: data.totalWorkMinutes,
        totalWorkHours: (data.totalWorkMinutes / 60).toFixed(2),
        totalOvertimeMinutes: data.totalOvertimeMinutes,
        totalOvertimeHours: (data.totalOvertimeMinutes / 60).toFixed(2)
      }))
      .sort((a, b) => b.totalWorkMinutes - a.totalWorkMinutes)
      .slice(0, parseInt(limit))
      .map((item, index) => ({ rank: index + 1, ...item }));

    res.json({
      period: targetPeriod,
      type: 'combined',
      description: '總工時排行',
      rankings
    });
  } catch (error) {
    console.error('排行榜查詢錯誤：', error);
    res.status(500).json({ error: '查詢失敗' });
  }
}

// 系統總覽 - 使用即時計算
async function getSystemOverview(req, res) {
  try {
    // 總學生數
    const [totalStudents] = await pool.query('SELECT COUNT(*) as total FROM Student');

    // 今日打卡人數
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const [todayClocks] = await pool.query(
      `SELECT
         COUNT(DISTINCT student_id) as clockedIn,
         COUNT(DISTINCT CASE WHEN clock_out IS NOT NULL THEN student_id END) as completed
       FROM AttendanceRecord
       WHERE work_date = ?`,
      [today]
    );

    // 本月統計 - 需要即時計算加班
    const currentPeriod = new Date().toISOString().substring(0, 7);
    const [monthlyRecords] = await pool.query(
      `SELECT 
         DATE_FORMAT(work_date, '%Y-%m-%d') as work_date,
         clock_in,
         clock_out,
         work_minutes
       FROM AttendanceRecord
       WHERE DATE_FORMAT(work_date, '%Y-%m') = ?`,
      [currentPeriod]
    );

    let totalWork = 0;
    let totalOvertime = 0;
    
    monthlyRecords.forEach(r => {
      totalWork += (r.work_minutes || 0);
      if (r.clock_in && r.clock_out) {
        totalOvertime += calculateOvertime(r.clock_in, r.clock_out, r.work_date);
      }
    });

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
        totalWorkHours: (totalWork / 60).toFixed(2),
        totalOvertimeHours: (totalOvertime / 60).toFixed(2)
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
  getTeamLeaderboard,
  getSystemOverview
};
