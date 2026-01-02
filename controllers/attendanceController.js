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
    // 排除 work_minutes = -1 的記錄（已被凌晨5點重置標記為待補打卡）
    const [unfinished] = await pool.query(
      `SELECT record_id, work_date, clock_in 
       FROM AttendanceRecord 
       WHERE student_id = ? AND clock_out IS NULL AND (work_minutes IS NULL OR work_minutes != -1)
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
    // 排除 work_minutes = -1 的記錄（已被凌晨5點重置標記為待補打卡）
    const [unfinished] = await pool.query(
      `SELECT record_id, work_date, clock_in
       FROM AttendanceRecord 
       WHERE student_id = ? AND clock_out IS NULL AND (work_minutes IS NULL OR work_minutes != -1)
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
        work_minutes: r.work_minutes,
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

/**
 * 補打卡下班（用於忘記打卡的記錄）
 * 允許時間範圍: 當日 20:00 ~ 隔日 05:00
 */
async function retroactiveClockOut(req, res) {
    const studentId = req.user.studentId;
    const { recordId, clockOutTime } = req.body;

    if (!recordId || !clockOutTime) {
        return res.status(400).json({ error: '缺少必要參數' });
    }

    try {
        // 1. 查詢該記錄
        const [records] = await pool.query(
            `SELECT record_id, student_id, work_date, clock_in, clock_out, work_minutes
             FROM AttendanceRecord 
             WHERE record_id = ? AND student_id = ?`,
            [recordId, studentId]
        );

        if (records.length === 0) {
            return res.status(404).json({ error: '找不到該記錄' });
        }

        const record = records[0];

        // 2. 驗證是否為待補打卡記錄（clock_out IS NULL）
        if (record.clock_out !== null) {
            return res.status(400).json({ error: '該記錄已有下班時間，無法補打卡' });
        }

        // 3. 驗證補打卡時間範圍
        const clockIn = new Date(record.clock_in);
        
        // 取得 work_date 字串（處理 Date 物件和字串格式）
        let workDateStr;
        if (typeof record.work_date === 'string') {
            workDateStr = record.work_date.split('T')[0];
        } else {
            // MySQL DATE 類型會返回 Date 物件，使用本地時間格式化
            const wd = record.work_date;
            workDateStr = `${wd.getFullYear()}-${String(wd.getMonth() + 1).padStart(2, '0')}-${String(wd.getDate()).padStart(2, '0')}`;
        }
        
        const clockOut = new Date(clockOutTime);
        
        // 確保 clockOut 大於 clockIn
        if (clockOut <= clockIn) {
            return res.status(400).json({ error: '下班時間必須晚於上班時間' });
        }

        // 驗證時間範圍 (20:00 ~ 隔天 05:00)
        // 使用本地時間來比對，避免 UTC 時區問題
        const clockOutHour = clockOut.getHours();
        const clockOutYear = clockOut.getFullYear();
        const clockOutMonth = String(clockOut.getMonth() + 1).padStart(2, '0');
        const clockOutDay = String(clockOut.getDate()).padStart(2, '0');
        const clockOutDateStr = `${clockOutYear}-${clockOutMonth}-${clockOutDay}`;
        
        // 計算 work_date 的隔天（使用本地時間）
        const [wdYear, wdMonth, wdDay] = workDateStr.split('-').map(Number);
        const workDateObj = new Date(wdYear, wdMonth - 1, wdDay);
        workDateObj.setDate(workDateObj.getDate() + 1);
        const nextDayYear = workDateObj.getFullYear();
        const nextDayMonth = String(workDateObj.getMonth() + 1).padStart(2, '0');
        const nextDayDay = String(workDateObj.getDate()).padStart(2, '0');
        const nextDayStr = `${nextDayYear}-${nextDayMonth}-${nextDayDay}`;

        const isValidTime = (
            // 當天 20:00-23:59
            (clockOutDateStr === workDateStr && clockOutHour >= 20) ||
            // 隔天 00:00-04:59
            (clockOutDateStr === nextDayStr && clockOutHour < 5)
        );

        if (!isValidTime) {
            return res.status(400).json({ 
                error: `補打卡時間必須在 ${workDateStr} 20:00 至 ${nextDayStr} 05:00 之間（您設定的是 ${clockOutDateStr} ${clockOutHour}:00）` 
            });
        }

        // 4. 計算工時
        const workMinutes = calculateWorkMinutes(clockIn, clockOut);
        const overtimeMinutes = calculateOvertime(clockIn, clockOut, workDateStr);

        // 5. 更新記錄
        await pool.query(
            `UPDATE AttendanceRecord 
             SET clock_out = ?, work_minutes = ?
             WHERE record_id = ?`,
            [clockOut, workMinutes, recordId]
        );

        // 6. 檢查成就
        const newRewards = await checkAndGrantRewardsForStudent(studentId);

        res.json({
            message: '補打卡成功',
            record: {
                record_id: recordId,
                work_date: workDateStr,
                clock_in: clockIn.toISOString(),
                clock_out: clockOut.toISOString(),
                work_minutes: workMinutes,
                overtime_minutes: overtimeMinutes
            },
            new_rewards: newRewards
        });

    } catch (error) {
        console.error('補打卡錯誤：', error);
        res.status(500).json({ error: '補打卡失敗' });
    }
}

module.exports = { clockInOut, getTodayStatus, getRecords, retroactiveClockOut };
