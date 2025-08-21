const axios = require('axios');
const { pool } = require('../config/database');
const AWS = require('aws-sdk');
const fileType = require('file-type');
const mm = require('music-metadata');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// TODO: Add Twilio send message helper

// Deepgram transcription callback function - Modified to accept audio buffer directly
async function deepgramTranscriptCallback(audioBuffer, language, speakerIdentification, isSubscribed) {
  try {
    console.log('--------------------------------deepgramTranscriptCallback--------------------------------');
    const apiKey = process.env.DEEPGRAM_API_KEY;
    // Use the full webhook URL from environment variable
    const callBackUrl = "https://api.voicemessage2text.com/api/webhook/deepgram/hook";
    
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

    // Request headers for multipart form data
    const headers = {
      'Authorization': `Token ${apiKey}`,
    };

    // Create form data with the audio buffer
    const FormData = require('form-data');
    const form = new FormData();
    form.append('buffer', audioBuffer, {
      filename: 'audio.mp3',
      contentType: 'audio/mpeg'
    });

    // Make request to Deepgram with audio buffer
    const response = await axios.post(fullApiUrl, form, { 
      headers: {
        ...headers,
        ...form.getHeaders()
      }
    });
    
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
      await sendWhatsAppReply(req.body.From, 'Phone number not registered new API. Please visit voicemessage2text.com and register your phone number.');
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
      console.log('🚀 Calling Deepgram API with audio buffer...');
      requestId = await deepgramTranscriptCallback(audioBuffer, languageCode, 'No', user.is_subscribed || false);
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

    // Upload audio file to S3 using the requestId
    const s3 = new AWS.S3({
      accessKeyId: process.env.AWS_KEY,
      secretAccessKey: process.env.AWS_SECRET,
      region: process.env.AWS_REGION,
    });
    
    let fileName, filePath, bucketUrl;
    
    if (requestId && typeof requestId === 'string' && requestId.trim() !== '') {
      // Use requestId for file naming and path
      fileName = `WA-${requestId}.${extension}`;
      filePath = `${requestId}/${fileName}`;
      bucketUrl = `https://${process.env.AWS_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${filePath}`;
      
      console.log('📁 Uploading audio file to S3 using requestId...');
      console.log('📂 File Path:', filePath);
      console.log('📊 File Size:', audioBuffer.length, 'bytes');
      
      await s3.putObject({
        Bucket: process.env.AWS_BUCKET,
        Key: filePath,
        Body: audioBuffer,
        ContentType: mimeType,
      }).promise();
      
      console.log('✅ Audio file uploaded to S3 successfully using requestId');
    } else {
      // Fallback: use UUID if no requestId
      const unique = uuidv4();
      fileName = `WA-${unique}.${extension}`;
      filePath = `${unique}/${fileName}`;
      bucketUrl = `https://${process.env.AWS_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${filePath}`;
      
      console.log('⚠️ No requestId, using fallback UUID for file upload...');
      console.log('📂 File Path:', filePath);
      
      await s3.putObject({
        Bucket: process.env.AWS_BUCKET,
        Key: filePath,
        Body: audioBuffer,
        ContentType: mimeType,
      }).promise();
      
      console.log('✅ Audio file uploaded to S3 successfully using fallback UUID');
    }

    // Store transcript info in DB using existing transcriptions table
    let insertResult;
    
    // Log all the data being inserted
    console.log('=== INSERT DATA DEBUG ===');
    console.log('user.id:', user.id, 'type:', typeof user.id);
    console.log('fileName:', fileName, 'type:', typeof fileName);
    console.log('filePath:', filePath, 'type:', typeof filePath);
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
    console.log('🎯 Deepgram callback received:', JSON.stringify(data, null, 2));
    
    // Validate if this is a proper Deepgram callback
    if (!data || typeof data !== 'object') {
      console.log('⚠️ Invalid callback data received');
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid callback data' 
      });
    }
    
    const requestId = data.metadata?.request_id;
    const duration = data.metadata?.duration;
    
    // Check if this is a test request (common for webhook validation)
    if (!requestId && (!data.metadata || !data.results)) {
      console.log('🧪 Test webhook request received - responding with success');
      return res.status(200).json({ 
        success: true, 
        message: 'Webhook endpoint is working',
        timestamp: new Date().toISOString()
      });
    }
    
    if (!requestId) {
      console.error('❌ No request_id found in callback data');
      return res.status(400).json({ 
        success: false, 
        message: 'Missing request_id in callback data' 
      });
    }
    
    console.log('🔍 Searching for Transcript with request_id:', requestId);
    
    // Find transcript by request_id
    let transcripts;
    try {
      [transcripts] = await pool.execute(
        'SELECT * FROM transcriptions WHERE request_id = ?',
        [requestId]
      );
    } catch (columnError) {
      if (columnError.code === 'ER_BAD_FIELD_ERROR') {
        console.log('⚠️ request_id column not available, using fallback method...');
        // Fallback: find the most recent processing record
        [transcripts] = await pool.execute(
          'SELECT * FROM transcriptions WHERE status = ? ORDER BY created_at DESC LIMIT 1',
          ['processing']
        );
      } else {
        console.error('❌ Database error:', columnError);
        throw columnError;
      }
    }
    
    if (transcripts.length === 0) {
      console.error('❌ No transcript found for request_id:', requestId);
      return res.status(404).json({ 
        success: false, 
        message: 'Transcript not found',
        request_id: requestId
      });
    }
    
    const transcript = transcripts[0];
    const transactionId = transcript.id; // Use id as transaction ID
    
    console.log(`Found transcript record ID: ${transcript.id} for request_id: ${requestId}`);
    
    // Extract transcription text from Deepgram response
    let transcriptText = '';
    let confidenceScore = 0;
    let wordCount = 0;
    
    if (data.results && 
        data.results.channels && 
        data.results.channels[0] && 
        data.results.channels[0].alternatives && 
        data.results.channels[0].alternatives[0]) {
      
      const alternative = data.results.channels[0].alternatives[0];
      transcriptText = alternative.transcript || '';
      confidenceScore = alternative.confidence || 0;
      wordCount = transcriptText.split(' ').filter(word => word.length > 0).length;
    }
    
    // Update transcript fields with transcription text
    try {
      await pool.execute(
        `UPDATE transcriptions 
         SET status = ?, 
             transcription_text = ?,
             confidence_score = ?,
             word_count = ?,
             meta_data = ?, 
             duration = ?, 
             updated_at = NOW() 
         WHERE request_id = ?`,
        ['completed', transcriptText, confidenceScore, wordCount, JSON.stringify(data.metadata), duration, requestId]
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
          ['completed', duration, transcript.id]
        );
      } else {
        throw updateError;
      }
    }
    
    // Upload JSON file to S3 - store in same folder as audio file using requestId
    const fileName = `JSON-${requestId}.json`;
    const filePath = `${requestId}/${fileName}`;
    
    console.log('------FileName-----', fileName);
    console.log('------File Path-----', filePath);
    console.log('------Request ID-----', requestId);
    
    // Validate AWS credentials
    if (!process.env.AWS_KEY || !process.env.AWS_SECRET || !process.env.AWS_REGION || !process.env.AWS_BUCKET) {
      console.error('❌ Missing AWS credentials or bucket configuration');
      console.error('AWS_KEY:', process.env.AWS_KEY ? 'Set' : 'Missing');
      console.error('AWS_SECRET:', process.env.AWS_SECRET ? 'Set' : 'Missing');
      console.error('AWS_REGION:', process.env.AWS_REGION ? 'Set' : 'Missing');
      console.error('AWS_BUCKET:', process.env.AWS_BUCKET ? 'Set' : 'Missing');
    }
    
    const s3 = new AWS.S3({
      accessKeyId: process.env.AWS_KEY,
      secretAccessKey: process.env.AWS_SECRET,
      region: process.env.AWS_REGION,
    });
    
    let uploadResult;
    try {
      uploadResult = await s3.putObject({
        Bucket: process.env.AWS_BUCKET,
        Key: filePath,
        Body: JSON.stringify(data),
        ContentType: 'application/json'
      }).promise();
      
      console.log('✅ JSON file uploaded to S3 successfully');
      console.log('📁 S3 Location:', `s3://${process.env.AWS_BUCKET}/${filePath}`);
      console.log('📊 JSON Size:', JSON.stringify(data).length, 'bytes');
    } catch (s3Error) {
      console.error('❌ S3 upload error:', s3Error.message);
      console.error('❌ S3 Error Code:', s3Error.code);
      uploadResult = null;
    }
    
    if (uploadResult) {
      
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
      console.error('❌ Failed to upload JSON file to S3');
      // Log error to local file (equivalent to PHP's Storage::disk('local')->put)
      const fs = require('fs');
      const path = require('path');
      
      try {
        fs.writeFileSync(path.join(__dirname, '../logs/deepgramTranscriptError.txt'), 'The transcript JSON file not uploaded on S3.');
        fs.writeFileSync(path.join(__dirname, `../logs/${requestId}-result.txt`), JSON.stringify(data));
      } catch (writeError) {
        console.error('Failed to write error logs:', writeError);
      }
    }
    
    // Send 200 OK response
    console.log("✅ Callback processed successfully");
    return res.status(200).json({ 
      success: true, 
      message: 'Callback processed successfully',
      request_id: requestId,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Deepgram callback error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error',
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = { handleWhatsAppMessage, verifyWebhook, handleDeepgramCallback }; 