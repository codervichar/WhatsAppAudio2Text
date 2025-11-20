const nodemailer = require('nodemailer');

// Create reusable transporter object using SMTP transport
const createTransporter = () => {
  // Validate SMTP configuration
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error('SMTP configuration is missing. Please set SMTP_HOST, SMTP_USER, and SMTP_PASS environment variables.');
  }

  const port = parseInt(process.env.SMTP_PORT) || 587;
  
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: port,
    secure: port === 465, // true for 465 (SSL), false for other ports (STARTTLS)
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

// Send password reset email
const sendPasswordResetEmail = async (email, resetToken, firstName = 'User') => {
  try {
    // Validate email parameter
    if (!email || !email.includes('@')) {
      throw new Error('Invalid email address');
    }

    const transporter = createTransporter();

    // Verify transporter connection
    await transporter.verify();

    // Password reset URL - adjust this to match your frontend URL
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: `"voicenotescribe" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Password Reset Request - voicenotescribe',
      html: `
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
      `,
      text: `
        Hello ${firstName}!
        
        We received a request to reset your password for your voicenotescribe account.
        
        Please click the following link to reset your password:
        ${resetUrl}
        
        This link will expire in 1 hour for security reasons.
        
        If you didn't request this password reset, please ignore this email.
        
        Best regards,
        The voicenotescribe Team
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Password reset email sent via SMTP:', info.messageId);
    return { success: true, messageId: info.messageId };

  } catch (error) {
    console.error('Error sending password reset email via SMTP:', error);
    
    // Provide more specific error messages
    let errorMessage = error.message;
    if (error.code === 'EAUTH') {
      errorMessage = 'SMTP authentication failed. Please check your SMTP_USER and SMTP_PASS credentials.';
    } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
      errorMessage = 'Failed to connect to SMTP server. Please check your SMTP_HOST and SMTP_PORT settings.';
    } else if (error.message.includes('SMTP configuration is missing')) {
      errorMessage = error.message;
    }
    
    return { success: false, error: errorMessage };
  }
};

// Send contact form email to admin
const sendContactFormEmail = async (contactData) => {
  try {
    const { name, email, subject, message, ticketId } = contactData;
    
    // Validate required fields
    if (!name || !email || !subject || !message) {
      throw new Error('Missing required contact form fields');
    }
    
    if (!email.includes('@')) {
      throw new Error('Invalid email address');
    }
    
    const transporter = createTransporter();
    
    // Verify transporter connection
    await transporter.verify();
    
    const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER;
    
    const mailOptions = {
      from: `"${name}" <${process.env.SMTP_USER}>`,
      to: adminEmail,
      replyTo: email,
      subject: `Contact Form: ${subject} - voicenotescribe`,
      html: `
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
      `,
      text: `
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
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Contact form email sent to admin:', info.messageId);
    return { success: true, messageId: info.messageId };

  } catch (error) {
    console.error('Error sending contact form email:', error);
    
    // Provide more specific error messages
    let errorMessage = error.message;
    if (error.code === 'EAUTH') {
      errorMessage = 'SMTP authentication failed. Please check your SMTP_USER and SMTP_PASS credentials.';
    } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
      errorMessage = 'Failed to connect to SMTP server. Please check your SMTP_HOST and SMTP_PORT settings.';
    } else if (error.message.includes('SMTP configuration is missing')) {
      errorMessage = error.message;
    }
    
    return { success: false, error: errorMessage };
  }
};

module.exports = {
  sendPasswordResetEmail,
  sendContactFormEmail
}; 