const express = require('express');
const { handleWhatsAppMessage, verifyWebhook } = require('../controllers/whatsappController');

const router = express.Router();

// WhatsApp webhook verification (for WhatsApp Business API)
router.get('/whatsapp', verifyWebhook);

// WhatsApp webhook endpoint for receiving messages
router.post('/whatsapp', handleWhatsAppMessage);

module.exports = router; 