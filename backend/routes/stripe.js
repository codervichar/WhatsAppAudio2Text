const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const {
  createCheckoutSession,
  handleWebhook,
  getSubscriptionStatus,
  getSubscriptionDetails,
  getPaymentHistory,
  verifyPaymentSession,
  cancelSubscription
} = require('../controllers/stripeController');

const router = express.Router();

// @route   POST /api/stripe/create-checkout-session
// @desc    Create Stripe checkout session
// @access  Public (temporarily for testing)
router.post('/create-checkout-session', createCheckoutSession);

// @route   POST /api/stripe/webhook
// @desc    Handle Stripe webhooks
// @access  Public
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

// @route   GET /api/stripe/subscription-status
// @desc    Get user subscription status
// @access  Private
router.get('/subscription-status', authenticateToken, getSubscriptionStatus);

// @route   GET /api/stripe/subscription-details
// @desc    Get detailed subscription information
// @access  Private
router.get('/subscription-details', authenticateToken, getSubscriptionDetails);

// @route   GET /api/stripe/payment-history
// @desc    Get user payment history
// @access  Private
router.get('/payment-history', authenticateToken, getPaymentHistory);

// @route   POST /api/stripe/verify-session
// @desc    Verify payment session
// @access  Private
router.post('/verify-session', authenticateToken, verifyPaymentSession);

// @route   POST /api/stripe/cancel-subscription
// @desc    Cancel user subscription
// @access  Private
router.post('/cancel-subscription', authenticateToken, cancelSubscription);

module.exports = router; 