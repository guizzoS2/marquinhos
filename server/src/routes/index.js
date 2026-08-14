const express = require('express');
const { login, me } = require('../controllers/authController');
const {
  getOverview,
  getCashFlow,
  getInventory,
  getFreelancers,
  createDaily,
} = require('../controllers/dashboardController');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

router.post('/auth/login', login);
router.get('/auth/me', authenticateToken, me);

router.get(
  '/dashboard/overview',
  authenticateToken,
  requireRole('admin'),
  getOverview
);
router.get(
  '/dashboard/cash-flow',
  authenticateToken,
  requireRole('admin'),
  getCashFlow
);
router.get(
  '/dashboard/inventory',
  authenticateToken,
  requireRole('admin'),
  getInventory
);
router.get(
  '/dashboard/freelancers',
  authenticateToken,
  requireRole('admin'),
  getFreelancers
);
router.post(
  '/dashboard/freelancers/daily',
  authenticateToken,
  requireRole('admin'),
  createDaily
);

module.exports = router;
