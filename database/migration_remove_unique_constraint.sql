-- ============================================
-- 遷移腳本：移除每天只能打卡一次的限制
-- 執行日期：2025-11-20
-- 目的：允許一天多次打卡（多個工作段）
-- ============================================

USE overtime_easy;

-- 刪除唯一約束
ALTER TABLE AttendanceRecord DROP INDEX unique_student_date;

-- 添加普通索引以優化查詢性能
ALTER TABLE AttendanceRecord ADD INDEX idx_student_date (StudentID, WorkDate);

-- 驗證更改
SHOW INDEX FROM AttendanceRecord;
