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

// Utility function to safely convert Stripe timestamps to ISO strings
const safeTimestampToISO = (timestamp) => {
  if (!timestamp || timestamp === null || timestamp === undefined) {
    return 'N/A';
  }
  try {
    return new Date(timestamp * 1000).toISOString();
  } catch (error) {
    console.warn('⚠️ Invalid timestamp conversion:', timestamp, error.message);
    return 'Invalid';
  }
};

// Utility function to safely convert Stripe timestamps to Date objects for database
const safeTimestampToDate = (timestamp) => {
  if (!timestamp || timestamp === null || timestamp === undefined) {
    return null;
  }
  try {
    return new Date(timestamp * 1000);
  } catch (error) {
    console.warn('⚠️ Invalid timestamp conversion for database:', timestamp, error.message);
    return null;
  }
};

// Utility function to safely convert Stripe session timestamps to Date objects
const safeSessionTimestampToDate = (timestamp) => {
  if (!timestamp || timestamp === null || timestamp === undefined) {
    return null;
  }
  try {
    return new Date(timestamp * 1000);
  } catch (error) {
    console.warn('⚠️ Invalid session timestamp conversion:', timestamp, error.message);
    return null;
  }
};

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
  console.log('📨 Webhook received:', {
    method: req.method,
    url: req.originalUrl,
    headers: {
      'stripe-signature': req.headers['stripe-signature'] ? 'Present' : 'Missing',
      'content-type': req.headers['content-type'],
      'user-agent': req.headers['user-agent']
    },
    bodyLength: req.body ? req.body.length : 'No body',
    webhookSecretConfigured: !!process.env.STRIPE_WEBHOOK_SECRET
  });

  // Check if Stripe is initialized
  if (!stripe) {
    console.error('❌ Stripe not initialized');
    return res.status(503).json({
      success: false,
      message: 'Stripe service is not configured. Please set STRIPE_SECRET environment variable.'
    });
  }

  // Check if webhook secret is configured
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('❌ STRIPE_WEBHOOK_SECRET not configured');
    return res.status(500).json({
      success: false,
      message: 'Webhook secret not configured'
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
    console.log('✅ Webhook signature verified successfully');
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err.message);
    console.error('❌ Webhook error details:', {
      error: err.message,
      signature: sig ? 'Present' : 'Missing',
      bodyLength: req.body ? req.body.length : 'No body',
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ? 'Configured' : 'Missing'
    });
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    console.log(`📨 Processing webhook event: ${event.type}`);
    console.log(`📨 Event ID: ${event.id}`);
    console.log(`📨 Event object:`, {
      id: event.data.object.id,
      type: event.data.object.object,
      status: event.data.object.status,
      created: event.data.object.created
    });
    
    switch (event.type) {
      // Checkout Events
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object);
        break;
      case 'checkout.session.expired':
        await handleCheckoutSessionExpired(event.data.object);
        break;
      
      // Subscription Lifecycle Events
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      case 'customer.subscription.canceled':
        await handleSubscriptionCanceled(event.data.object);
        break;
      case 'customer.subscription.trial_will_end':
        await handleSubscriptionTrialWillEnd(event.data.object);
        break;
      case 'customer.subscription.paused':
        await handleSubscriptionPaused(event.data.object);
        break;
      case 'customer.subscription.resumed':
        await handleSubscriptionResumed(event.data.object);
        break;
      
      // Payment Events
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      case 'invoice.payment_action_required':
        await handlePaymentActionRequired(event.data.object);
        break;
      
      // Additional Payment Events
      case 'invoice.payment_requires_payment_method':
        await handlePaymentRequiresPaymentMethod(event.data.object);
        break;
      case 'invoice.finalized':
        await handleInvoiceFinalized(event.data.object);
        break;
      case 'invoice.payment_intent_payment_failed':
        await handlePaymentIntentFailed(event.data.object);
        break;
      case 'invoice.payment_intent_succeeded':
        await handlePaymentIntentSucceeded(event.data.object);
        break;
      
      // Customer Events
      case 'customer.updated':
        await handleCustomerUpdated(event.data.object);
        break;
      case 'customer.deleted':
        await handleCustomerDeleted(event.data.object);
        break;
      
      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`);
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
      
      // Update user subscription status
      await pool.execute(
        `UPDATE users SET 
         is_subscribed = 1,
         stripe_cust_id = ?,
         updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [stripeCustId, userId]
      );

      console.log(`✅ User ${userId} subscription status updated:`);
      console.log(`   - Stripe Customer ID: ${stripeCustId}`);
      console.log(`   - Plan: ${planType}`);
      console.log(`   - Status: active`);
      console.log(`   - Payment amount: ${session.currency} ${session.amount_total / 100}`);
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

    // Check for existing subscriptions for this user
    const [existingSubscriptions] = await pool.execute(
      'SELECT id, status, plan FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
      [userId]
    );

    // Handle subscription creation based on existing subscriptions
    if (existingSubscriptions.length === 0) {
      // No existing subscription - create new one
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
            safeTimestampToDate(subscription.current_period_start),
            safeTimestampToDate(subscription.current_period_end)
          ]
        );
        console.log(`✅ New subscription record created for user ${userId}`);
      } catch (insertError) {
        if (insertError.code === 'ER_DUP_ENTRY') {
          console.log(`ℹ️ Subscription record already exists for subscription ${subscription.id} (race condition)`);
        } else {
          throw insertError;
        }
      }
    } else {
      const existingSubscription = existingSubscriptions[0];
      
      if (existingSubscription.plan === 'free') {
        // Free plan user upgrading - update existing to 'upgrade' status and create new active subscription
        await pool.execute(
          `UPDATE subscriptions SET 
           status = 'upgrade',
           updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [existingSubscription.id]
        );
        
        // Create new active subscription
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
            safeTimestampToDate(subscription.current_period_start),
            safeTimestampToDate(subscription.current_period_end)
          ]
        );
        console.log(`🔄 Free plan user ${userId} upgraded - old subscription marked as 'upgrade', new active subscription created`);
      } else {
        // Already subscribed user - update existing subscription
        await pool.execute(
          `UPDATE subscriptions SET 
           status = 'active',
           plan = ?,
           subscription_minutes = ?,
           amount = ?,
           currency = ?,
           current_period_start = ?,
           current_period_end = ?,
           updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [
            planType,
            subscriptionMinutes,
            subscription.items.data[0].price.unit_amount / 100,
            subscription.currency,
            safeTimestampToDate(subscription.current_period_start),
            safeTimestampToDate(subscription.current_period_end),
            existingSubscription.id
          ]
        );
        console.log(`✅ Existing subscription updated for user ${userId}`);
      }
    }

    // Update user subscription status
    await pool.execute(
      `UPDATE users SET 
       is_subscribed = 1,
       updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [userId]
    );

    console.log(`✅ Subscription created for user ${userId}: ${subscription.id}`);
    console.log(`📅 Period: ${safeTimestampToISO(subscription.current_period_start)} to ${safeTimestampToISO(subscription.current_period_end)}`);
    console.log(`💰 Amount: ${subscription.currency} ${subscription.items.data[0].price.unit_amount / 100}`);

  } catch (error) {
    console.error('Error handling subscription created:', error);
  }
};

// Handle subscription updated
const handleSubscriptionUpdated = async (subscription) => {
  const userId = subscription.metadata?.userId;

  switch (subscription.status) {
    // Active statuses - User has access
    case 'active':
      await pool.execute(
        'UPDATE users SET is_subscribed = 1 WHERE id = ?',
        [userId]
      );
      console.log(`✅ User ${userId} subscription is active`);
      break;
      
    case 'trialing':
      await pool.execute(
        'UPDATE users SET is_subscribed = 1 WHERE id = ?',
        [userId]
      );
      console.log(`🆓 User ${userId} subscription is in trial`);
      break;
      
    case 'past_due':
      await pool.execute(
        'UPDATE users SET is_subscribed = 1 WHERE id = ?',
        [userId]
      );
      console.log(`⚠️ User ${userId} subscription is past due`);
      break;
      
    case 'canceling':
      await pool.execute(
        'UPDATE users SET is_subscribed = 1 WHERE id = ?',
        [userId]
      );
      console.log(`🔄 User ${userId} subscription is being canceled`);
      break;
      
    case 'paused':
      await pool.execute(
        'UPDATE users SET is_subscribed = 1 WHERE id = ?',
        [userId]
      );
      console.log(`⏸️ User ${userId} subscription is paused`);
      break;
      
    // Inactive statuses - User loses access
    case 'canceled':
      // Update user subscription status to free
      await pool.execute(
        'UPDATE users SET is_subscribed = 0 WHERE id = ?',
        [userId]
      );
      
      // Update existing subscription record to downgraded status
      await pool.execute(
        `UPDATE subscriptions SET 
         status = 'downgraded',
         cancel_date = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
         WHERE subscription_id = ?`,
        [subscription.id]
      );
      
      // Create a new subscription record for free plan
      await pool.execute(
        `INSERT INTO subscriptions (
          user_id,
          subscription_id,
          plan,
          type,
          subscription_minutes,
          used_minutes,
          amount,
          currency,
          billing_interval,
          status,
          start_date,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          userId,
          `free_${Date.now()}`,
          'free',
          'free',
          30,
          0,
          0,
          'usd',
          'monthly',
          'active'
        ]
      );
      
      console.log(`❌ User ${userId} subscription canceled and moved to free plan`);
      break;
      
    case 'unpaid':
      await pool.execute(
        'UPDATE users SET is_subscribed = 0 WHERE id = ?',
        [userId]
      );
      console.log(`💸 User ${userId} subscription is unpaid - moved to free plan`);
      break;
      
    case 'incomplete':
      await pool.execute(
        'UPDATE users SET is_subscribed = 0 WHERE id = ?',
        [userId]
      );
      console.log(`⏳ User ${userId} subscription is incomplete - moved to free plan`);
      break;
      
    case 'incomplete_expired':
      await pool.execute(
        'UPDATE users SET is_subscribed = 0 WHERE id = ?',
        [userId]
      );
      console.log(`⏰ User ${userId} subscription is incomplete and expired - moved to free plan`);
      break;
      
    default:
      console.log(`ℹ️ Unknown subscription status: ${subscription.status} for user ${userId}`);
      // Default to unsubscribed for unknown statuses
      await pool.execute(
        'UPDATE users SET is_subscribed = 0 WHERE id = ?',
        [userId]
      );
  }

  // Create payment history record for status change
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
        `status_change_${subscription.id}_${Date.now()}`,
        0, // No amount for status changes
        'usd',
        `status_${subscription.status}`,
        subscription.items.data[0]?.price.recurring?.interval || 'monthly',
        'webhook'
      ]
    );
    console.log(`✅ Payment history record created for status change: ${subscription.status}`);
  } catch (insertError) {
    if (insertError.code !== 'ER_DUP_ENTRY') {
      console.error('Error creating payment history for status change:', insertError);
    }
  }

  console.log(`✅ Subscription updated for user ${userId}: ${subscription.status}`);
};

// Handle subscription trial will end
const handleSubscriptionTrialWillEnd = async (subscription) => {
  const userId = subscription.metadata?.userId;

  if (!userId) {
    console.error('No userId in subscription metadata');
    return;
  }

  console.log(`⚠️ Trial ending soon for user ${userId}, subscription ${subscription.id}`);
  
  // Update subscription status to indicate trial ending
  await pool.execute(
    `UPDATE subscriptions SET 
     status = 'trialing',
     updated_at = CURRENT_TIMESTAMP
     WHERE subscription_id = ?`,
    [subscription.id]
  );

  console.log(`✅ Trial ending notification processed for user ${userId}`);
};

// Handle payment action required
const handlePaymentActionRequired = async (invoice) => {
  if (invoice.subscription && stripe) {
    try {
      const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
      const userId = subscription.metadata?.userId;

      if (userId) {
        console.log(`⚠️ Payment action required for user ${userId}, subscription ${subscription.id}`);

        // Update subscription status
        await pool.execute(
          `UPDATE subscriptions SET 
           status = 'incomplete',
           updated_at = CURRENT_TIMESTAMP
           WHERE subscription_id = ?`,
          [subscription.id]
        );

        // Create payment history record
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
                invoice.amount_due / 100,
                invoice.currency,
                'requires_action',
                subscription.items.data[0]?.price.recurring?.interval || 'monthly',
                'card'
              ]
            );
            console.log(`✅ Payment history record created for action required: ${invoice.id}`);
          } catch (insertError) {
            if (insertError.code !== 'ER_DUP_ENTRY') {
              console.error('Error creating payment history for action required:', insertError);
            }
          }
        }

        console.log(`⚠️ Payment action required for user ${userId}`);
      }
    } catch (error) {
      console.error('❌ Error handling payment action required:', error.message);
    }
  }
};

// Handle subscription paused
const handleSubscriptionPaused = async (subscription) => {
  const userId = subscription.metadata?.userId;

  if (!userId) {
    console.error('No userId in subscription metadata');
    return;
  }

  console.log(`⏸️ Subscription paused for user ${userId}, subscription ${subscription.id}`);

  // Update subscription status
  await pool.execute(
    `UPDATE subscriptions SET 
     status = 'paused',
     updated_at = CURRENT_TIMESTAMP
     WHERE subscription_id = ?`,
    [subscription.id]
  );

  // Keep user subscribed but mark as paused
  await pool.execute(
    'UPDATE users SET is_subscribed = 1 WHERE id = ?',
    [userId]
  );

  console.log(`✅ Subscription paused for user ${userId}`);
};

// Handle subscription resumed
const handleSubscriptionResumed = async (subscription) => {
  const userId = subscription.metadata?.userId;

  if (!userId) {
    console.error('No userId in subscription metadata');
    return;
  }

  console.log(`▶️ Subscription resumed for user ${userId}, subscription ${subscription.id}`);

  // Update subscription status
  await pool.execute(
    `UPDATE subscriptions SET 
     status = 'active',
     updated_at = CURRENT_TIMESTAMP
     WHERE subscription_id = ?`,
    [subscription.id]
  );

  // Ensure user is subscribed
  await pool.execute(
    'UPDATE users SET is_subscribed = 1 WHERE id = ?',
    [userId]
  );

  console.log(`✅ Subscription resumed for user ${userId}`);
};

// Handle payment requires payment method
const handlePaymentRequiresPaymentMethod = async (invoice) => {
  if (invoice.subscription && stripe) {
    try {
      const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
      const userId = subscription.metadata?.userId;

      if (userId) {
        console.log(`⚠️ Payment requires payment method for user ${userId}, subscription ${subscription.id}`);

        // Update subscription status
        await pool.execute(
          `UPDATE subscriptions SET 
           status = 'incomplete',
           updated_at = CURRENT_TIMESTAMP
           WHERE subscription_id = ?`,
          [subscription.id]
        );

        // Create payment history record
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
                invoice.amount_due / 100,
                invoice.currency,
                'requires_payment_method',
                subscription.items.data[0]?.price.recurring?.interval || 'monthly',
                'card'
              ]
            );
            console.log(`✅ Payment history record created for requires payment method: ${invoice.id}`);
          } catch (insertError) {
            if (insertError.code !== 'ER_DUP_ENTRY') {
              console.error('Error creating payment history for requires payment method:', insertError);
            }
          }
        }

        console.log(`⚠️ Payment requires payment method for user ${userId}`);
      }
    } catch (error) {
      console.error('❌ Error handling payment requires payment method:', error.message);
    }
  }
};

// Handle invoice finalized
const handleInvoiceFinalized = async (invoice) => {
  if (invoice.subscription && stripe) {
    try {
      const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
      const userId = subscription.metadata?.userId;

      if (userId) {
        console.log(`📄 Invoice finalized for user ${userId}, subscription ${subscription.id}`);

        // Create payment history record if not exists
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
                invoice.amount_due / 100,
                invoice.currency,
                'finalized',
                subscription.items.data[0]?.price.recurring?.interval || 'monthly',
                'card'
              ]
            );
            console.log(`✅ Payment history record created for finalized invoice: ${invoice.id}`);
          } catch (insertError) {
            if (insertError.code !== 'ER_DUP_ENTRY') {
              console.error('Error creating payment history for finalized invoice:', insertError);
            }
          }
        }

        console.log(`📄 Invoice finalized for user ${userId}`);
      }
    } catch (error) {
      console.error('❌ Error handling invoice finalized:', error.message);
    }
  }
};

// Handle payment intent failed
const handlePaymentIntentFailed = async (invoice) => {
  if (invoice.subscription && stripe) {
    try {
      const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
      const userId = subscription.metadata?.userId;

      if (userId) {
        console.log(`❌ Payment intent failed for user ${userId}, subscription ${subscription.id}`);

        // Update subscription status
        await pool.execute(
          `UPDATE subscriptions SET 
           status = 'past_due',
           updated_at = CURRENT_TIMESTAMP
           WHERE subscription_id = ?`,
          [subscription.id]
        );

        // Create payment history record
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
                invoice.amount_due / 100,
                invoice.currency,
                'payment_intent_failed',
                subscription.items.data[0]?.price.recurring?.interval || 'monthly',
                'card'
              ]
            );
            console.log(`✅ Payment history record created for payment intent failed: ${invoice.id}`);
          } catch (insertError) {
            if (insertError.code !== 'ER_DUP_ENTRY') {
              console.error('Error creating payment history for payment intent failed:', insertError);
            }
          }
        }

        console.log(`❌ Payment intent failed for user ${userId}`);
      }
    } catch (error) {
      console.error('❌ Error handling payment intent failed:', error.message);
    }
  }
};

// Handle payment intent succeeded
const handlePaymentIntentSucceeded = async (invoice) => {
  if (invoice.subscription && stripe) {
    try {
      const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
      const userId = subscription.metadata?.userId;

      if (userId) {
        console.log(`✅ Payment intent succeeded for user ${userId}, subscription ${subscription.id}`);

        // Get subscription details for comprehensive update
        const planType = subscription.items.data[0]?.price.recurring?.interval || 'monthly';
        const subscriptionMinutes = subscription.items.data[0]?.price.metadata?.minutes || 3000;
        const amount = subscription.items.data[0]?.price.unit_amount / 100; // Convert from cents

        // 1. Update subscription record with comprehensive data
        await pool.execute(
          `UPDATE subscriptions SET 
           status = 'active',
           plan = ?,
           type = ?,
           subscription_minutes = ?,
           used_minutes = 0,
           amount = ?,
           currency = ?,
           billing_interval = ?,
           current_period_start = ?,
           current_period_end = ?,
           updated_at = CURRENT_TIMESTAMP
           WHERE subscription_id = ?`,
          [
            planType,
            planType,
            subscriptionMinutes,
            amount,
            subscription.currency,
            planType,
            safeTimestampToDate(subscription.current_period_start),
            safeTimestampToDate(subscription.current_period_end),
            subscription.id
          ]
        );

        // 2. Update user subscription status
        await pool.execute(
          `UPDATE users SET 
           is_subscribed = 1,
           updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [userId]
        );

        // 3. Create comprehensive payment history record
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
                invoice.amount_paid / 100,
                invoice.currency,
                'payment_intent_succeeded',
                planType,
                'card'
              ]
            );
            console.log(`✅ Payment history record created for payment intent succeeded: ${invoice.id}`);
          } catch (insertError) {
            if (insertError.code !== 'ER_DUP_ENTRY') {
              console.error('Error creating payment history for payment intent succeeded:', insertError);
            }
          }
        }

        // 4. Log comprehensive success details
        console.log(`✅ Payment intent succeeded for user ${userId}:`);
        console.log(`   - Subscription: ${subscription.id}`);
        console.log(`   - Plan: ${planType}`);
        console.log(`   - Minutes: ${subscriptionMinutes}`);
        console.log(`   - Amount: ${subscription.currency} ${amount}`);
        console.log(`   - Period: ${safeTimestampToISO(subscription.current_period_start)} to ${safeTimestampToISO(subscription.current_period_end)}`);
        console.log(`   - Status: active`);
        console.log(`   - Minutes reset to 0`);

      } else {
        console.warn(`⚠️ No userId found in subscription metadata for subscription ${subscription.id}`);
      }
    } catch (error) {
      console.error('❌ Error handling payment intent succeeded:', error.message);
    }
  } else {
    console.log('ℹ️ Invoice has no subscription or Stripe not configured');
  }
};

// Handle customer updated
const handleCustomerUpdated = async (customer) => {
  try {
    console.log(`👤 Customer updated: ${customer.id}`);
    
    // Find user by Stripe customer ID
    const [users] = await pool.execute(
      'SELECT id FROM users WHERE stripe_cust_id = ?',
      [customer.id]
    );

    if (users.length > 0) {
      const userId = users[0].id;
      
      // Update user information if needed
      await pool.execute(
        `UPDATE users SET 
         email = ?,
         updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [customer.email, userId]
      );

      console.log(`✅ Customer information updated for user ${userId}`);
    }
  } catch (error) {
    console.error('❌ Error handling customer updated:', error.message);
  }
};

// Handle customer deleted
const handleCustomerDeleted = async (customer) => {
  try {
    console.log(`🗑️ Customer deleted: ${customer.id}`);
    
    // Find user by Stripe customer ID
    const [users] = await pool.execute(
      'SELECT id FROM users WHERE stripe_cust_id = ?',
      [customer.id]
    );

    if (users.length > 0) {
      const userId = users[0].id;
      
      // Update all subscriptions for this user to canceled
      await pool.execute(
        `UPDATE subscriptions SET 
         status = 'canceled',
         updated_at = CURRENT_TIMESTAMP
         WHERE user_id = ?`,
        [userId]
      );

      // Set user as unsubscribed
      await pool.execute(
        'UPDATE users SET is_subscribed = 0 WHERE id = ?',
        [userId]
      );

      console.log(`✅ Customer deletion processed for user ${userId}`);
    }
  } catch (error) {
    console.error('❌ Error handling customer deleted:', error.message);
  }
};

// Handle subscription deleted
const handleSubscriptionDeleted = async (subscription) => {
  const userId = subscription.metadata?.userId;

  if (!userId) {
    console.error('No userId in subscription metadata');
    return;
  }

  console.log(`🗑️ Processing subscription deletion for user ${userId}, subscription ${subscription.id}`);

  // Update existing subscription record to downgraded status
  await pool.execute(
    `UPDATE subscriptions SET 
     status = 'downgraded',
     cancel_date = CURRENT_TIMESTAMP,
     updated_at = CURRENT_TIMESTAMP
     WHERE subscription_id = ?`,
    [subscription.id]
  );

  // Update user subscription status
  await pool.execute(
    'UPDATE users SET is_subscribed = 0 WHERE id = ?',
    [userId]
  );

  // Create a new subscription record for free plan
  await pool.execute(
    `INSERT INTO subscriptions (
      user_id,
      subscription_id,
      plan,
      type,
      subscription_minutes,
      used_minutes,
      amount,
      currency,
      billing_interval,
      status,
      start_date,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [
      userId,
      `free_${Date.now()}`,
      'free',
      'free',
      30,
      0,
      0,
      'usd',
      'monthly',
      'active'
    ]
  );

  // Create payment history record for subscription deletion
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
        `deleted_${subscription.id}_${Date.now()}`,
        0,
        'usd',
        'subscription_deleted',
        'free',
        'webhook'
      ]
    );
    console.log(`✅ Payment history record created for subscription deletion`);
  } catch (insertError) {
    if (insertError.code !== 'ER_DUP_ENTRY') {
      console.error('Error creating payment history for subscription deletion:', insertError);
    }
  }

  console.log(`✅ Subscription deleted for user ${userId} - moved to free plan`);
};

// Handle subscription canceled
const handleSubscriptionCanceled = async (subscription) => {
  const userId = subscription.metadata?.userId;

  if (!userId) {
    console.error('No userId in subscription metadata');
    return;
  }

  console.log(`❌ Processing subscription cancellation for user ${userId}, subscription ${subscription.id}`);

  // Update existing subscription record to downgraded status
  await pool.execute(
    `UPDATE subscriptions SET 
     status = 'downgraded',
     cancel_date = CURRENT_TIMESTAMP,
     updated_at = CURRENT_TIMESTAMP
     WHERE subscription_id = ?`,
    [subscription.id]
  );

  // Update user subscription status to free
  await pool.execute(
    'UPDATE users SET is_subscribed = 0 WHERE id = ?',
    [userId]
  );

  // Create a new subscription record for free plan
  await pool.execute(
    `INSERT INTO subscriptions (
      user_id,
      subscription_id,
      plan,
      type,
      subscription_minutes,
      used_minutes,
      amount,
      currency,
      billing_interval,
      status,
      start_date,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [
      userId,
      `free_${Date.now()}`,
      'free',
      'free',
      30,
      0,
      0,
      'usd',
      'monthly',
      'active'
    ]
  );

  // Create payment history record for subscription cancellation
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
        `canceled_${subscription.id}_${Date.now()}`,
        0,
        'usd',
        'subscription_canceled',
        'free',
        'webhook'
      ]
    );
    console.log(`✅ Payment history record created for subscription cancellation`);
  } catch (insertError) {
    if (insertError.code !== 'ER_DUP_ENTRY') {
      console.error('Error creating payment history for subscription cancellation:', insertError);
    }
  }

  console.log(`✅ Subscription canceled for user ${userId} - moved to free plan`);
};

// Handle payment succeeded
const handlePaymentSucceeded = async (invoice) => {
  if (invoice.subscription && stripe) {
    try {
      const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
      const userId = subscription.metadata?.userId;

      if (userId) {
        console.log(`💰 Processing successful payment for user ${userId}, subscription ${subscription.id}`);

        // Get subscription details for comprehensive update
        const planType = subscription.items.data[0]?.price.recurring?.interval || 'monthly';
        const subscriptionMinutes = subscription.items.data[0]?.price.metadata?.minutes || 3000;
        const amount = subscription.items.data[0]?.price.unit_amount / 100; // Convert from cents

        // 1. Update subscription record with comprehensive data
        await pool.execute(
          `UPDATE subscriptions SET 
           status = 'active',
           plan = ?,
           type = ?,
           subscription_minutes = ?,
           used_minutes = 0,
           amount = ?,
           currency = ?,
           billing_interval = ?,
           current_period_start = ?,
           current_period_end = ?,
           updated_at = CURRENT_TIMESTAMP
           WHERE subscription_id = ?`,
          [
            planType,
            planType,
            subscriptionMinutes,
            amount,
            subscription.currency,
            planType,
            safeTimestampToDate(subscription.current_period_start),
            safeTimestampToDate(subscription.current_period_end),
            subscription.id
          ]
        );

        // 2. Update user subscription status
        await pool.execute(
          `UPDATE users SET 
           is_subscribed = 1,
           updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [userId]
        );

        // 3. Create comprehensive payment history record
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
                planType,
                'card'
              ]
            );
            console.log(`✅ Payment history record created for successful payment: ${invoice.id}`);
          } catch (insertError) {
            if (insertError.code !== 'ER_DUP_ENTRY') {
              console.error('Error creating payment history for successful payment:', insertError);
            }
          }
        }

        // 4. Log comprehensive success details
        console.log(`✅ Payment succeeded for user ${userId}:`);
        console.log(`   - Subscription: ${subscription.id}`);
        console.log(`   - Plan: ${planType}`);
        console.log(`   - Minutes: ${subscriptionMinutes}`);
        console.log(`   - Amount: ${subscription.currency} ${amount}`);
        console.log(`   - Period: ${safeTimestampToISO(subscription.current_period_start)} to ${safeTimestampToISO(subscription.current_period_end)}`);
        console.log(`   - Status: active`);
        console.log(`   - Minutes reset to 0`);

      } else {
        console.warn(`⚠️ No userId found in subscription metadata for subscription ${subscription.id}`);
      }
    } catch (error) {
      console.error('❌ Error handling payment succeeded:', error.message);
    }
  } else {
    console.log('ℹ️ Invoice has no subscription or Stripe not configured');
  }
};

// Handle payment failed
const handlePaymentFailed = async (invoice) => {
  if (invoice.subscription && stripe) {
    try {
      const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
      const userId = subscription.metadata?.userId;

      if (userId) {
        console.log(`❌ Processing failed payment for user ${userId}, subscription ${subscription.id}`);

        // Update subscription status to past_due
        await pool.execute(
          `UPDATE subscriptions SET 
           status = 'past_due',
           updated_at = CURRENT_TIMESTAMP
           WHERE subscription_id = ?`,
          [subscription.id]
        );

        // Update user subscription status (keep subscribed but mark as past due)
        await pool.execute(
          'UPDATE users SET is_subscribed = 1 WHERE id = ?',
          [userId]
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
                subscription.items.data[0]?.price.recurring?.interval || 'monthly',
                'card'
              ]
            );
            console.log(`✅ Payment history record created for failed payment: ${invoice.id}`);
          } catch (insertError) {
            if (insertError.code !== 'ER_DUP_ENTRY') {
              console.error('Error creating payment history for failed payment:', insertError);
            }
          }
        }

        console.log(`❌ Payment failed for user ${userId}, subscription marked as past_due`);
      } else {
        console.warn(`⚠️ No userId found in subscription metadata for subscription ${subscription.id}`);
      }
    } catch (error) {
      console.error('❌ Error handling payment failed:', error.message);
    }
  } else {
    console.log('ℹ️ Invoice has no subscription or Stripe not configured');
  }
};

// @desc    Test webhook endpoint
// @route   GET /api/stripe/webhook-test
// @access  Public
const testWebhook = async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Webhook endpoint is working',
      timestamp: new Date().toISOString(),
      stripeConfigured: !!stripe,
      webhookSecretConfigured: !!process.env.STRIPE_WEBHOOK_SECRET
    });
  } catch (error) {
    console.error('Webhook test error:', error);
    res.status(500).json({
      success: false,
      message: 'Webhook test failed'
    });
  }
};

// @desc    Get webhook configuration info
// @route   GET /api/stripe/webhook-info
// @access  Public
const getWebhookInfo = async (req, res) => {
  try {
    const webhookEvents = [
      // Checkout Events
      'checkout.session.completed',
      'checkout.session.expired',
      
      // Subscription Lifecycle Events
      'customer.subscription.created',
      'customer.subscription.updated',
      'customer.subscription.deleted',
      'customer.subscription.canceled',
      'customer.subscription.trial_will_end',
      'customer.subscription.paused',
      'customer.subscription.resumed',
      
      // Payment Events
      'invoice.payment_succeeded',
      'invoice.payment_failed',
      'invoice.payment_action_required',
      'invoice.payment_requires_payment_method',
      'invoice.finalized',
      'invoice.payment_intent_payment_failed',
      'invoice.payment_intent_succeeded',
      
      // Customer Events
      'customer.updated',
      'customer.deleted'
    ];

    res.json({
      success: true,
      data: {
        webhookUrl: `${process.env.APP_URL || 'http://localhost:5000'}/api/stripe/webhook`,
        events: webhookEvents,
        stripeConfigured: !!stripe,
        webhookSecretConfigured: !!process.env.STRIPE_WEBHOOK_SECRET,
        environment: process.env.NODE_ENV || 'development'
      }
    });
  } catch (error) {
    console.error('Webhook info error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get webhook info'
    });
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
  try {
    const userId = req.user.id;

    console.log(`🔄 Canceling subscription for user ${userId} at period end`);

    // Get user's active subscription
    const [subscriptions] = await pool.execute(
      'SELECT subscription_id, status FROM subscriptions WHERE user_id = ? AND status IN ("active", "trialing")',
      [userId]
    );

    if (subscriptions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No active subscription found'
      });
    }

    const subscription = subscriptions[0];
    const subscriptionId = subscription.subscription_id;

    console.log(`📋 Found subscription: ${subscriptionId}, status: ${subscription.status}`);
    console.log(`🔍 Subscription ID type: ${typeof subscriptionId}`);
    console.log(`🔍 Subscription ID length: ${subscriptionId ? subscriptionId.length : 'N/A'}`);
    console.log(`🔍 Is subscription ID valid: ${subscriptionId && subscriptionId.startsWith('sub_')}`);

    // Check if subscription_id is null, undefined, or invalid
    if (!subscriptionId || subscriptionId === 'null' || subscriptionId === 'undefined' || subscriptionId.trim() === '') {
      console.warn('⚠️ No Stripe subscription ID found, updating local database only');
      
      // Update local database - set status to 'canceling' to indicate scheduled cancellation
      await pool.execute(
        `UPDATE subscriptions SET 
         status = 'canceling',
         cancel_date = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
         WHERE user_id = ? AND status IN ("active", "trialing")`,
        [userId]
      );

      // Create payment history record for cancellation
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
            'local_cancellation',
            0,
            'usd',
            'canceled_end_period',
            'subscription',
            'local'
          ]
        );
        console.log(`✅ Payment history record created for local cancellation`);
      } catch (historyError) {
        console.warn('⚠️ Failed to create payment history record:', historyError.message);
      }

      return res.json({
        success: true,
        message: 'Subscription will be canceled at the end of the current billing period (local update only - no Stripe subscription)'
      });
    }

    // Check if Stripe is initialized
    if (!stripe) {
      console.warn('⚠️ Stripe not configured, updating local database only');
      
      // Update local database - set status to 'canceling' to indicate scheduled cancellation
      await pool.execute(
        `UPDATE subscriptions SET 
         status = 'canceling',
         cancel_date = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
         WHERE subscription_id = ?`,
        [subscriptionId]
      );

      return res.json({
        success: true,
        message: 'Subscription will be canceled at the end of the current billing period (local update only)'
      });
    }

    // First, verify the subscription exists in Stripe
    console.log(`🔍 Verifying subscription exists in Stripe: ${subscriptionId}`);
    try {
      const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
      console.log(`✅ Subscription found in Stripe: ${stripeSubscription.id}`);
      console.log(`📊 Current Stripe status: ${stripeSubscription.status}`);
      console.log(`📊 Current cancel_at_period_end: ${stripeSubscription.cancel_at_period_end}`);
    } catch (verifyError) {
      console.error('❌ Subscription not found in Stripe:', verifyError.message);
      console.error('❌ This subscription ID may be invalid or deleted');
      
      // Update local database to reflect the invalid subscription
      await pool.execute(
        `UPDATE subscriptions SET 
         status = 'canceled',
         cancel_date = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
         WHERE subscription_id = ?`,
        [subscriptionId]
      );

      return res.json({
        success: true,
        message: 'Subscription marked as canceled (subscription not found in Stripe)'
      });
    }

    // Cancel subscription in Stripe - only end-of-period cancellation
    console.log(`🔄 Attempting to cancel Stripe subscription: ${subscriptionId}`);
    try {
      const result = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true
      });
      console.log(`✅ Stripe subscription ${subscriptionId} scheduled for cancellation at period end`);
      console.log(`📊 Stripe response status: ${result.status}`);
      console.log(`📊 Stripe cancel_at_period_end: ${result.cancel_at_period_end}`);
      console.log(`📊 Stripe current_period_end: ${safeTimestampToISO(result.current_period_end)}`);
    } catch (stripeError) {
      console.error('❌ Stripe cancellation failed:', stripeError.message);
      console.error('❌ Stripe error type:', stripeError.type);
      console.error('❌ Stripe error code:', stripeError.code);
      console.error('❌ Stripe error param:', stripeError.param);
      
      // If Stripe fails, still update local database
      await pool.execute(
        `UPDATE subscriptions SET 
         status = 'canceling',
         cancel_date = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
         WHERE subscription_id = ?`,
        [subscriptionId]
      );

      return res.json({
        success: true,
        message: 'Subscription will be canceled at the end of the current billing period (local update only - Stripe update failed)'
      });
    }

    // Update local database - set status to 'canceling' and add cancel_date
    await pool.execute(
      `UPDATE subscriptions SET 
       status = 'canceling',
       cancel_date = CURRENT_TIMESTAMP,
       updated_at = CURRENT_TIMESTAMP
       WHERE subscription_id = ?`,
      [subscriptionId]
    );

    // Create payment history record for cancellation
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
          subscriptionId,
          0,
          'usd',
          'canceled_end_period',
          'subscription',
          'webhook'
        ]
      );
      console.log(`✅ Payment history record created for subscription cancellation`);
    } catch (historyError) {
      console.warn('⚠️ Failed to create payment history record:', historyError.message);
    }

    res.json({
      success: true,
      message: 'Subscription will be canceled at the end of the current billing period',
      cancellationType: 'end_of_period',
      subscriptionId: subscriptionId
    });

  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel subscription: ' + error.message
    });
  }
};

// @desc    Reactivate subscription (remove cancellation)
// @route   POST /api/stripe/reactivate-subscription
// @access  Private
const reactivateSubscription = async (req, res) => {
  try {
    const userId = req.user.id;

    console.log(`🔄 Reactivating subscription for user ${userId}`);

    // Get user's canceling subscription
    const [subscriptions] = await pool.execute(
      'SELECT subscription_id, status FROM subscriptions WHERE user_id = ? AND status = "canceling"',
      [userId]
    );

    if (subscriptions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No canceling subscription found'
      });
    }

    const subscription = subscriptions[0];
    const subscriptionId = subscription.subscription_id;

    console.log(`📋 Found canceling subscription: ${subscriptionId}`);

    // Check if subscription_id is null (free plan or test subscription)
    if (!subscriptionId) {
      console.warn('⚠️ No Stripe subscription ID found, updating local database only');
      
      // Update local database - reactivate subscription
      await pool.execute(
        `UPDATE subscriptions SET 
         status = 'active',
         cancel_date = NULL,
         updated_at = CURRENT_TIMESTAMP
         WHERE user_id = ? AND status = "canceling"`,
        [userId]
      );

      // Create payment history record for reactivation
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
            'local_reactivation',
            0,
            'usd',
            'reactivated',
            'subscription',
            'local'
          ]
        );
        console.log(`✅ Payment history record created for local reactivation`);
      } catch (historyError) {
        console.warn('⚠️ Failed to create payment history record:', historyError.message);
      }

      return res.json({
        success: true,
        message: 'Subscription reactivated successfully (local update only - no Stripe subscription)'
      });
    }

    // Check if Stripe is initialized
    if (!stripe) {
      console.warn('⚠️ Stripe not configured, updating local database only');
      
      // Update local database - reactivate subscription
      await pool.execute(
        `UPDATE subscriptions SET 
         status = 'active',
         cancel_date = NULL,
         updated_at = CURRENT_TIMESTAMP
         WHERE subscription_id = ?`,
        [subscriptionId]
      );

      return res.json({
        success: true,
        message: 'Subscription reactivated successfully (local update only)'
      });
    }

    // Reactivate subscription in Stripe
    try {
      await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: false
      });
      console.log(`✅ Stripe subscription ${subscriptionId} reactivated successfully`);
    } catch (stripeError) {
      console.error('❌ Stripe reactivation failed:', stripeError.message);
      
      // If Stripe fails, still update local database
      await pool.execute(
        `UPDATE subscriptions SET 
         status = 'active',
         cancel_date = NULL,
         updated_at = CURRENT_TIMESTAMP
         WHERE subscription_id = ?`,
        [subscriptionId]
      );

      return res.json({
        success: true,
        message: 'Subscription reactivated successfully (local update only - Stripe update failed)'
      });
    }

    // Update local database - reactivate subscription
    await pool.execute(
      `UPDATE subscriptions SET 
       status = 'active',
       cancel_date = NULL,
       updated_at = CURRENT_TIMESTAMP
       WHERE subscription_id = ?`,
      [subscriptionId]
    );

    // Create payment history record for reactivation
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
          subscriptionId,
          0,
          'usd',
          'reactivated',
          'subscription',
          'webhook'
        ]
      );
      console.log(`✅ Payment history record created for reactivation: ${subscriptionId}`);
    } catch (insertError) {
      if (insertError.code !== 'ER_DUP_ENTRY') {
        console.error('Error creating payment history for reactivation:', insertError);
      }
    }

    console.log(`✅ Subscription reactivation completed for user ${userId}`);

    res.json({
      success: true,
      message: 'Subscription reactivated successfully',
      data: {
        subscription_id: subscriptionId,
        status: 'active',
        reactivated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error reactivating subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Error reactivating subscription'
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
         ph.*, s.type as subscription_plan
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
         ph.*, s.type as subscription_plan
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

      // 3. Handle subscription record creation/upgrade
      const [existingSubscriptions] = await pool.execute(
        'SELECT id, status, plan FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
        [userId]
      );

      const subscriptionMinutes = process.env.PRO_MONTHLY_MINUTES || 3000;
      
      if (existingSubscriptions.length === 0) {
        // No existing subscription - create new one
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
            safeSessionTimestampToDate(session.created),
            safeSessionTimestampToDate(session.created + 30 * 24 * 60 * 60) // 30 days from creation
          ]
        );
        console.log(`✅ New subscription record created for user ${userId}`);
      } else {
        const existingSubscription = existingSubscriptions[0];
        
        if (existingSubscription.plan === 'free') {
          // Free plan user upgrading - update existing to 'upgrade' status and create new active subscription
          await pool.execute(
            `UPDATE subscriptions SET 
             status = 'upgrade',
             updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [existingSubscription.id]
          );
          
          // Create new active subscription
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
              safeSessionTimestampToDate(session.created),
              safeSessionTimestampToDate(session.created + 30 * 24 * 60 * 60) // 30 days from creation
            ]
          );
          console.log(`🔄 Free plan user ${userId} upgraded - old subscription marked as 'upgrade', new active subscription created`);
        } else {
          // Already subscribed user - update existing subscription
          await pool.execute(
            `UPDATE subscriptions SET 
             status = 'active',
             plan = ?,
             subscription_minutes = ?,
             amount = ?,
             currency = ?,
             current_period_start = ?,
             current_period_end = ?,
             updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [
              session.metadata?.planType || 'monthly',
              subscriptionMinutes,
              session.amount_total / 100,
              session.currency,
              safeSessionTimestampToDate(session.created),
              safeSessionTimestampToDate(session.created + 30 * 24 * 60 * 60),
              existingSubscription.id
            ]
          );
          console.log(`✅ Existing subscription updated for user ${userId}`);
        }
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
          createdAt: safeSessionTimestampToDate(session.created)
        },
        subscription: subscription ? {
          id: subscription.id,
          status: subscription.status,
          currentPeriodStart: safeTimestampToDate(subscription.current_period_start),
          currentPeriodEnd: safeTimestampToDate(subscription.current_period_end),
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
  cancelSubscription,
  reactivateSubscription,
  testWebhook,
  getWebhookInfo
}; 