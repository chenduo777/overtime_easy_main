-- ============================================
-- 學生打卡與加班管理系統 - 資料庫結構
-- ============================================

-- 創建資料庫
CREATE DATABASE IF NOT EXISTS overtime_easy CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE overtime_easy;

-- ============================================
-- 1. Student（學生）
-- ============================================
CREATE TABLE IF NOT EXISTS Student (
    StudentID VARCHAR(20) PRIMARY KEY COMMENT '學生ID',
    Name VARCHAR(100) NOT NULL COMMENT '學生姓名',
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '建立時間'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='學生基本資料';

-- ============================================
-- 2. AppAccount（帳號）- 與 Student 1:1 關聯
-- ============================================
CREATE TABLE IF NOT EXISTS AppAccount (
    AccountID VARCHAR(20) PRIMARY KEY COMMENT '帳號ID（等同StudentID）',
    Password VARCHAR(255) NOT NULL COMMENT '密碼（加密後）',
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '建立時間',
    LastLogin TIMESTAMP NULL COMMENT '最後登入時間',
    FOREIGN KEY (AccountID) REFERENCES Student(StudentID) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='帳號資料';

-- ============================================
-- 3. WorkDate（工作日/日期）
-- ============================================
CREATE TABLE IF NOT EXISTS WorkDate (
    WorkDate DATE PRIMARY KEY COMMENT '工作日期',
    Weekday TINYINT NOT NULL COMMENT '星期幾（0=週日, 1=週一, ..., 6=週六）',
    IsHoliday TINYINT(1) DEFAULT 0 COMMENT '是否為假日（0=否, 1=是）',
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '建立時間'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='工作日曆';

-- ============================================
-- 4. AttendanceRecord（出勤紀錄）- M:N 中介表
-- ============================================
CREATE TABLE IF NOT EXISTS AttendanceRecord (
    RecordID INT AUTO_INCREMENT PRIMARY KEY COMMENT '紀錄ID',
    StudentID VARCHAR(20) NOT NULL COMMENT '學生ID',
    WorkDate DATE NOT NULL COMMENT '工作日期',
    ClockIn TIME NULL COMMENT '打卡上班時間',
    ClockOut TIME NULL COMMENT '打卡下班時間',
    WorkMinutes INT DEFAULT 0 COMMENT '工作分鐘數',
    OvertimeMinutes INT DEFAULT 0 COMMENT '加班分鐘數',
    ViolationMinutes INT DEFAULT 0 COMMENT '違規分鐘數（遲到+早退）',
    IsAbsent TINYINT(1) DEFAULT 0 COMMENT '是否缺席（0=否, 1=是）',
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '建立時間',
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新時間',
    FOREIGN KEY (StudentID) REFERENCES Student(StudentID) ON DELETE CASCADE,
    FOREIGN KEY (WorkDate) REFERENCES WorkDate(WorkDate) ON DELETE CASCADE,
    INDEX idx_student_date (StudentID, WorkDate) COMMENT '查詢優化索引'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='出勤打卡紀錄';

-- ============================================
-- 5. OvertimeSummary（加班統計）
-- ============================================
CREATE TABLE IF NOT EXISTS OvertimeSummary (
    SummaryID INT AUTO_INCREMENT PRIMARY KEY COMMENT '統計ID',
    StudentID VARCHAR(20) NOT NULL COMMENT '學生ID',
    Period VARCHAR(20) NOT NULL COMMENT '統計期間（例：2025-01）',
    TotalOvertimeMinutes INT DEFAULT 0 COMMENT '總加班分鐘數',
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '建立時間',
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新時間',
    FOREIGN KEY (StudentID) REFERENCES Student(StudentID) ON DELETE CASCADE,
    UNIQUE KEY unique_student_period (StudentID, Period) COMMENT '同學生同期間只能有一筆統計'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='加班時數統計';

-- ============================================
-- 6. ViolationSummary（缺席/早退統計）
-- ============================================
CREATE TABLE IF NOT EXISTS ViolationSummary (
    SummaryID INT AUTO_INCREMENT PRIMARY KEY COMMENT '統計ID',
    StudentID VARCHAR(20) NOT NULL COMMENT '學生ID',
    Period VARCHAR(20) NOT NULL COMMENT '統計期間（例：2025-01）',
    EarlyLeaveCount INT DEFAULT 0 COMMENT '早退次數',
    AbsenceCount INT DEFAULT 0 COMMENT '缺席次數',
    TotalViolationMinutes INT DEFAULT 0 COMMENT '總違規分鐘數',
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '建立時間',
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新時間',
    FOREIGN KEY (StudentID) REFERENCES Student(StudentID) ON DELETE CASCADE,
    UNIQUE KEY unique_student_period (StudentID, Period) COMMENT '同學生同期間只能有一筆統計'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='違規統計';

-- ============================================
-- 索引優化
-- ============================================
CREATE INDEX idx_attendance_student ON AttendanceRecord(StudentID);
CREATE INDEX idx_attendance_date ON AttendanceRecord(WorkDate);
CREATE INDEX idx_overtime_student ON OvertimeSummary(StudentID);
CREATE INDEX idx_violation_student ON ViolationSummary(StudentID);

-- ============================================
-- 初始化工作日期資料（2025年整年）
-- ============================================
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS InitWorkDates()
BEGIN
    DECLARE v_date DATE;
    DECLARE v_weekday INT;
    DECLARE v_is_holiday INT;

    SET v_date = '2025-01-01';

    WHILE v_date <= '2025-12-31' DO
        SET v_weekday = DAYOFWEEK(v_date) - 1; -- MySQL的DAYOFWEEK: 1=週日, 2=週一, ...
        SET v_is_holiday = IF(v_weekday IN (0, 6), 1, 0); -- 週六日為假日

        INSERT IGNORE INTO WorkDate (WorkDate, Weekday, IsHoliday)
        VALUES (v_date, v_weekday, v_is_holiday);

        SET v_date = DATE_ADD(v_date, INTERVAL 1 DAY);
    END WHILE;
END //
DELIMITER ;

-- 執行初始化
CALL InitWorkDates();

-- ============================================
-- 測試資料（可選）
-- ============================================
-- INSERT INTO Student (StudentID, Name) VALUES
-- ('S001', '王小明'),
-- ('S002', '李小華'),
-- ('S003', '張小美');

-- INSERT INTO AppAccount (AccountID, Password) VALUES
-- ('S001', '$2a$10$example.hash.password1'),
-- ('S002', '$2a$10$example.hash.password2'),
-- ('S003', '$2a$10$example.hash.password3');
