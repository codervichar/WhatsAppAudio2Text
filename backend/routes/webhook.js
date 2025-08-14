const express = require('express');
const { handleWhatsAppMessage, verifyWebhook, handleDeepgramCallback } = require('../controllers/whatsappController');

const router = express.Router();

// WhatsApp webhook verification (for WhatsApp Business API)
router.get('/whatsapp', verifyWebhook);

// WhatsApp webhook endpoint for receiving messages
router.post('/whatsapp', handleWhatsAppMessage);

// Deepgram callback endpoint for transcription results (matches PHP callback URL)
router.post('/deepgram/hook', handleDeepgramCallback);

module.exports = router; 