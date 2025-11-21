require('dotenv').config();
const { MailerSend, EmailParams, Sender, Recipient } = require('mailersend');

// Initialize MailerSend client with API key
const mailerSend = new MailerSend({
  apiKey: process.env.MAILERSEND_API_KEY || '',
});

// Get the from email address and name
const getFromEmail = () => {
  return process.env.MAILERSEND_SENDER_EMAIL || process.env.SMTP_USER || 'noreply@voicenotescribe.com';
};

const getFromName = () => {
  return process.env.MAILERSEND_SENDER_NAME || 'voicenotescribe';
};

// Send password reset email using MailerSend API
const sendPasswordResetEmail = async (email, resetToken, firstName = 'User') => {
  try {
    // Validate API key
    if (!process.env.MAILERSEND_API_KEY) {
      throw new Error('MAILERSEND_API_KEY is not configured');
    }

    // Password reset URL - adjust this to match your frontend URL
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Password Reset Request</h1>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #ddd;">
          <h2 style="color: #333; margin-top: 0;">Hello ${firstName}!</h2>
          
          <p>We received a request to reset your password for your voicenotescribe account.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                      color: white; 
                      padding: 15px 30px; 
                      text-decoration: none; 
                      border-radius: 5px; 
                      display: inline-block; 
                      font-weight: bold; 
                      font-size: 16px;">
              Reset Your Password
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            If the button doesn't work, you can copy and paste this link into your browser:
            <br><a href="${resetUrl}" style="color: #667eea; word-break: break-all;">${resetUrl}</a>
          </p>
          
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #856404; font-size: 14px;">
              <strong>Important:</strong> This link will expire in 1 hour for security reasons. 
              If you didn't request this password reset, please ignore this email.
            </p>
          </div>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            Best regards,<br>
            The voicenotescribe Team
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
          <p>This email was sent from a no-reply address. Please do not reply to this email.</p>
        </div>
      </body>
      </html>
    `;

    const textContent = `
      Hello ${firstName}!
      
      We received a request to reset your password for your voicenotescribe account.
      
      Please click the following link to reset your password:
      ${resetUrl}
      
      This link will expire in 1 hour for security reasons.
      
      If you didn't request this password reset, please ignore this email.
      
      Best regards,
      The voicenotescribe Team
    `;

    // Create sender and recipient objects
    const sentFrom = new Sender(getFromEmail(), getFromName());
    const recipients = [new Recipient(email, firstName)];

    // Create email parameters
    const emailParams = new EmailParams()
      .setFrom(sentFrom)
      .setTo(recipients)
      .setReplyTo(sentFrom)
      .setSubject('Password Reset Request - voicenotescribe')
      .setHtml(htmlContent)
      .setText(textContent);

    // Send email with timeout handling (30 seconds timeout)
    const response = await Promise.race([
      mailerSend.email.send(emailParams),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Email sending timeout after 30 seconds')), 30000)
      )
    ]);

    // Extract message ID from response (handle different response structures)
    const messageId = response?.body?.message_id || response?.message_id || response?.id || 'sent';
    console.log('Password reset email sent via MailerSend API:', messageId);
    return { success: true, messageId };

  } catch (error) {
    // Enhanced error logging
    const errorMessage = error?.response?.body?.message || 
                        error?.body?.message || 
                        error?.message || 
                        'Failed to send email';
    const errorDetails = error?.response?.body || error?.body || {};
    
    console.error('Error sending password reset email via MailerSend API:', {
      message: errorMessage,
      details: errorDetails,
      stack: error.stack
    });
    
    return { success: false, error: errorMessage };
  }
};

// Send contact form email to admin using MailerSend API
const sendContactFormEmail = async (contactData) => {
  try {
    // Validate API key
    if (!process.env.MAILERSEND_API_KEY) {
      throw new Error('MAILERSEND_API_KEY is not configured');
    }

    const { name, email, subject, message, ticketId } = contactData;
    console.log('contactData', contactData);
    const adminEmail = process.env.ADMIN_EMAIL || 'support@voicenotescribe.com';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Contact Form Submission</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">New Contact Form Submission</h1>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #ddd;">
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #667eea;">
            <h2 style="color: #333; margin-top: 0; margin-bottom: 15px;">Contact Details</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555; width: 120px;">Name:</td>
                <td style="padding: 8px 0; color: #333;">${name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Email:</td>
                <td style="padding: 8px 0; color: #333;">
                  <a href="mailto:${email}" style="color: #667eea; text-decoration: none;">${email}</a>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Subject:</td>
                <td style="padding: 8px 0; color: #333;">${subject}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Date:</td>
                <td style="padding: 8px 0; color: #333;">${new Date().toLocaleString()}</td>
              </tr>
              ${ticketId ? `
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Ticket ID:</td>
                <td style="padding: 8px 0; color: #333; font-family: monospace; background: #f8f9fa; padding: 4px 8px; border-radius: 3px;">#${ticketId}</td>
              </tr>
              ` : ''}
            </table>
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #764ba2;">
            <h3 style="color: #333; margin-top: 0; margin-bottom: 15px;">Message</h3>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; border: 1px solid #e9ecef;">
              <p style="margin: 0; white-space: pre-wrap; color: #333;">${message}</p>
            </div>
          </div>
          
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #856404; font-size: 14px;">
              <strong>Quick Reply:</strong> Click on the sender's email above to reply directly to this message.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="mailto:${email}" 
               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                      color: white; 
                      padding: 12px 25px; 
                      text-decoration: none; 
                      border-radius: 5px; 
                      display: inline-block; 
                      font-weight: bold; 
                      font-size: 14px;">
              Reply to ${name}
            </a>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
          <p>This email was sent from the voicenotescribe contact form.</p>
        </div>
      </body>
      </html>
    `;

    const textContent = `
      New Contact Form Submission
      
      Contact Details:
      Name: ${name}
      Email: ${email}
      Subject: ${subject}
      Date: ${new Date().toLocaleString()}
      ${ticketId ? `Ticket ID: #${ticketId}` : ''}
      
      Message:
      ${message}
      
      ---
      This email was sent from the voicenotescribe contact form.
      Reply directly to this email to respond to the sender.
    `;

    // Create sender and recipient objects
    const sentFrom = new Sender(getFromEmail(), name);
    const recipients = [new Recipient(adminEmail, 'Admin')];
    const replyTo = new Sender(email, name);

    // Create email parameters
    const emailParams = new EmailParams()
      .setFrom(sentFrom)
      .setTo(recipients)
      .setReplyTo(replyTo)
      .setSubject(`Contact Form: ${subject} - voicenotescribe`)
      .setHtml(htmlContent)
      .setText(textContent);

    // Send email with timeout handling (30 seconds timeout)
    const response = await Promise.race([
      mailerSend.email.send(emailParams),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Email sending timeout after 30 seconds')), 30000)
      )
    ]);

    // Extract message ID from response (handle different response structures)
    const messageId = response?.body?.message_id || response?.message_id || response?.id || 'sent';
    console.log('Contact form email sent to admin via MailerSend API:', messageId);
    return { success: true, messageId };

  } catch (error) {
    // Enhanced error logging
    const errorMessage = error?.response?.body?.message || 
                        error?.body?.message || 
                        error?.message || 
                        'Failed to send email';
    const errorDetails = error?.response?.body || error?.body || {};
    
    console.error('Error sending contact form email via MailerSend API:', {
      message: errorMessage,
      details: errorDetails,
      stack: error.stack
    });
    
    return { success: false, error: errorMessage };
  }
};

module.exports = {
  sendPasswordResetEmail,
  sendContactFormEmail
}; 