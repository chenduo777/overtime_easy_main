# Overtime Easy - 學生打卡與加班管理系統

這是一個專為實驗室或辦公室設計的打卡與加班管理系統。前端使用 React + Tailwind CSS，後端使用 Node.js + Express + MySQL。

## 功能特色

-   **打卡系統**：支援上班/下班打卡，自動計算工時。
-   **即時狀態**：首頁顯示當前時間、本日工時與加班時數。
-   **個人總覽**：
    -   月曆檢視每日打卡狀況。
    -   紅點/綠點標示有無加班。
    -   心情小語圖片（Happy/Tired）顯示當日狀態。
-   **排行榜**：
    -   支援 本週/本月/本年 加班時數排行。
    -   前三名特殊獎牌顯示。
    -   右下角 "Number One" 冠軍徽章。
-   **心情小語**：首頁隨機顯示趣味/激勵小語。

## 系統需求

-   Node.js (v16 或以上)
-   MySQL (v8.0 或以上)

## 安裝與設定

### 1. 下載專案

```bash
git clone <repository_url>
cd overtime_easy
```

### 2. 資料庫設定

1.  進入 MySQL 並建立資料庫：
    ```sql
    CREATE DATABASE overtime_db;
    ```
2.  匯入資料表結構 (請參考 `database/schema.sql` 或自行建立相關 Table)。
3.  複製 `.env.example` 並設定環境變數：
    ```bash
    cp .env.example .env
    ```
    編輯 `.env` 檔案，填入您的資料庫資訊：
    ```env
    DB_HOST=localhost
    DB_USER=root
    DB_PASSWORD=your_password
    DB_NAME=overtime_db
    JWT_SECRET=your_jwt_secret
    ```

### 3. 安裝依賴套件

**安裝後端套件：**
```bash
npm install
```

**安裝前端套件：**
```bash
cd frontend
npm install
cd ..
```

## 啟動專案

### 正常模式 ()
開啟兩個終端機視窗分別執行：
**終端機 1 (後端)：**
```bash
npm start
```
後端伺服器將運行於 `http://localhost:3000`。

**終端機 2 (前端)：**
```bash
cd frontend
npm run preview -- --host 0.0.0.0 --port 5173
```
前端頁面將運行於 `http://localhost:5173`、`http://140.124.72.19:5173/`。

### 開發模式 (Development)

建議開啟兩個終端機視窗分別執行：

**終端機 1 (後端)：**
```bash
npm run dev
```
後端伺服器將運行於 `http://localhost:3000`。

**終端機 2 (前端)：**
```bash
cd frontend
npm run dev
```
前端頁面將運行於 `http://localhost:5173`。

### 生產模式 (Production / Local Deployment)

如果您想在本地模擬正式環境運行（前後端整合）：

1.  **建置前端並啟動伺服器：**
    ```bash
    npm run build
    NODE_ENV=production npm start
    ```
2.  開啟瀏覽器訪問 `http://localhost:3000` 即可使用完整功能。

## 專案結構

-   `/controllers`: 後端邏輯控制
-   `/routes`: API 路由定義
-   `/config`: 資料庫配置
-   `/frontend`: React 前端專案
    -   `/src/pages`: 頁面組件 (Home, Login, Overview, Leaderboard)
    -   `/src/components`: 共用組件
    -   `/public`: 靜態資源 (圖片等)

## 注意事項

-   請確保 MySQL 服務已啟動。
-   預設測試帳號請參考資料庫內的 `Student` 表。