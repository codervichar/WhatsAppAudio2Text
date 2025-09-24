const { sendContactFormEmail } = require('../services/emailService');
const { pool } = require('../config/database');

// @desc    Send contact form email to admin
// @route   POST /api/contact
// @access  Public
const sendContactForm = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    // Basic validation
    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    // Length validation
    if (name.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Name must be less than 100 characters'
      });
    }

    if (subject.length > 200) {
      return res.status(400).json({
        success: false,
        message: 'Subject must be less than 200 characters'
      });
    }

    if (message.length > 2000) {
      return res.status(400).json({
        success: false,
        message: 'Message must be less than 2000 characters'
      });
    }

    // Check if user is authenticated to link the ticket to user account
    let userId = null;
    if (req.user && req.user.id) {
      userId = req.user.id;
    }

    // Start database transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Save support ticket to database
      const [result] = await connection.execute(
        `INSERT INTO support_tickets (name, email, subject, message, user_id, status, priority, created_at) 
         VALUES (?, ?, ?, ?, ?, 'open', 'medium', CURRENT_TIMESTAMP)`,
        [name.trim(), email.trim(), subject.trim(), message.trim(), userId]
      );

      const ticketId = result.insertId;

      // Send email to admin
      const emailResult = await sendContactFormEmail({
        name: name.trim(),
        email: email.trim(),
        subject: subject.trim(),
        message: message.trim(),
        ticketId: ticketId
      });

      if (emailResult.success) {
        // Update ticket with email sent status
        await connection.execute(
          'UPDATE support_tickets SET email_sent = TRUE, email_sent_at = CURRENT_TIMESTAMP WHERE id = ?',
          [ticketId]
        );
      } else {
        console.error('Failed to send contact form email:', emailResult.error);
        // Don't fail the request if email fails, but log it
      }

      await connection.commit();

      res.json({
        success: true,
        message: 'Your message has been sent successfully. We will get back to you soon!',
        data: {
          ticketId: ticketId,
          emailSent: emailResult.success
        }
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// @desc    Get support tickets (Admin only)
// @route   GET /api/contact/tickets
// @access  Private (Admin)
const getSupportTickets = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, priority, search } = req.query;
    const offset = (page - 1) * limit;

    // Build WHERE clause
    let whereClause = 'WHERE 1=1';
    const queryParams = [];

    if (status) {
      whereClause += ' AND status = ?';
      queryParams.push(status);
    }

    if (priority) {
      whereClause += ' AND priority = ?';
      queryParams.push(priority);
    }

    if (search) {
      whereClause += ' AND (name LIKE ? OR email LIKE ? OR subject LIKE ? OR message LIKE ?)';
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    // Get total count
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM support_tickets ${whereClause}`,
      queryParams
    );
    const total = countResult[0].total;

    // Get tickets
    const [tickets] = await pool.execute(
      `SELECT * FROM support_tickets_view ${whereClause} 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      [...queryParams, parseInt(limit), offset]
    );

    res.json({
      success: true,
      data: {
        tickets,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get support tickets error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// @desc    Update support ticket status (Admin only)
// @route   PUT /api/contact/tickets/:id
// @access  Private (Admin)
const updateSupportTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, priority, admin_notes } = req.body;

    const updates = [];
    const queryParams = [];

    if (status) {
      updates.push('status = ?');
      queryParams.push(status);
    }

    if (priority) {
      updates.push('priority = ?');
      queryParams.push(priority);
    }

    if (admin_notes !== undefined) {
      updates.push('admin_notes = ?');
      queryParams.push(admin_notes);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update'
      });
    }

    queryParams.push(id);

    await pool.execute(
      `UPDATE support_tickets SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      queryParams
    );

    res.json({
      success: true,
      message: 'Support ticket updated successfully'
    });

  } catch (error) {
    console.error('Update support ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  sendContactForm,
  getSupportTickets,
  updateSupportTicket
};
