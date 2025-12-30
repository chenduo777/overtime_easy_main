const express = require('express');
const router = express.Router();
const { executeQuery } = require('../controllers/terminalController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Protect all routes with authentication and admin role
router.use(authenticateToken);
router.use(requireAdmin);

// SQL Execution (admin only)
router.post('/query', executeQuery);

module.exports = router;
