/**
 * 加班時數計算工具
 * 標準工時段：10:00 - 20:00
 * 加班定義：10:00 前 + 20:00 後的工作時間
 * 週末：全部工時都算加班
 */

/**
 * 計算加班時數（精確版：只計算 10:00 前 + 20:00 後時段）
 * @param {Date|string} clockIn - 上班打卡時間
 * @param {Date|string} clockOut - 下班打卡時間
 * @param {string} workDate - 工作日期 (YYYY-MM-DD)
 * @returns {number} 加班分鐘數
 */
function calculateOvertime(clockIn, clockOut, workDate) {
  if (!clockIn || !clockOut) return 0;

  const clockInDate = new Date(clockIn);
  const clockOutDate = new Date(clockOut);

  // 週末：全部算加班
  const dayOfWeek = new Date(workDate).getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return Math.floor((clockOutDate - clockInDate) / 60000);
  }

  // 平日：計算 10:00 前 + 20:00 後
  const baseDate = new Date(workDate);
  
  const standardStart = new Date(baseDate);
  standardStart.setHours(10, 0, 0, 0);
  
  const standardEnd = new Date(baseDate);
  standardEnd.setHours(20, 0, 0, 0);

  let overtimeMinutes = 0;

  // 10:00 前的加班
  if (clockInDate < standardStart) {
    const earlyEnd = clockOutDate < standardStart ? clockOutDate : standardStart;
    const earlyMinutes = Math.floor((earlyEnd - clockInDate) / 60000);
    if (earlyMinutes > 0) {
      overtimeMinutes += earlyMinutes;
    }
  }

  // 20:00 後的加班（支援跨日，clockOut 可能是隔天凌晨）
  if (clockOutDate > standardEnd) {
    const lateStart = clockInDate > standardEnd ? clockInDate : standardEnd;
    const lateMinutes = Math.floor((clockOutDate - lateStart) / 60000);
    if (lateMinutes > 0) {
      overtimeMinutes += lateMinutes;
    }
  }

  return overtimeMinutes;
}

/**
 * 計算總工時（分鐘）
 * @param {Date|string} clockIn - 上班打卡時間
 * @param {Date|string} clockOut - 下班打卡時間
 * @returns {number} 總工時分鐘數
 */
function calculateWorkMinutes(clockIn, clockOut) {
  if (!clockIn || !clockOut) return 0;
  
  const clockInDate = new Date(clockIn);
  const clockOutDate = new Date(clockOut);
  
  return Math.floor((clockOutDate - clockInDate) / 60000);
}

/**
 * 判斷是否為跨日打卡
 * @param {Date|string} clockIn - 上班打卡時間
 * @param {Date|string} clockOut - 下班打卡時間
 * @returns {boolean} 是否跨日
 */
function isOvernight(clockIn, clockOut) {
  if (!clockIn || !clockOut) return false;
  
  const inDate = new Date(clockIn).toDateString();
  const outDate = new Date(clockOut).toDateString();
  
  return inDate !== outDate;
}

/**
 * 判斷是否為週末
 * @param {string} workDate - 工作日期 (YYYY-MM-DD)
 * @returns {boolean} 是否為週末
 */
function isWeekend(workDate) {
  const dayOfWeek = new Date(workDate).getDay();
  return dayOfWeek === 0 || dayOfWeek === 6;
}

module.exports = {
  calculateOvertime,
  calculateWorkMinutes,
  isOvernight,
  isWeekend
};
