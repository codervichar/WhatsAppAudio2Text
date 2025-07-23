const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const {
  createCheckoutSession,
  handleWebhook,
  getSubscriptionStatus,
  cancelSubscription
} = require('../controllers/stripeController');

const router = express.Router();

// @route   POST /api/stripe/create-checkout-session
// @desc    Create Stripe checkout session
// @access  Private
router.post('/create-checkout-session', authenticateToken, createCheckoutSession);

// @route   POST /api/stripe/webhook
// @desc    Handle Stripe webhooks
// @access  Public
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

// @route   GET /api/stripe/subscription-status
// @desc    Get user subscription status
// @access  Private
router.get('/subscription-status', authenticateToken, getSubscriptionStatus);

// @route   POST /api/stripe/cancel-subscription
// @desc    Cancel user subscription
// @access  Private
router.post('/cancel-subscription', authenticateToken, cancelSubscription);

module.exports = router; 