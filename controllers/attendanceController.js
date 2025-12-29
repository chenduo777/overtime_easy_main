const { pool } = require('../config/database');

// 工作時間常數
const WORK_START = '10:00:00';
const WORK_END = '20:00:00';

// 計算工時、加班（支援跨日）
function calculateWorkTime(clockInTime, clockOutTime, workDate) {
  // 建立完整的日期時間物件
  const clockInDateTime = new Date(`${workDate}T${clockInTime}`);
  let clockOutDateTime = new Date(`${workDate}T${clockOutTime}`);

  // 處理跨日：如果下班時間 <= 上班時間，表示跨日了
  if (clockOutDateTime <= clockInDateTime) {
    clockOutDateTime.setDate(clockOutDateTime.getDate() + 1);
  }

  // 總工時（分鐘）
  const totalMinutes = Math.round((clockOutDateTime - clockInDateTime) / 60000);

  // 標準工時段：10:00-20:00
  const workStartDateTime = new Date(`${workDate}T10:00:00`);
  const workEndDateTime = new Date(`${workDate}T20:00:00`);

  // 計算與標準工時段的重疊時間
  const overlapStart = clockInDateTime > workStartDateTime ? clockInDateTime : workStartDateTime;
  const overlapEnd = clockOutDateTime < workEndDateTime ? clockOutDateTime : workEndDateTime;

  let standardMinutes = 0;
  if (overlapEnd > overlapStart) {
    standardMinutes = Math.round((overlapEnd - overlapStart) / 60000);
  }

  // 加班 = 總工時 - 標準工時
  const overtimeMinutes = totalMinutes - standardMinutes;

  return {
    workMinutes: totalMinutes,
    overtimeMinutes: overtimeMinutes
  };
}

// 單鍵打卡
async function clockInOut(req, res) {
  const studentId = req.user.studentId;
  const now = new Date();
  // 使用本地日期，避免 UTC 時區偏移
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const today = `${year}-${month}-${day}`; // YYYY-MM-DD
  const currentTime = now.toTimeString().split(' ')[0]; // HH:MM:SS

  try {
    // 1. 確保今天的日期存在於 WorkDate 表
    const weekday = now.getDay(); // 0=週日, 1=週一, ..., 6=週六
    const isHoliday = (weekday === 0 || weekday === 6) ? 1 : 0;

    await pool.query(
      `INSERT IGNORE INTO WorkDate (WorkDate, Weekday, IsHoliday)
       VALUES (?, ?, ?)`,
      [today, weekday, isHoliday]
    );

    // 2. 查詢今天的所有打卡紀錄，按時間排序
    const [records] = await pool.query(
      `SELECT RecordID, ClockIn, ClockOut FROM AttendanceRecord
       WHERE StudentID = ? AND WorkDate = ?
       ORDER BY ClockIn DESC`,
      [studentId, today]
    );

    // 3. 判斷打卡邏輯
    // 如果沒有紀錄，或最新的一筆紀錄已經有 ClockOut -> 新增一筆 (ClockIn)
    if (records.length === 0 || records[0].ClockOut) {
      const [result] = await pool.query(
        `INSERT INTO AttendanceRecord (StudentID, WorkDate, ClockIn)
         VALUES (?, ?, ?)`,
        [studentId, today, currentTime]
      );

      return res.json({
        message: '上班打卡成功',
        action: 'clock_in',
        recordId: result.insertId,
        clockIn: currentTime,
        date: today
      });
    }

    // 4. 如果最新的一筆紀錄沒有 ClockOut -> 更新這筆 (ClockOut)
    const record = records[0];
    const clockIn = record.ClockIn;
    const clockOut = currentTime;

    // 查詢是否為假日
    const [dateInfo] = await pool.query(
      'SELECT IsHoliday FROM WorkDate WHERE WorkDate = ?',
      [today]
    );
    const isHolidayToday = dateInfo[0].IsHoliday === 1;

    let workMinutes = 0;
    let overtimeMinutes = 0;

    if (isHolidayToday) {
      // 假日（週六、週日）→ 全部算加班
      const clockInDateTime = new Date(`${today}T${clockIn}`);
      let clockOutDateTime = new Date(`${today}T${clockOut}`);

      // 處理跨日
      if (clockOutDateTime <= clockInDateTime) {
        clockOutDateTime.setDate(clockOutDateTime.getDate() + 1);
      }

      workMinutes = Math.round((clockOutDateTime - clockInDateTime) / 60000);
      overtimeMinutes = workMinutes;
    } else {
      // 平日邏輯
      const result = calculateWorkTime(clockIn, clockOut, today);
      workMinutes = result.workMinutes;
      overtimeMinutes = result.overtimeMinutes;
    }

    // 更新紀錄（不再記錄違規時間）
    await pool.query(
      `UPDATE AttendanceRecord
       SET ClockOut = ?, WorkMinutes = ?, OvertimeMinutes = ?
       WHERE RecordID = ?`,
      [clockOut, workMinutes, overtimeMinutes, record.RecordID]
    );

    // 移除 updateSummaries，改為即時查詢

    res.json({
      message: '下班打卡成功',
      action: 'clock_out',
      recordId: record.RecordID,
      clockIn: clockIn,
      clockOut: clockOut,
      date: today,
      workMinutes,
      overtimeMinutes,
      isHoliday: isHolidayToday
    });
  } catch (error) {
    console.error('打卡錯誤：', error);
    res.status(500).json({ error: '打卡失敗，請稍後再試' });
  }
}

// 更新統計資料
async function updateSummaries(studentId, period) {
  try {
    // 計算加班總時數
    const [overtimeData] = await pool.query(
      `SELECT SUM(OvertimeMinutes) as total
       FROM AttendanceRecord
       WHERE StudentID = ? AND DATE_FORMAT(WorkDate, '%Y-%m') = ?`,
      [studentId, period]
    );

    const totalOvertime = overtimeData[0].total || 0;

    // 更新或插入加班統計
    await pool.query(
      `INSERT INTO OvertimeSummary (StudentID, Period, TotalOvertimeMinutes)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE TotalOvertimeMinutes = ?`,
      [studentId, period, totalOvertime, totalOvertime]
    );

    // 計算違規統計
    const [violationData] = await pool.query(
      `SELECT
         SUM(CASE WHEN ViolationMinutes > 0 THEN 1 ELSE 0 END) as earlyLeaveCount,
         SUM(IsAbsent) as absenceCount,
         SUM(ViolationMinutes) as totalViolation
       FROM AttendanceRecord
       WHERE StudentID = ? AND DATE_FORMAT(WorkDate, '%Y-%m') = ?`,
      [studentId, period]
    );

    const { earlyLeaveCount, absenceCount, totalViolation } = violationData[0];

    // 更新或插入違規統計
    await pool.query(
      `INSERT INTO ViolationSummary (StudentID, Period, EarlyLeaveCount, AbsenceCount, TotalViolationMinutes)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         EarlyLeaveCount = ?,
         AbsenceCount = ?,
         TotalViolationMinutes = ?`,
      [
        studentId, period,
        earlyLeaveCount || 0,
        absenceCount || 0,
        totalViolation || 0,
        earlyLeaveCount || 0,
        absenceCount || 0,
        totalViolation || 0
      ]
    );
  } catch (error) {
    console.error('更新統計失敗：', error);
  }
}

// 查詢今日打卡狀態
async function getTodayStatus(req, res) {
  const studentId = req.user.studentId;
  // 使用本地日期，避免 UTC 時區偏移
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  try {
    // 查詢今天的所有紀錄，按時間排序
    const [records] = await pool.query(
      `SELECT RecordID, ClockIn, ClockOut, WorkMinutes, OvertimeMinutes, ViolationMinutes
       FROM AttendanceRecord
       WHERE StudentID = ? AND WorkDate = ?
       ORDER BY ClockIn DESC`,
      [studentId, today]
    );

    if (records.length === 0) {
      return res.json({
        hasClocked: false,
        message: '今天尚未打卡',
        date: today
      });
    }

    // 取最新的一筆
    const latestRecord = records[0];

    // 如果最新的一筆已經有下班時間，表示目前是「已下班」狀態（可以再次上班）
    // 如果沒有下班時間，表示目前是「上班中」狀態
    const isClockedIn = !latestRecord.ClockOut;

    // 計算今日總計
    let totalWorkMinutes = 0;
    let totalOvertimeMinutes = 0;

    records.forEach(r => {
      totalWorkMinutes += (r.WorkMinutes || 0);
      totalOvertimeMinutes += (r.OvertimeMinutes || 0);
    });

    res.json({
      hasClocked: isClockedIn, // 前端用這個判斷顯示「上班」還是「下班」按鈕
      record: {
        ...latestRecord,
        isCompleted: !!latestRecord.ClockOut,
        WorkMinutes: totalWorkMinutes, // 返回今日總計
        OvertimeMinutes: totalOvertimeMinutes // 返回今日總計
      },
      date: today
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
        ar.RecordID,
        ar.StudentID,
        DATE_FORMAT(ar.WorkDate, '%Y-%m-%d') as WorkDate,
        ar.ClockIn,
        ar.ClockOut,
        ar.WorkMinutes,
        ar.OvertimeMinutes,
        ar.ViolationMinutes,
        ar.IsAbsent,
        ar.CreatedAt,
        ar.UpdatedAt,
        wd.IsHoliday
      FROM AttendanceRecord ar
      INNER JOIN WorkDate wd ON ar.WorkDate = wd.WorkDate
      WHERE ar.StudentID = ?
    `;
    const params = [studentId];

    if (startDate) {
      query += ' AND ar.WorkDate >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND ar.WorkDate <= ?';
      params.push(endDate);
    }

    query += ' ORDER BY ar.WorkDate DESC';

    const [records] = await pool.query(query, params);

    res.json({
      total: records.length,
      records
    });
  } catch (error) {
    console.error('查詢錯誤：', error);
    res.status(500).json({ error: '查詢失敗' });
  }
}

module.exports = { clockInOut, getTodayStatus, getRecords };
