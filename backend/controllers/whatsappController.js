const axios = require('axios');
const { pool } = require('../config/database');
const AWS = require('aws-sdk');
const fileType = require('file-type');
const mm = require('music-metadata');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// TODO: Add Twilio send message helper

// Helper to send WhatsApp reply via Twilio
async function sendWhatsAppReply(to, messageBody) {
  const accountSid = process.env.TWILIO_SID;
  const authToken = process.env.TWILIO_AUTH;
  const from = 'whatsapp:' + process.env.TWILIO_PHONENUMBER;

  try {
    const response = await axios.post(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      new URLSearchParams({
        To: to,
        From: from,
        Body: messageBody
      }),
      {
        auth: { username: accountSid, password: authToken },
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
    if (response.status === 201) {
      console.log('sendWhatsAppReply successfully');
      return 'Message sent successfully!';
    } else {
      console.log('sendWhatsAppReply failed', response.data);
      return 'Failed to send message. Response: ' + JSON.stringify(response.data);
    }
  } catch (error) {
    console.log('sendWhatsAppReply error', error.response?.data || error.message);
    return 'Failed to send message. Error: ' + (error.response?.data || error.message);
  }
}

// Webhook verification for WhatsApp Business API
const verifyWebhook = (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  // Verify token should match your app's verify token
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'your_verify_token_here';

  if (mode && token) {
    if (mode === 'subscribe' && token === verifyToken) {
      console.log('Webhook verified successfully');
      res.status(200).send(challenge);
    } else {
      console.log('Webhook verification failed');
      res.sendStatus(403);
    }
  } else {
    console.log('Webhook verification parameters missing');
    res.sendStatus(400);
  }
};

const handleWhatsAppMessage = async (req, res) => {
  try {
    // Log the request
    console.log('Twilio request received', req.body);

    // Twilio credentials
    const accountSid = process.env.TWILIO_SID;
    const authToken = process.env.TWILIO_AUTH;

    // Sender phone number
    const senderPhoneNumber = req.body.From; // e.g., 'whatsapp:+14155552671'
    const justPhoneNumber = senderPhoneNumber.replace('whatsapp:', '');

    // Find user by WhatsApp number
    const [users] = await pool.execute('SELECT * FROM users WHERE wtp_number = ?', [justPhoneNumber]);
    const user = users[0];
    if (!user) {
      await sendWhatsAppReply(req.body.From, 'Phone number not registered new API. Please visit Scribebuddy.com and register your phone number.');
      return res.status(400).json({ error: 'Phone number not registered' });
    }

    const mediaUrl = req.body.MediaUrl0;
    if (!mediaUrl) {
      await sendWhatsAppReply(req.body.From, 'No audio/video file sent');
      return res.status(400).json({ error: 'Please send only audio/video files.' });
    }

    // Download media file with Twilio basic auth
    const mediaResponse = await axios.get(mediaUrl, {
      responseType: 'arraybuffer',
      auth: { username: accountSid, password: authToken },
    });
    const audioBuffer = Buffer.from(mediaResponse.data);

    // Detect file type
    const type = await fileType.fromBuffer(audioBuffer);
    if (!type) {
      await sendWhatsAppReply(req.body.From, 'Sorry, this file type is not supported yet.');
      return res.status(400).json({ error: 'File type not supported' });
    }
    const extension = type.ext;
    const mimeType = type.mime;

    // Get duration (if audio)
    let duration = 0;
    try {
      const metadata = await mm.parseBuffer(audioBuffer, type.mime);
      duration = metadata.format.duration || 0;
    } catch (err) {
      await sendWhatsAppReply(req.body.From, 'Sorry, we are unable to transcribe this message');
      return res.status(400).json({ error: 'Unable to retrieve audio duration' });
    }

    // Upload to S3
    const s3 = new AWS.S3({
      accessKeyId: process.env.AWS_KEY,
      secretAccessKey: process.env.AWS_SECRET,
      region: process.env.AWS_REGION,
    });
    const unique = uuidv4();
    const fileName = `WA-${unique}.${extension}`;
    const filePath = `${unique}/${fileName}`;
    const bucket = process.env.AWS_BUCKET;
    await s3.putObject({
      Bucket: bucket,
      Key: filePath,
      Body: audioBuffer,
      ContentType: mimeType,
    }).promise();
    const bucketUrl = `https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${filePath}`;

    // Get language code
    let languageCode = 'en';
    if (user.wa_language) {
      const [langs] = await pool.execute('SELECT code FROM language_codes WHERE id = ?', [user.wa_language]);
      if (langs[0]) languageCode = langs[0].code;
    }

    // Format duration to fit VARCHAR(10) - convert seconds to MM:SS format
    const formatDuration = (seconds) => {
      if (!seconds || seconds <= 0) return '0:00';
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.floor(seconds % 60);
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    // Store transcript info in DB using existing transcriptions table
    await pool.execute(
      'INSERT INTO transcriptions (user_id, original_filename, file_path, file_size, mime_type, duration, status, language, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
      [user.id, fileName, bucketUrl, audioBuffer.length, mimeType, formatDuration(duration), 'processing', languageCode]
    );

    await sendWhatsAppReply(req.body.From, `We have received your file. Your file is being processed.\n\nYou can track your result here ${process.env.APP_URL}`);

    return res.json({ success: true, message: 'File received and in process.' });
  } catch (error) {
    console.error('handleWhatsAppMessage error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { handleWhatsAppMessage, verifyWebhook }; 