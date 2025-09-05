const express = require('express');
const { handleWhatsAppMessage, verifyWebhook, handleDeepgramCallback, testWebhookCallback } = require('../controllers/whatsappController');

const router = express.Router();

// WhatsApp webhook verification (for WhatsApp Business API)
router.get('/whatsapp', verifyWebhook);

// WhatsApp webhook endpoint for receiving messages
router.post('/whatsapp', handleWhatsAppMessage);

// Deepgram callback endpoint for transcription results
router.post('/deepgram/hook', handleDeepgramCallback);

// Health check endpoint for webhook
router.get('/deepgram/hook', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Deepgram webhook endpoint is healthy',
    method: 'This endpoint accepts POST requests',
    timestamp: new Date().toISOString()
  });
});

// Test endpoint to manually trigger webhook callback
router.post('/deepgram/test', testWebhookCallback);

module.exports = router; 