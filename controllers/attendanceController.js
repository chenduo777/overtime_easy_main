const { pool } = require('../config/database');
const { calculateOvertime, calculateWorkMinutes, isOvernight, isWeekend } = require('../utils/overtimeCalculator');
const { checkAndGrantRewardsForStudent } = require('./rewardController');

// 單鍵打卡（支援跨日）
async function clockInOut(req, res) {
  const studentId = req.user.studentId;
  const now = new Date();
  
  // 使用本地日期時間
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const today = `${year}-${month}-${day}`; // YYYY-MM-DD

  try {
    // 1. 先查是否有未完成的記錄（不限日期，支援跨日打卡）
    const [unfinished] = await pool.query(
      `SELECT record_id, work_date, clock_in 
       FROM AttendanceRecord 
       WHERE student_id = ? AND clock_out IS NULL
       ORDER BY work_date DESC, clock_in DESC
       LIMIT 1`,
      [studentId]
    );

    // 2. 有未完成記錄 → 補打下班卡（支援跨日）
    if (unfinished.length > 0) {
      const record = unfinished[0];
      const clockIn = new Date(record.clock_in);
      const clockOut = now;
      const workDate = record.work_date;
      
      // 格式化 work_date
      const workDateStr = typeof workDate === 'string' 
        ? workDate.split('T')[0] 
        : workDate.toISOString().split('T')[0];

      // 計算工時
      const workMinutes = calculateWorkMinutes(clockIn, clockOut);
      const overtimeMinutes = calculateOvertime(clockIn, clockOut, workDateStr);
      const overnight = isOvernight(clockIn, clockOut);

      await pool.query(
        `UPDATE AttendanceRecord 
         SET clock_out = ?, work_minutes = ?
         WHERE record_id = ?`,
        [clockOut, workMinutes, record.record_id]
      );

      // 下班打卡後自動檢查成就
      const newRewards = await checkAndGrantRewardsForStudent(studentId);

      return res.json({
        message: overnight ? '下班打卡成功（跨日）' : '下班打卡成功',
        action: 'clock_out',
        record_id: record.record_id,
        work_date: workDateStr,
        clock_in: clockIn.toISOString(),
        clock_out: clockOut.toISOString(),
        work_minutes: workMinutes,
        overtime_minutes: overtimeMinutes,
        is_overnight: overnight,
        is_weekend: isWeekend(workDateStr),
        new_rewards: newRewards
      });
    }

    // 3. 無未完成記錄 → 新增上班打卡
    const [result] = await pool.query(
      `INSERT INTO AttendanceRecord (student_id, work_date, clock_in)
       VALUES (?, ?, ?)`,
      [studentId, today, now]
    );

    return res.json({
      message: '上班打卡成功',
      action: 'clock_in',
      record_id: result.insertId,
      work_date: today,
      clock_in: now.toISOString(),
      is_weekend: isWeekend(today)
    });

  } catch (error) {
    console.error('打卡錯誤：', error);
    res.status(500).json({ error: '打卡失敗，請稍後再試' });
  }
}

// 查詢今日打卡狀態
async function getTodayStatus(req, res) {
  const studentId = req.user.studentId;
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  try {
    // 查詢是否有未完成的打卡記錄（支援跨日）
    const [unfinished] = await pool.query(
      `SELECT record_id, work_date, clock_in
       FROM AttendanceRecord 
       WHERE student_id = ? AND clock_out IS NULL
       ORDER BY work_date DESC, clock_in DESC
       LIMIT 1`,
      [studentId]
    );

    // 查詢今天的所有紀錄
    const [todayRecords] = await pool.query(
      `SELECT record_id, clock_in, clock_out, work_minutes
       FROM AttendanceRecord
       WHERE student_id = ? AND work_date = ?
       ORDER BY clock_in DESC`,
      [studentId, today]
    );

    // 計算今日總計（包含即時計算的加班時數）
    let totalWorkMinutes = 0;
    let totalOvertimeMinutes = 0;

    todayRecords.forEach(r => {
      totalWorkMinutes += (r.work_minutes || 0);
      if (r.clock_in && r.clock_out) {
        totalOvertimeMinutes += calculateOvertime(r.clock_in, r.clock_out, today);
      }
    });

    // 如果有未完成的記錄，表示「上班中」
    const isClockedIn = unfinished.length > 0;

    if (todayRecords.length === 0 && !isClockedIn) {
      return res.json({
        hasClocked: false,
        message: '今天尚未打卡',
        date: today
      });
    }

    // 取最新的一筆（可能是今天的，或是未完成的跨日記錄）
    const latestRecord = isClockedIn ? unfinished[0] : todayRecords[0];

    res.json({
      hasClocked: isClockedIn,
      record: {
        record_id: latestRecord.record_id,
        work_date: latestRecord.work_date,
        clock_in: latestRecord.clock_in,
        clock_out: latestRecord.clock_out || null,
        isCompleted: !isClockedIn,
        work_minutes: totalWorkMinutes,
        overtime_minutes: totalOvertimeMinutes
      },
      date: today,
      is_weekend: isWeekend(today)
    });
  } catch (error) {
    console.error('查詢錯誤：', error);
    res.status(500).json({ error: '查詢失敗' });
  }
}

// 查詢出勤紀錄（可選日期範圍）
async function getRecords(req, res) {
  const studentId = req.user.studentId;
  const { startDate, endDate } = req.query;

  try {
    let query = `
      SELECT
        record_id,
        student_id,
        DATE_FORMAT(work_date, '%Y-%m-%d') as work_date,
        clock_in,
        clock_out,
        work_minutes
      FROM AttendanceRecord
      WHERE student_id = ?
    `;
    const params = [studentId];

    if (startDate) {
      query += ' AND work_date >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND work_date <= ?';
      params.push(endDate);
    }

    query += ' ORDER BY work_date DESC, clock_in DESC';

    const [records] = await pool.query(query, params);

    // 為每筆記錄計算加班時數和跨日標記
    const enrichedRecords = records.map(r => {
      const overtimeMinutes = calculateOvertime(r.clock_in, r.clock_out, r.work_date);
      const overnight = isOvernight(r.clock_in, r.clock_out);
      
      return {
        record_id: r.record_id,
        student_id: r.student_id,
        work_date: r.work_date,
        clock_in: r.clock_in,
        clock_out: r.clock_out,
        work_minutes: r.work_minutes || 0,
        overtime_minutes: overtimeMinutes,
        is_overnight: overnight,
        is_weekend: isWeekend(r.work_date)
      };
    });

    res.json({
      total: enrichedRecords.length,
      records: enrichedRecords
    });
  } catch (error) {
    console.error('查詢錯誤：', error);
    res.status(500).json({ error: '查詢失敗' });
  }
}

module.exports = { clockInOut, getTodayStatus, getRecords };
