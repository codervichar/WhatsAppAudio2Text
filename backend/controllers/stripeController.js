const Stripe = require('stripe');
const { pool } = require('../config/database');

// Initialize Stripe with proper error handling
let stripe;
try {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.warn('⚠️ STRIPE_SECRET_KEY not found in environment variables');
    console.warn('⚠️ Stripe functionality will be disabled');
  } else {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    console.log('✅ Stripe initialized successfully');
    
    // Log configuration for debugging
    console.log('🔧 Stripe Configuration:', {
      hasSecretKey: !!process.env.STRIPE_SECRET_KEY,
      hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
      frontendUrl: process.env.FRONTEND_URL || process.env.APP_URL || 'Not set',
      appUrl: process.env.APP_URL || 'Not set'
    });
  }
} catch (error) {
  console.error('❌ Failed to initialize Stripe:', error.message);
  console.warn('⚠️ Stripe functionality will be disabled');
}

// @desc    Create checkout session
// @route   POST /api/stripe/create-checkout-session
// @access  Private
const createCheckoutSession = async (req, res) => {
  const { priceId, planType, email } = req.body;

  console.log('🔧 createCheckoutSession called with:', {
    priceId,
    planType,
    email,
    userId: req.user?.id,
    userEmail: req.user?.email
  });

  // Check if Stripe is initialized
  if (!stripe) {
    console.error('❌ Stripe not initialized');
    return res.status(503).json({
      success: false,
      message: 'Stripe service is not configured. Please set STRIPE_SECRET environment variable.'
    });
  }

  // Log environment variables for debugging
  console.log('🔧 Environment variables:', {
    FRONTEND_URL: process.env.FRONTEND_URL,
    APP_URL: process.env.APP_URL,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ? 'Set' : 'Not set'
  });
  
  try {
    // Handle both authenticated and unauthenticated users
    let userId = null;
    let userEmail = email;
    
    if (req.user) {
      // Authenticated user
      userId = req.user.id;
      userEmail = req.user.email;
    } else {
      // Unauthenticated user - email is optional
      userEmail = email || '';
    }

    if (!priceId) {
      return res.status(400).json({
        success: false,
        message: 'Price ID is required'
      });
    }

    // Get user details if authenticated
    let user = { email: userEmail, first_name: '', last_name: '' };
    
    if (userId) {
      const [users] = await pool.execute(
        'SELECT email, first_name, last_name FROM users WHERE id = ?',
        [userId]
      );

      if (users.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      user = users[0];
    }

    // Create checkout session
    const sessionConfig = {
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:5173'}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:5173'}/subscription/cancel`,
      metadata: {
        userId: userId ? userId.toString() : 'guest',
        planType: planType || 'monthly'
      },
      subscription_data: {
        metadata: {
          userId: userId ? userId.toString() : 'guest',
          planType: planType || 'monthly'
        }
      }
    };

    console.log('🔧 Creating checkout session with config:', {
      priceId,
      planType,
      userId,
      success_url: sessionConfig.success_url,
      cancel_url: sessionConfig.cancel_url
    });

    // Only add customer_email if it's provided
    if (user.email) {
      sessionConfig.customer_email = user.email;
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    console.log('✅ Checkout session created successfully:', {
      sessionId: session.id,
      url: session.url,
      success_url: sessionConfig.success_url,
      cancel_url: sessionConfig.cancel_url
    });

    res.json({
      success: true,
      data: {
        sessionId: session.id,
        url: session.url
      }
    });

  } catch (error) {
    console.error('Create checkout session error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      priceId,
      planType,
      userId: req.user?.id
    });
    
    // Provide more specific error messages
    let errorMessage = 'Failed to create checkout session';
    let errorDetails = error.message;
    
    if (error.message.includes('Invalid API key')) {
      errorMessage = 'Stripe API key is invalid or not configured';
      errorDetails = 'Please check your STRIPE_SECRET_KEY in the .env file. Get your key from https://dashboard.stripe.com/apikeys';
    } else if (error.message.includes('No such price')) {
      errorMessage = 'Invalid price ID provided';
      errorDetails = 'The price ID does not exist in your Stripe account';
    } else if (error.message.includes('authentication')) {
      errorMessage = 'Stripe authentication failed';
      errorDetails = 'Please verify your Stripe API keys are correct';
    }
    
    res.status(500).json({
      success: false,
      message: errorMessage,
      details: errorDetails
    });
  }
};

// @desc    Handle Stripe webhook
// @route   POST /api/stripe/webhook
// @access  Public
const handleWebhook = async (req, res) => {
  // Check if Stripe is initialized
  if (!stripe) {
    return res.status(503).json({
      success: false,
      message: 'Stripe service is not configured. Please set STRIPE_SECRET environment variable.'
    });
  }
  
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object);
        break;
      case 'checkout.session.expired':
        await handleCheckoutSessionExpired(event.data.object);
        break;
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
};

// Handle checkout session completed
const handleCheckoutSessionCompleted = async (session) => {
  const userId = session.metadata?.userId;
  const planType = session.metadata?.planType;

  if (!userId) {
    console.error('No userId in session metadata');
    return;
  }

  try {
    // Get user details
    const [users] = await pool.execute(
      'SELECT email, first_name, last_name, stripe_cust_id FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      console.error(`User ${userId} not found`);
      return;
    }

    const user = users[0];

    // Always create payment history record (for both successful and failed payments)
    const [existingPayment] = await pool.execute(
      'SELECT id FROM payment_history WHERE stripe_session_id = ?',
      [session.id]
    );

    if (existingPayment.length === 0) {
      try {
        await pool.execute(
          `INSERT INTO payment_history (
            user_id,
            stripe_session_id,
            amount,
            currency,
            payment_status,
            plan_type,
            payment_method,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [
            userId,
            session.id,
            session.amount_total / 100, // Convert from cents
            session.currency,
            session.payment_status,
            planType,
            session.payment_method_types?.[0] || 'card'
          ]
        );
        console.log(`✅ Payment history record created for session ${session.id} with status: ${session.payment_status}`);
      } catch (insertError) {
        if (insertError.code === 'ER_DUP_ENTRY') {
          console.log(`ℹ️ Payment history record already exists for session ${session.id} (race condition)`);
        } else {
          console.error('Error creating payment history record:', insertError);
        }
      }
    } else {
      console.log(`ℹ️ Payment history record already exists for session ${session.id}`);
    }

    // Only update user subscription status if payment was successful
    if (session.payment_status === 'paid') {
      // Update user subscription status and add Stripe customer ID (only if not already set)
      const currentStripeCustId = user.stripe_cust_id;
      const stripeCustId = currentStripeCustId || session.customer;
      
      await pool.execute(
        `UPDATE users SET 
         is_subscribed = 1,
         stripe_cust_id = ?,
         updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [stripeCustId, userId]
      );

      console.log(`✅ User ${userId} subscription status updated. Stripe Customer ID: ${stripeCustId}`);
      console.log(`💰 Payment amount: ${session.currency} ${session.amount_total / 100}`);
    } else {
      console.log(`⚠️ Payment not completed for user ${userId}. Status: ${session.payment_status}`);
    }

  } catch (error) {
    console.error('Error handling checkout session completed:', error);
  }
};

// Handle checkout session expired
const handleCheckoutSessionExpired = async (session) => {
  const userId = session.metadata?.userId;

  if (!userId) {
    console.error('No userId in session metadata for expired session');
    return;
  }

  try {
    // Get user details
    const [users] = await pool.execute(
      'SELECT email, first_name, last_name, stripe_cust_id FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      console.error(`User ${userId} not found for expired session`);
      return;
    }

    const user = users[0];

    // Create payment history record for expired session
    const [existingPayment] = await pool.execute(
      'SELECT id FROM payment_history WHERE stripe_session_id = ?',
      [session.id]
    );

    if (existingPayment.length === 0) {
      try {
        await pool.execute(
          `INSERT INTO payment_history (
            user_id,
            stripe_session_id,
            amount,
            currency,
            payment_status,
            plan_type,
            payment_method,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [
            userId,
            session.id,
            session.amount_total / 100, // Convert from cents
            session.currency,
            'expired',
            session.metadata?.planType || 'monthly',
            session.payment_method_types?.[0] || 'card'
          ]
        );
        console.log(`✅ Payment history record created for expired session ${session.id}`);
      } catch (insertError) {
        if (insertError.code === 'ER_DUP_ENTRY') {
          console.log(`ℹ️ Payment history record already exists for expired session ${session.id} (race condition)`);
        } else {
          console.error('Error creating payment history record for expired session:', insertError);
        }
      }
    } else {
      console.log(`ℹ️ Payment history record already exists for expired session ${session.id}`);
    }

    // Update user subscription status if it was a paid session
    if (session.payment_status === 'paid') {
      const currentStripeCustId = user.stripe_cust_id;
      const stripeCustId = currentStripeCustId || session.customer;
      
      await pool.execute(
        `UPDATE users SET 
         is_subscribed = 1,
         stripe_cust_id = ?,
         updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [stripeCustId, userId]
      );
      console.log(`✅ User ${userId} subscription status updated for expired session. Stripe Customer ID: ${stripeCustId}`);
    } else {
      console.log(`⚠️ Payment not completed for user ${userId} for expired session. Status: ${session.payment_status}`);
    }

  } catch (error) {
    console.error('Error handling checkout session expired:', error);
  }
};

// Handle subscription created
const handleSubscriptionCreated = async (subscription) => {
  const userId = subscription.metadata?.userId;
  const planType = subscription.metadata?.planType;

  if (!userId) {
    console.error('No userId in subscription metadata');
    return;
  }

  try {
    // Get subscription minutes from environment variable
    const subscriptionMinutes = process.env.PRO_MONTHLY_MINUTES || 3000;
    
    // Get plan details from Stripe (only if Stripe is initialized)
    let price = null;
    let product = null;
    if (stripe) {
      try {
        price = await stripe.prices.retrieve(subscription.items.data[0].price.id);
        product = await stripe.products.retrieve(price.product);
      } catch (stripeError) {
        console.warn('⚠️ Could not retrieve Stripe price/product details:', stripeError.message);
      }
    }

    // Check if subscription record already exists
    const [existingSubscription] = await pool.execute(
      'SELECT id FROM subscriptions WHERE subscription_id = ?',
      [subscription.id]
    );

    // Only insert subscription record if it doesn't exist
    if (existingSubscription.length === 0) {
      try {
        await pool.execute(
          `INSERT INTO subscriptions (
            user_id, 
            subscription_id, 
            plan, 
            type, 
            status, 
            subscription_minutes,
            amount,
            currency,
            billing_interval,
            current_period_start,
            current_period_end,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [
            userId,
            subscription.id,
            planType,
            subscription.items.data[0].price.recurring?.interval || 'month',
            subscription.status,
            subscriptionMinutes,
            subscription.items.data[0].price.unit_amount / 100, // Convert from cents
            subscription.currency,
            subscription.items.data[0].price.recurring?.interval || 'month',
            new Date(subscription.current_period_start * 1000),
            new Date(subscription.current_period_end * 1000)
          ]
        );
        console.log(`✅ Subscription record created for subscription ${subscription.id}`);
      } catch (insertError) {
        // Handle race condition where another process might have inserted the record
        if (insertError.code === 'ER_DUP_ENTRY') {
          console.log(`ℹ️ Subscription record already exists for subscription ${subscription.id} (race condition)`);
        } else {
          throw insertError;
        }
      }
    } else {
      console.log(`ℹ️ Subscription record already exists for subscription ${subscription.id}`);
    }

    // Update user with subscription details
    await pool.execute(
      `UPDATE users SET 
       subscription_plan = ?,
       subscription_status = ?,
       updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [planType, subscription.status, userId]
    );

    console.log(`✅ Subscription created for user ${userId}: ${subscription.id}`);
    console.log(`📅 Period: ${new Date(subscription.current_period_start * 1000).toISOString()} to ${new Date(subscription.current_period_end * 1000).toISOString()}`);
    console.log(`💰 Amount: ${subscription.currency} ${subscription.items.data[0].price.unit_amount / 100}`);

  } catch (error) {
    console.error('Error handling subscription created:', error);
  }
};

// Handle subscription updated
const handleSubscriptionUpdated = async (subscription) => {
  const userId = subscription.metadata?.userId;

  if (!userId) {
    console.error('No userId in subscription metadata');
    return;
  }

  // Update subscription record
  await pool.execute(
    `UPDATE subscriptions SET 
     status = ?,
     updated_at = CURRENT_TIMESTAMP
     WHERE subscription_id = ?`,
    [subscription.status, subscription.id]
  );

  // Update user subscription status
  if (subscription.status === 'active') {
    await pool.execute(
      'UPDATE users SET is_subscribed = true WHERE id = ?',
      [userId]
    );
  } else if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
    await pool.execute(
      'UPDATE users SET is_subscribed = false WHERE id = ?',
      [userId]
    );
  }

  console.log(`Subscription updated for user ${userId}: ${subscription.status}`);
};

// Handle subscription deleted
const handleSubscriptionDeleted = async (subscription) => {
  const userId = subscription.metadata?.userId;

  if (!userId) {
    console.error('No userId in subscription metadata');
    return;
  }

  // Update subscription record
  await pool.execute(
    `UPDATE subscriptions SET 
     status = 'canceled',
     updated_at = CURRENT_TIMESTAMP
     WHERE subscription_id = ?`,
    [subscription.id]
  );

  // Update user subscription status
  await pool.execute(
    'UPDATE users SET is_subscribed = false WHERE id = ?',
    [userId]
  );

  console.log(`Subscription canceled for user ${userId}`);
};

// Handle payment succeeded
const handlePaymentSucceeded = async (invoice) => {
  if (invoice.subscription && stripe) {
    try {
      const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
      const userId = subscription.metadata?.userId;

      if (userId) {
        // Reset used minutes for new billing cycle
        await pool.execute(
          'UPDATE subscriptions SET used_minutes = 0 WHERE subscription_id = ?',
          [subscription.id]
        );

        // Create payment history record for successful payment
        const [existingPayment] = await pool.execute(
          'SELECT id FROM payment_history WHERE stripe_session_id = ?',
          [invoice.id]
        );

        if (existingPayment.length === 0) {
          try {
            await pool.execute(
              `INSERT INTO payment_history (
                user_id,
                stripe_session_id,
                amount,
                currency,
                payment_status,
                plan_type,
                payment_method,
                created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
              [
                userId,
                invoice.id,
                invoice.amount_paid / 100, // Convert from cents
                invoice.currency,
                'paid',
                'monthly', // Default plan type
                'card' // Default payment method
              ]
            );
            console.log(`✅ Payment history record created for successful payment: ${invoice.id}`);
          } catch (insertError) {
            if (insertError.code !== 'ER_DUP_ENTRY') {
              console.error('Error creating payment history for successful payment:', insertError);
            }
          }
        }

        console.log(`Payment succeeded for user ${userId}, resetting minutes`);
      }
    } catch (error) {
      console.error('Error handling payment succeeded:', error.message);
    }
  }
};

// Handle payment failed
const handlePaymentFailed = async (invoice) => {
  if (invoice.subscription && stripe) {
    try {
      const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
      const userId = subscription.metadata?.userId;

      if (userId) {
        // Update subscription status
        await pool.execute(
          `UPDATE subscriptions SET 
           status = 'past_due',
           updated_at = CURRENT_TIMESTAMP
           WHERE subscription_id = ?`,
          [subscription.id]
        );

        // Create payment history record for failed payment
        const [existingPayment] = await pool.execute(
          'SELECT id FROM payment_history WHERE stripe_session_id = ?',
          [invoice.id]
        );

        if (existingPayment.length === 0) {
          try {
            await pool.execute(
              `INSERT INTO payment_history (
                user_id,
                stripe_session_id,
                amount,
                currency,
                payment_status,
                plan_type,
                payment_method,
                created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
              [
                userId,
                invoice.id,
                invoice.amount_due / 100, // Convert from cents
                invoice.currency,
                'failed',
                'monthly', // Default plan type
                'card' // Default payment method
              ]
            );
            console.log(`✅ Payment history record created for failed payment: ${invoice.id}`);
          } catch (insertError) {
            if (insertError.code !== 'ER_DUP_ENTRY') {
              console.error('Error creating payment history for failed payment:', insertError);
            }
          }
        }

        console.log(`Payment failed for user ${userId}`);
      }
    } catch (error) {
      console.error('Error handling payment failed:', error.message);
    }
  }
};

// @desc    Get subscription status
// @route   GET /api/stripe/subscription-status
// @access  Private
const getSubscriptionStatus = async (req, res) => {
  try {
    const userId = req.user.id;

         const [subscriptions] = await pool.execute(
       `SELECT 
          s.id, s.subscription_id, s.plan, s.type, s.status,
          s.subscription_minutes, s.used_minutes, s.amount, s.currency,
          s.billing_interval, s.current_period_start, s.current_period_end,
          s.created_at, s.updated_at
        FROM subscriptions s
        WHERE s.user_id = ? AND s.status IN ('active', 'past_due')
        ORDER BY s.created_at DESC
        LIMIT 1`,
       [userId]
     );

    if (subscriptions.length === 0) {
      return res.json({
        success: true,
        data: {
          hasActiveSubscription: false,
          subscription: null
        }
      });
    }

    const subscription = subscriptions[0];
    const minutesLeft = Math.max(subscription.subscription_minutes - subscription.used_minutes, 0);

    res.json({
      success: true,
      data: {
        hasActiveSubscription: true,
                 subscription: {
           id: subscription.id,
           stripeSubscriptionId: subscription.subscription_id,
           plan: subscription.plan,
          type: subscription.type,
          status: subscription.status,
          subscriptionMinutes: subscription.subscription_minutes,
          usedMinutes: subscription.used_minutes,
          minutesLeft: minutesLeft,
          amount: subscription.amount,
          currency: subscription.currency,
          interval: subscription.billing_interval,
          currentPeriodStart: subscription.current_period_start,
          currentPeriodEnd: subscription.current_period_end,
          createdAt: subscription.created_at,
          updatedAt: subscription.updated_at
        }
      }
    });

  } catch (error) {
    console.error('Get subscription status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get subscription status'
    });
  }
};

// @desc    Cancel subscription
// @route   POST /api/stripe/cancel-subscription
// @access  Private
const cancelSubscription = async (req, res) => {
  // Check if Stripe is initialized
  if (!stripe) {
    return res.status(503).json({
      success: false,
      message: 'Stripe service is not configured. Please set STRIPE_SECRET environment variable.'
    });
  }
  
  try {
    const userId = req.user.id;

         // Get user's active subscription
     const [subscriptions] = await pool.execute(
       'SELECT subscription_id FROM subscriptions WHERE user_id = ? AND status = "active"',
       [userId]
     );

    if (subscriptions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No active subscription found'
      });
    }

         const subscriptionId = subscriptions[0].subscription_id;

    // Cancel subscription in Stripe
    await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true
    });

         // Update local database - set status to 'canceling' to indicate scheduled cancellation
     await pool.execute(
       `UPDATE subscriptions SET 
        status = 'canceling',
        updated_at = CURRENT_TIMESTAMP
        WHERE subscription_id = ?`,
       [subscriptionId]
     );

    res.json({
      success: true,
      message: 'Subscription will be canceled at the end of the current billing period'
    });

  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel subscription'
    });
  }
};

// @desc    Get detailed subscription information
// @route   GET /api/stripe/subscription-details
// @access  Private
const getSubscriptionDetails = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get current subscription
    const [subscriptions] = await pool.execute(
      `SELECT 
         s.*, u.email, u.first_name, u.last_name
       FROM subscriptions s
       JOIN users u ON s.user_id = u.id
       WHERE s.user_id = ? 
       ORDER BY s.created_at DESC
       LIMIT 1`,
      [userId]
    );

    // Get payment history
    const [payments] = await pool.execute(
      `SELECT 
         ph.*, s.plan_type as subscription_plan
       FROM payment_history ph
       LEFT JOIN subscriptions s ON ph.user_id = s.user_id
       WHERE ph.user_id = ?
       ORDER BY ph.created_at DESC
       LIMIT 10`,
      [userId]
    );

    // Get usage statistics
    const [usageStats] = await pool.execute(
      `SELECT 
         COUNT(*) as total_transcriptions,
         SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_transcriptions,
         SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_transcriptions,
         SUM(file_size) as total_file_size
       FROM transcriptions
       WHERE user_id = ?`,
      [userId]
    );

    const subscription = subscriptions[0] || null;
    const minutesLeft = subscription ? Math.max(subscription.subscription_minutes - subscription.used_minutes, 0) : 0;

    res.json({
      success: true,
      data: {
                 subscription: subscription ? {
           id: subscription.id,
           stripeSubscriptionId: subscription.subscription_id,
           plan: subscription.plan,
          type: subscription.type,
          status: subscription.status,
          subscriptionMinutes: subscription.subscription_minutes,
          usedMinutes: subscription.used_minutes,
          minutesLeft: minutesLeft,
          amount: subscription.amount,
          currency: subscription.currency,
          interval: subscription.billing_interval,
          currentPeriodStart: subscription.current_period_start,
          currentPeriodEnd: subscription.current_period_end,
          createdAt: subscription.created_at,
          updatedAt: subscription.updated_at
        } : null,
        paymentHistory: payments.map(payment => ({
          id: payment.id,
          amount: payment.amount,
          currency: payment.currency,
          paymentStatus: payment.payment_status,
          planType: payment.plan_type,
          paymentMethod: payment.payment_method,
          createdAt: payment.created_at
        })),
        usageStats: {
          totalTranscriptions: usageStats[0]?.total_transcriptions || 0,
          completedTranscriptions: usageStats[0]?.completed_transcriptions || 0,
          failedTranscriptions: usageStats[0]?.failed_transcriptions || 0,
          totalFileSize: usageStats[0]?.total_file_size || 0
        }
      }
    });

  } catch (error) {
    console.error('Get subscription details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get subscription details'
    });
  }
};

// @desc    Get payment history
// @route   GET /api/stripe/payment-history
// @access  Private
const getPaymentHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // Get total count
    const [countResult] = await pool.execute(
      'SELECT COUNT(*) as total FROM payment_history WHERE user_id = ?',
      [userId]
    );

    // Get payment history with pagination
    const [payments] = await pool.execute(
      `SELECT 
         ph.*, s.plan_type as subscription_plan
       FROM payment_history ph
       LEFT JOIN subscriptions s ON ph.user_id = s.user_id
       WHERE ph.user_id = ?
       ORDER BY ph.created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, parseInt(limit), offset]
    );

    const totalPages = Math.ceil(countResult[0].total / limit);

    res.json({
      success: true,
      data: {
        payments: payments.map(payment => ({
          id: payment.id,
          amount: payment.amount,
          currency: payment.currency,
          paymentStatus: payment.payment_status,
          planType: payment.plan_type,
          paymentMethod: payment.payment_method,
          stripeSessionId: payment.stripe_session_id,
          createdAt: payment.created_at
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: countResult[0].total,
          itemsPerPage: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payment history'
    });
  }
};

// @desc    Verify payment session
// @route   POST /api/stripe/verify-session
// @access  Private
const verifyPaymentSession = async (req, res) => {
  // Check if Stripe is initialized
  if (!stripe) {
    return res.status(503).json({
      success: false,
      message: 'Stripe service is not configured. Please set STRIPE_SECRET environment variable.'
    });
  }
  
  try {
    const { sessionId } = req.body;
    const userId = req.user.id;
    
    console.log('🔍 Verifying session:', { sessionId, userId });

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Session ID is required'
      });
    }

    // Retrieve session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    console.log('📊 Session retrieved:', { 
      id: session.id, 
      paymentStatus: session.payment_status, 
      status: session.status,
      metadata: session.metadata 
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Check if session is expired or invalid
    if (session.status === 'expired') {
      return res.status(400).json({
        success: false,
        message: 'Payment session has expired. Please try again.'
      });
    }

    // Verify the session belongs to this user or was created as a guest
    const sessionUserId = session.metadata?.userId;
    console.log('🔐 User verification:', { sessionUserId, currentUserId: userId.toString() });
    
    if (sessionUserId !== userId.toString() && sessionUserId !== 'guest') {
      console.log('❌ User verification failed');
      return res.status(403).json({
        success: false,
        message: 'Session does not belong to this user'
      });
    }

    // Check payment status first
    if (session.payment_status !== 'paid') {
      // Create payment history record for failed payment
      try {
        await pool.execute(
          `INSERT INTO payment_history (
            user_id,
            stripe_session_id,
            amount,
            currency,
            payment_status,
            plan_type,
            payment_method,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [
            userId,
            session.id,
            session.amount_total / 100,
            session.currency,
            session.payment_status,
            session.metadata?.planType || 'monthly',
            session.payment_method_types?.[0] || 'card'
          ]
        );
        console.log(`📝 Payment history record created for failed payment: ${session.id}`);
      } catch (insertError) {
        if (insertError.code !== 'ER_DUP_ENTRY') {
          console.error('Error creating payment history for failed payment:', insertError);
        }
      }

      return res.status(400).json({
        success: false,
        message: `Payment not completed. Status: ${session.payment_status}`
      });
    }

    // Payment is successful - update database for all user types
    console.log('✅ Payment successful, updating database for user:', userId);
    
    try {
      // 1. Update user table: set is_subscribed = 1 and update stripe_cust_id if not exists
      const [existingUser] = await pool.execute(
        'SELECT stripe_cust_id FROM users WHERE id = ?',
        [userId]
      );

      if (existingUser.length > 0) {
        const currentStripeCustId = existingUser[0].stripe_cust_id;
        const stripeCustId = currentStripeCustId || session.customer;
        
        await pool.execute(
          `UPDATE users SET 
           is_subscribed = 1,
           stripe_cust_id = ?,
           updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [stripeCustId, userId]
        );
        console.log(`✅ User ${userId} subscription status updated. Stripe Customer ID: ${stripeCustId}`);
      }

      // 2. Create payment history record if it doesn't exist
      const [existingPayment] = await pool.execute(
        'SELECT id FROM payment_history WHERE stripe_session_id = ?',
        [session.id]
      );

      if (existingPayment.length === 0) {
        await pool.execute(
          `INSERT INTO payment_history (
            user_id,
            stripe_session_id,
            amount,
            currency,
            payment_status,
            plan_type,
            payment_method,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [
            userId,
            session.id,
            session.amount_total / 100,
            session.currency,
            session.payment_status,
            session.metadata?.planType || 'monthly',
            session.payment_method_types?.[0] || 'card'
          ]
        );
        console.log(`✅ Payment history record created for session ${session.id}`);
      } else {
        console.log(`ℹ️ Payment history record already exists for session ${session.id}`);
      }

      // 3. Create subscription record if it doesn't exist
      const [existingSubscription] = await pool.execute(
        'SELECT id FROM subscriptions WHERE user_id = ? AND subscription_id = ?',
        [userId, session.subscription || null]
      );

      if (existingSubscription.length === 0) {
        const subscriptionMinutes = process.env.PRO_MONTHLY_MINUTES || 3000;
        await pool.execute(
          `INSERT INTO subscriptions (
            user_id,
            subscription_id,
            plan,
            type,
            status,
            subscription_minutes,
            amount,
            currency,
            billing_interval,
            current_period_start,
            current_period_end,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [
            userId,
            session.subscription || null,
            session.metadata?.planType || 'monthly',
            'month',
            'active',
            subscriptionMinutes,
            session.amount_total / 100,
            session.currency,
            'month',
            new Date(session.created * 1000),
            new Date((session.created + 30 * 24 * 60 * 60) * 1000) // 30 days from creation
          ]
        );
        console.log(`✅ Subscription record created for user ${userId}`);
      } else {
        console.log(`ℹ️ Subscription record already exists for user ${userId}`);
      }

    } catch (error) {
      console.error('❌ Error updating database:', error);
      return res.status(500).json({
        success: false,
        message: 'Payment verification succeeded but database update failed. Please contact support.'
      });
    }

    console.log('✅ Payment verification and database update successful');

    // Get subscription details if available
    let subscription = null;
    if (session.subscription) {
      subscription = await stripe.subscriptions.retrieve(session.subscription);
    }

    res.json({
      success: true,
      data: {
        session: {
          id: session.id,
          paymentStatus: session.payment_status,
          status: session.status,
          amountTotal: session.amount_total / 100,
          currency: session.currency,
          customerEmail: session.customer_email,
          createdAt: new Date(session.created * 1000)
        },
        subscription: subscription ? {
          id: subscription.id,
          status: subscription.status,
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          amount: subscription.items.data[0]?.price.unit_amount / 100,
          currency: subscription.currency
        } : null
      }
    });

  } catch (error) {
    console.error('Verify payment session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify payment session'
    });
  }
};

module.exports = {
  createCheckoutSession,
  handleWebhook,
  getSubscriptionStatus,
  getSubscriptionDetails,
  getPaymentHistory,
  verifyPaymentSession,
  cancelSubscription
}; 