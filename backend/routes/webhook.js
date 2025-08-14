const express = require('express');
const { handleWhatsAppMessage } = require('../controllers/whatsappController');

const router = express.Router();

// WhatsApp webhook endpoint
router.post('/whatsapp', handleWhatsAppMessage);

module.exports = router; 