const Stripe = require('stripe');
const { pool } = require('../config/database');

const stripe = new Stripe(process.env.STRIPE_SECRET);

// @desc    Create checkout session
// @route   POST /api/stripe/create-checkout-session
// @access  Private
const createCheckoutSession = async (req, res) => {
  const { priceId, planType } = req.body;
  try {

    const userId = req.user.id;

    if (!priceId) {
      return res.status(400).json({
        success: false,
        message: 'Price ID is required'
      });
    }

    // Get user details
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

    const user = users[0];

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: user.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/subscription/cancel`,
      metadata: {
        userId: userId.toString(),
        planType: planType || 'monthly'
      },
      subscription_data: {
        metadata: {
          userId: userId.toString(),
          planType: planType || 'monthly'
        }
      }
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
    res.status(500).json({
      success: false,
      message: 'Failed to create checkout session',
      details: error.message
    });
  }
};

// @desc    Handle Stripe webhook
// @route   POST /api/stripe/webhook
// @access  Public
const handleWebhook = async (req, res) => {
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

  // Update user subscription status
  await pool.execute(
    `UPDATE users SET 
     is_subscribed = true,
     updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [userId]
  );

  console.log(`User ${userId} completed checkout for ${planType} plan`);
};

// Handle subscription created
const handleSubscriptionCreated = async (subscription) => {
  const userId = subscription.metadata?.userId;
  const planType = subscription.metadata?.planType;

  if (!userId) {
    console.error('No userId in subscription metadata');
    return;
  }

  // Get subscription minutes from environment variable
  const subscriptionMinutes = process.env.PRO_MONTHLY_MINUTES || 3000;

  // Insert subscription record
  await pool.execute(
    `INSERT INTO subscriptions (
      user_id, 
      stripe_subscription_id, 
      plan, 
      type, 
      status, 
      subscription_minutes,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [
      userId,
      subscription.id,
      planType,
      'monthly',
      subscription.status,
      subscriptionMinutes
    ]
  );

  console.log(`Subscription created for user ${userId}: ${subscription.id}`);
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
     WHERE stripe_subscription_id = ?`,
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
     WHERE stripe_subscription_id = ?`,
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
  if (invoice.subscription) {
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
    const userId = subscription.metadata?.userId;

    if (userId) {
      // Reset used minutes for new billing cycle
      await pool.execute(
        'UPDATE subscriptions SET used_minutes = 0 WHERE stripe_subscription_id = ?',
        [subscription.id]
      );

      console.log(`Payment succeeded for user ${userId}, resetting minutes`);
    }
  }
};

// Handle payment failed
const handlePaymentFailed = async (invoice) => {
  if (invoice.subscription) {
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
    const userId = subscription.metadata?.userId;

    if (userId) {
      // Update subscription status
      await pool.execute(
        `UPDATE subscriptions SET 
         status = 'past_due',
         updated_at = CURRENT_TIMESTAMP
         WHERE stripe_subscription_id = ?`,
        [subscription.id]
      );

      console.log(`Payment failed for user ${userId}`);
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
         s.id, s.stripe_subscription_id, s.plan, s.type, s.status,
         s.subscription_minutes, s.used_minutes,
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
          stripeSubscriptionId: subscription.stripe_subscription_id,
          plan: subscription.plan,
          type: subscription.type,
          status: subscription.status,
          subscriptionMinutes: subscription.subscription_minutes,
          usedMinutes: subscription.used_minutes,
          minutesLeft: minutesLeft,
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

    // Get user's active subscription
    const [subscriptions] = await pool.execute(
      'SELECT stripe_subscription_id FROM subscriptions WHERE user_id = ? AND status = "active"',
      [userId]
    );

    if (subscriptions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No active subscription found'
      });
    }

    const subscriptionId = subscriptions[0].stripe_subscription_id;

    // Cancel subscription in Stripe
    await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true
    });

    // Update local database
    await pool.execute(
      `UPDATE subscriptions SET 
       status = 'canceled',
       updated_at = CURRENT_TIMESTAMP
       WHERE stripe_subscription_id = ?`,
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

module.exports = {
  createCheckoutSession,
  handleWebhook,
  getSubscriptionStatus,
  cancelSubscription
}; 