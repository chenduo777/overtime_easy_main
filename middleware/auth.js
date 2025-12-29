const jwt = require('jsonwebtoken');

// JWT 驗證中間件
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: '需要登入才能訪問此資源' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token 無效或已過期' });
    }
    req.user = user; // 將用戶資訊附加到請求對象
    next();
  });
}

module.exports = { authenticateToken };
