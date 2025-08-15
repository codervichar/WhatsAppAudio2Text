const axios = require('axios');
const { pool } = require('../config/database');
const AWS = require('aws-sdk');
const fileType = require('file-type');
const mm = require('music-metadata');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// TODO: Add Twilio send message helper

// Deepgram transcription callback function
async function deepgramTranscriptCallback(transactionId, language, s3FileUrl, speakerIdentification, isSubscribed) {
  try {

    console.log('--------------------------------deepgramTranscriptCallback--------------------------------');
    const apiKey = process.env.DEEPGRAM_API_KEY;
    // Use the full webhook URL from environment variable
    const callBackUrl = "http://13.60.226.80:5000/api/webhook/deepgram/hook";
    
    console.log('Deepgram callback URL:', callBackUrl);
    const apiUrl = 'https://api.deepgram.com/v1/listen';
    
    let queryString = '';

    if (speakerIdentification == "Yes") {
      queryString = '?model=whisper-large&smart_format=true&punctuate=true&paragraphs=true&utterances=true&diarize=true';
    } else {
      queryString = '?model=whisper-large&smart_format=true';
    }

    if (language == "") {
      queryString = queryString + '&detect_language=true';
    } else {
      queryString = queryString + '&language=' + language;
    }

    const fullApiUrl = apiUrl + queryString + '&callback=' + callBackUrl;

    // Request headers
    const headers = {
      'Authorization': `Token ${apiKey}`,
      'Content-Type': 'application/json'
    };

    // Request body
    const requestBody = {
      url: s3FileUrl
    };

    // Make request to Deepgram
    const response = await axios.post(fullApiUrl, requestBody, { headers });
    
    if (response.data && response.data.request_id) {
      console.log('Deepgram transcription request successful:', response.data);
      return response.data.request_id;
    } else {
      console.error('Deepgram API returned no response or no request_id');
      return null;
    }
  } catch (error) {
    console.error('Deepgram transcription callback error:', error);
    return null;
  }
}

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

    // Call Deepgram transcription callback first to get request_id
    let requestId = null;
    try {
      requestId = await deepgramTranscriptCallback(unique, languageCode, bucketUrl, 'No', user.is_subscribed || false);
      console.log(`Deepgram transcription initiated, request ID: ${requestId}`);
      console.log(`Request ID type: ${typeof requestId}, value: ${JSON.stringify(requestId)}`);
      
      // Validate requestId
      if (!requestId || typeof requestId !== 'string' || requestId.trim() === '') {
        console.error('❌ Invalid requestId received:', requestId);
        requestId = null;
      } else {
        console.log('✅ Valid requestId received:', requestId);
      }
    } catch (deepgramError) {
      console.error('Deepgram transcription callback failed:', deepgramError);
      requestId = null;
    }

    // Store transcript info in DB using existing transcriptions table
    let insertResult;
    
    // Log all the data being inserted
    console.log('=== INSERT DATA DEBUG ===');
    console.log('user.id:', user.id, 'type:', typeof user.id);
    console.log('fileName:', fileName, 'type:', typeof fileName);
    console.log('bucketUrl:', bucketUrl, 'type:', typeof bucketUrl);
    console.log('audioBuffer.length:', audioBuffer.length, 'type:', typeof audioBuffer.length);
    console.log('mimeType:', mimeType, 'type:', typeof mimeType);
    console.log('formatDuration(duration):', formatDuration(duration), 'type:', typeof formatDuration(duration));
    console.log('languageCode:', languageCode, 'type:', typeof languageCode);
    console.log('requestId:', requestId, 'type:', typeof requestId);
    console.log('senderPhoneNumber:', senderPhoneNumber, 'type:', typeof senderPhoneNumber);
    console.log('========================');
    
    try {
      // Only try with request_id if we have a valid requestId
      if (requestId && typeof requestId === 'string' && requestId.trim() !== '') {
        console.log('Attempting to insert with request_id:', requestId);
        
        const insertQuery = 'INSERT INTO transcriptions (user_id, original_filename, file_path, file_size, mime_type, duration, status, language, request_id, from_wa, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())';
        const insertParams = [user.id, fileName, bucketUrl, audioBuffer.length, mimeType, formatDuration(duration), 'processing', languageCode, requestId, senderPhoneNumber];
        
        console.log('INSERT Query:', insertQuery);
        console.log('INSERT Params:', insertParams);
        
        [insertResult] = await pool.execute(insertQuery, insertParams);
        console.log(`✅ Transcription record created with ID: ${insertResult.insertId}, request ID: ${requestId}`);
      } else {
        console.log('⚠️ No valid requestId, using fallback INSERT without request_id');
        throw new Error('No valid requestId');
      }
    } catch (columnError) {
      console.log('❌ Column error details:', columnError.message);
      console.log('❌ Error code:', columnError.code);
      console.log('❌ SQL Message:', columnError.sqlMessage);
      
      if (columnError.code === 'ER_BAD_FIELD_ERROR') {
        console.log('New columns not available, using existing schema...');
        // Fallback to existing schema without new columns
        [insertResult] = await pool.execute(
          'INSERT INTO transcriptions (user_id, original_filename, file_path, file_size, mime_type, duration, status, language, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
          [user.id, fileName, bucketUrl, audioBuffer.length, mimeType, formatDuration(duration), 'processing', languageCode]
        );
        console.log(`⚠️ Transcription record created with ID: ${insertResult.insertId} (without request_id)`);
      } else {
        throw columnError;
      }
    }

    // Get the inserted transcription ID
    const transcriptionId = insertResult.insertId;

    // If Deepgram call failed, update status to failed
    if (!requestId) {
      await pool.execute(
        'UPDATE transcriptions SET status = ? WHERE id = ?',
        ['failed', transcriptionId]
      );
    }

    await sendWhatsAppReply(req.body.From, `We have received your file. Your file is being processed.\n\nYou can track your result here ${process.env.FRONTEND_URL}`);

    return res.json({ success: true, message: 'File received and in process.' });
  } catch (error) {
    console.error('handleWhatsAppMessage error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Handle Deepgram transcription callback
const handleDeepgramCallback = async (req, res) => {
  try {
    // Get raw data from request body
    const data = req.body;
    console.log('Deepgram callback received:', data);
    
    const requestId = data.metadata?.request_id;
    const duration = data.metadata?.duration;
    
    console.log('Searching for Transcript with request_id:', requestId);
    
    // Find transcript by request_id
    let transcripts;
    try {
      [transcripts] = await pool.execute(
        'SELECT * FROM transcriptions WHERE request_id = ?',
        [requestId]
      );
    } catch (columnError) {
      if (columnError.code === 'ER_BAD_FIELD_ERROR') {
        console.log('request_id column not available, using fallback method...');
        // Fallback: find the most recent processing record
        [transcripts] = await pool.execute(
          'SELECT * FROM transcriptions WHERE status = ? ORDER BY created_at DESC LIMIT 1',
          ['processing']
        );
      } else {
        throw columnError;
      }
    }
    
    if (transcripts.length === 0) {
      console.error('No transcript found for request_id:', requestId);
      return res.status(404).json({ error: 'Transcript not found' });
    }
    
    const transcript = transcripts[0];
    const transactionId = transcript.id; // Use id as transaction ID
    
    console.log(`Found transcript record ID: ${transcript.id} for request_id: ${requestId}`);
    
    // Update transcript fields - handle missing columns gracefully
    try {
      await pool.execute(
        `UPDATE transcriptions 
         SET status = ?, 
             meta_data = ?, 
             duration = ?, 
             updated_at = NOW() 
         WHERE request_id = ?`,
        ['COMPLETED', JSON.stringify(data.metadata), duration, requestId]
      );
    } catch (updateError) {
      if (updateError.code === 'ER_BAD_FIELD_ERROR') {
        console.log('New columns not available, updating with existing schema...');
        // Fallback: update without new columns
        await pool.execute(
          `UPDATE transcriptions 
           SET status = ?, 
               duration = ?, 
               updated_at = NOW() 
           WHERE id = ?`,
          ['COMPLETED', duration, transcript.id]
        );
      } else {
        throw updateError;
      }
    }
    
    // Upload JSON file to S3
    const fileName = `JSON-${transactionId}.json`;
    const filePath = `${transactionId}/${fileName}`;
    
    console.log('------FileName-----', fileName);
    console.log('------File Path-----', filePath);
    
    const s3 = new AWS.S3({
      accessKeyId: process.env.AWS_KEY,
      secretAccessKey: process.env.AWS_SECRET,
      region: process.env.AWS_REGION,
    });
    
    const uploadResult = await s3.putObject({
      Bucket: process.env.AWS_BUCKET,
      Key: filePath,
      Body: JSON.stringify(data),
      ContentType: 'application/json'
    }).promise();
    
    if (uploadResult) {
      console.log('JSON file uploaded to S3 successfully');
      
      const originalFileName = transcript.original_filename;
      console.log('------originalFileName-----', originalFileName);
      
             // Check if this is from WhatsApp
       if (transcript.from_wa) {
         console.log('from wa', transcript.from_wa);
         
         try {
           // Check if transcript text exists in the results
           if (data.results && 
               data.results.channels && 
               data.results.channels[0] && 
               data.results.channels[0].alternatives && 
               data.results.channels[0].alternatives[0] && 
               data.results.channels[0].alternatives[0].transcript) {
             
             const transcriptText = data.results.channels[0].alternatives[0].transcript;
             const messageText = transcriptText + "\n \n You can see your result here " + process.env.APP_URL;
             
             await sendWhatsAppReply(transcript.from_wa, messageText);
           } else {
             // If transcript doesn't exist, send error message
             await sendWhatsAppReply(transcript.from_wa, "Transcription failed for your WA message.");
           }
         } catch (error) {
           console.error('Error sending WhatsApp reply:', error);
           await sendWhatsAppReply(transcript.from_wa, "Transcription failed for your WA message.");
         }
       } else {
         console.log('No from_wa field found, skipping WhatsApp notification');
       }
    } else {
      console.error('Failed to upload JSON file to S3');
      // Log error to local file (equivalent to PHP's Storage::disk('local')->put)
      const fs = require('fs');
      const path = require('path');
      
      try {
        fs.writeFileSync(path.join(__dirname, '../logs/deepgramTranscriptError.txt'), 'The transcript JSON file not uploaded on S3.');
        fs.writeFileSync(path.join(__dirname, `../logs/${transactionId}-result.txt`), JSON.stringify(data));
      } catch (writeError) {
        console.error('Failed to write error logs:', writeError);
      }
    }
    
    // Send 200 OK response
    return res.status(200).json({ statusCode: 200, message: 'Success!' });
    
  } catch (error) {
    console.error('Deepgram callback error:', error);
    return res.status(500).json({ statusCode: 500, message: 'Internal Server Error' });
  }
};

module.exports = { handleWhatsAppMessage, verifyWebhook, handleDeepgramCallback }; 