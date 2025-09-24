const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { sendContactForm, getSupportTickets, updateSupportTicket } = require('../controllers/contactController');

const router = express.Router();

// @route   POST /api/contact
// @desc    Send contact form email to admin
// @access  Public
router.post('/', sendContactForm);

// Admin routes (require authentication)
// @route   GET /api/contact/tickets
// @desc    Get support tickets (Admin only)
// @access  Private
router.get('/tickets', authenticateToken, getSupportTickets);

// @route   PUT /api/contact/tickets/:id
// @desc    Update support ticket status (Admin only)
// @access  Private
router.put('/tickets/:id', authenticateToken, updateSupportTicket);

module.exports = router;
