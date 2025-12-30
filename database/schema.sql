-- ============================================
-- 學生打卡與加班管理系統 (Overtime Easy)
-- 版本：V2.1 (5實體架構 + 成就等級系統)
-- ============================================

CREATE DATABASE IF NOT EXISTS overtime_easy CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE overtime_easy;

-- ============================================
-- 1. Team (組別)
-- ============================================
CREATE TABLE IF NOT EXISTS Team (
    team_id INT PRIMARY KEY AUTO_INCREMENT COMMENT '組別ID',
    team_name VARCHAR(50) NOT NULL COMMENT '組別名稱',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- 2. Student (學生 - 含帳號與權限)
-- ============================================
CREATE TABLE IF NOT EXISTS Student (
    student_id VARCHAR(20) PRIMARY KEY COMMENT '學號/帳號',
    team_id INT COMMENT 'FK: 所屬組別',
    name VARCHAR(100) NOT NULL COMMENT '姓名',
    password VARCHAR(255) NOT NULL COMMENT '加密密碼',
    role VARCHAR(20) DEFAULT 'user' COMMENT '權限: user/admin',
    last_login DATETIME COMMENT '最後登入',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES Team(team_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- 3. AttendanceRecord (出勤紀錄)
-- ============================================
CREATE TABLE IF NOT EXISTS AttendanceRecord (
    record_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(20) NOT NULL,
    work_date DATE NOT NULL COMMENT '日期 (YYYY-MM-DD)',
    clock_in DATETIME COMMENT '上班打卡',
    clock_out DATETIME COMMENT '下班打卡',
    work_minutes INT DEFAULT 0 COMMENT '當日工時(分)',
    FOREIGN KEY (student_id) REFERENCES Student(student_id) ON DELETE CASCADE,
    INDEX idx_date (work_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- 4. Reward (成就定義 - 含等級)
-- ============================================
CREATE TABLE IF NOT EXISTS Reward (
    reward_id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(50) NOT NULL COMMENT '成就名稱',
    description VARCHAR(200) COMMENT '描述',
    level ENUM('Bronze', 'Silver', 'Gold') NOT NULL DEFAULT 'Bronze' COMMENT '成就等級',
    icon_url VARCHAR(100) COMMENT '圖示路徑'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- 5. StudentReward (獲獎紀錄)
-- ============================================
CREATE TABLE IF NOT EXISTS StudentReward (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id VARCHAR(20) NOT NULL,
    reward_id INT NOT NULL,
    earned_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '獲獎時間',
    FOREIGN KEY (student_id) REFERENCES Student(student_id) ON DELETE CASCADE,
    FOREIGN KEY (reward_id) REFERENCES Reward(reward_id) ON DELETE CASCADE,
    UNIQUE KEY unique_reward (student_id, reward_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- 初始化基礎資料 (必備)
-- ============================================

-- 1. 建立預設組別 (防止新學生沒有組別可選)
INSERT INTO Team (team_id, team_name) VALUES (1, 'AI組') 
ON DUPLICATE KEY UPDATE team_name='AI組';
