const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { testConnection } = require('./config/database');
const authRoutes = require('./routes/auth');
const attendanceRoutes = require('./routes/attendance');
const statsRoutes = require('./routes/stats');
const terminalRoutes = require('./routes/terminal');
const rewardRoutes = require('./routes/reward');

const app = express();
const PORT = process.env.PORT || 3000;

// 中間件
app.use(cors({
  origin: '*',  // 允許所有來源（內網環境可用）
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 路由
app.use('/api/auth', authRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/terminal', terminalRoutes);
app.use('/api/reward', rewardRoutes);

// 根路由
app.get('/', (req, res) => {
  res.json({
    message: '學生打卡與加班管理系統 API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      attendance: '/api/attendance',
      stats: '/api/stats'
    }
  });
});

// 啟動伺服器
async function startServer() {
  // 測試資料庫連接
  const dbConnected = await testConnection();

  if (!dbConnected) {
    console.error('⚠️  資料庫連接失敗，請檢查配置');
    process.exit(1);
  }

  // Serve static files in production
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'frontend/dist')));

    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'frontend/dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`🚀 伺服器運行於 http://localhost:${PORT}`);
    console.log(`📊 API 文件： http://localhost:${PORT}/`);
  });
}

startServer();
