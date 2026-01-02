/**
 * 每日自動結算任務
 * 凌晨5點檢查所有「已上班但未下班」的記錄
 * 將這些記錄標記為系統終止（work_minutes = -1 表示待補打卡）
 */

const cron = require('node-cron');
const { pool } = require('../config/database');

// 結算時間設定
const RESET_HOUR = 5; // 凌晨5點

/**
 * 執行每日結算
 * 找出所有未打下班卡的記錄，標記為系統終止
 */
async function performDailyReset() {
    const now = new Date();
    console.log(`[${now.toISOString()}] 開始執行每日結算...`);

    try {
        // 查找所有未完成的打卡記錄（clock_out IS NULL 且 clock_in 超過1小時）
        // 這些記錄視為忘記打卡，需要被結算
        const [unfinishedRecords] = await pool.query(
            `SELECT record_id, student_id, work_date, clock_in 
             FROM AttendanceRecord 
             WHERE clock_out IS NULL 
               AND clock_in < DATE_SUB(NOW(), INTERVAL 1 HOUR)
             ORDER BY work_date DESC`
        );

        if (unfinishedRecords.length === 0) {
            console.log(`[${now.toISOString()}] 無需結算的記錄`);
            return { processed: 0 };
        }

        console.log(`[${now.toISOString()}] 發現 ${unfinishedRecords.length} 筆未完成記錄`);

        // 標記這些記錄為系統終止
        // 注意：clock_out 保持 NULL，用戶可以之後補打卡
        // 我們用 work_minutes = -1 作為「待補打卡」的標記
        const recordIds = unfinishedRecords.map(r => r.record_id);
        
        await pool.query(
            `UPDATE AttendanceRecord 
             SET work_minutes = -1
             WHERE record_id IN (?)`,
            [recordIds]
        );

        console.log(`[${now.toISOString()}] 已標記 ${recordIds.length} 筆記錄為待補打卡`);

        // 記錄日誌
        for (const record of unfinishedRecords) {
            console.log(`  - 學號: ${record.student_id}, 日期: ${record.work_date}, 上班: ${record.clock_in}`);
        }

        return { 
            processed: unfinishedRecords.length,
            records: unfinishedRecords 
        };

    } catch (error) {
        console.error(`[${now.toISOString()}] 每日結算錯誤:`, error);
        throw error;
    }
}

/**
 * 啟動定時任務
 * 每天凌晨5點執行
 */
function startDailyResetJob() {
    // Cron 表達式: 分 時 日 月 週
    // '0 5 * * *' = 每天凌晨5:00
    const cronExpression = `0 ${RESET_HOUR} * * *`;

    cron.schedule(cronExpression, async () => {
        console.log('='.repeat(50));
        console.log('執行每日自動結算任務');
        console.log('='.repeat(50));
        
        try {
            const result = await performDailyReset();
            console.log(`結算完成: ${result.processed} 筆記錄`);
        } catch (error) {
            console.error('結算任務失敗:', error);
        }
    }, {
        timezone: 'Asia/Taipei' // 使用台北時區
    });

    console.log(`📅 每日結算任務已啟動 (每天 ${RESET_HOUR}:00 執行)`);
}

/**
 * 手動觸發結算（用於測試或管理員操作）
 */
async function manualReset() {
    console.log('手動觸發每日結算...');
    return await performDailyReset();
}

module.exports = {
    startDailyResetJob,
    performDailyReset,
    manualReset,
    RESET_HOUR
};
