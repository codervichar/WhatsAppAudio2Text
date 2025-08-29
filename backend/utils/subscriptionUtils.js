const { pool } = require('../config/database');

// Function to deduct minutes from user subscription
const deductMinutesFromSubscription = async (userId, durationInSeconds) => {
  try {
    console.log(`🔢 Deducting ${durationInSeconds} seconds (${(durationInSeconds / 60).toFixed(2)} minutes) from user ${userId}`);
    
    // Get user's current subscription
    const [subscriptions] = await pool.execute(
      `SELECT s.id, s.subscription_minutes, s.used_minutes, s.status, s.plan
       FROM subscriptions s
       WHERE s.user_id = ? AND s.status IN ('active', 'canceling')
       ORDER BY 
         CASE WHEN s.plan != 'free' THEN 1 ELSE 2 END,
         s.created_at DESC
       LIMIT 1`,
      [userId]
    );

    if (subscriptions.length === 0) {
      console.log('⚠️ No active subscription found for user, checking free plan limits');
      
      // Check free plan limits (30 minutes)
      const [users] = await pool.execute(
        'SELECT total_minutes, used_minutes FROM users WHERE id = ?',
        [userId]
      );
      
      if (users.length === 0) {
        console.error('❌ User not found');
        return { success: false, message: 'User not found' };
      }
      
      const user = users[0];
      const totalMinutes = user.total_minutes || 30; // Default 30 minutes for free plan
      const usedMinutes = user.used_minutes || 0;
      const durationInMinutes = durationInSeconds / 60;
      const newUsedMinutes = usedMinutes + durationInMinutes;
      
      if (newUsedMinutes > totalMinutes) {
        console.log(`❌ Insufficient minutes: ${newUsedMinutes.toFixed(2)} > ${totalMinutes}`);
        return { 
          success: false, 
          message: 'Insufficient minutes remaining',
          remaining: Math.max(totalMinutes - usedMinutes, 0)
        };
      }
      
      // Update user's used minutes
      await pool.execute(
        'UPDATE users SET used_minutes = ? WHERE id = ?',
        [newUsedMinutes, userId]
      );
      
      console.log(`✅ Free plan: Updated used minutes to ${newUsedMinutes.toFixed(2)}`);
      return { 
        success: true, 
        message: 'Minutes deducted from free plan',
        deducted: durationInMinutes,
        remaining: Math.max(totalMinutes - newUsedMinutes, 0)
      };
    }
    
    const subscription = subscriptions[0];
    const durationInMinutes = durationInSeconds / 60;
    const newUsedMinutes = subscription.used_minutes + durationInMinutes;
    
    // Check if user has enough minutes
    if (newUsedMinutes > subscription.subscription_minutes) {
      console.log(`❌ Insufficient subscription minutes: ${newUsedMinutes.toFixed(2)} > ${subscription.subscription_minutes}`);
      return { 
        success: false, 
        message: 'Insufficient subscription minutes remaining',
        remaining: Math.max(subscription.subscription_minutes - subscription.used_minutes, 0)
      };
    }
    
    // Update subscription's used minutes
    await pool.execute(
      'UPDATE subscriptions SET used_minutes = ? WHERE id = ?',
      [newUsedMinutes, subscription.id]
    );
    
    console.log(`✅ Subscription: Updated used minutes to ${newUsedMinutes.toFixed(2)}`);
    return { 
      success: true, 
      message: 'Minutes deducted from subscription',
      deducted: durationInMinutes,
      remaining: Math.max(subscription.subscription_minutes - newUsedMinutes, 0)
    };
    
  } catch (error) {
    console.error('❌ Error deducting minutes:', error);
    return { success: false, message: 'Error deducting minutes' };
  }
};

// Function to check if user has sufficient minutes before transcription
const checkUserMinutes = async (userId, durationInSeconds) => {
  try {
    console.log(`🔍 Checking minutes for user ${userId} (${durationInSeconds} seconds)`);
    
    // Get user's current subscription
    const [subscriptions] = await pool.execute(
      `SELECT s.id, s.subscription_minutes, s.used_minutes, s.status, s.plan
       FROM subscriptions s
       WHERE s.user_id = ? AND s.status IN ('active', 'canceling')
       ORDER BY 
         CASE WHEN s.plan != 'free' THEN 1 ELSE 2 END,
         s.created_at DESC
       LIMIT 1`,
      [userId]
    );

    if (subscriptions.length === 0) {
      console.log('⚠️ No active subscription found for user, checking free plan limits');
      
      // Check free plan limits (30 minutes)
      const [users] = await pool.execute(
        'SELECT total_minutes, used_minutes FROM users WHERE id = ?',
        [userId]
      );
      
      if (users.length === 0) {
        console.error('❌ User not found');
        return { success: false, message: 'User not found' };
      }
      
      const user = users[0];
      const totalMinutes = user.total_minutes || 30; // Default 30 minutes for free plan
      const usedMinutes = user.used_minutes || 0;
      const durationInMinutes = durationInSeconds / 60;
      const newUsedMinutes = usedMinutes + durationInMinutes;
      
      if (newUsedMinutes > totalMinutes) {
        console.log(`❌ Insufficient minutes: ${newUsedMinutes.toFixed(2)} > ${totalMinutes}`);
        return { 
          success: false, 
          message: 'Insufficient minutes remaining',
          remaining: Math.max(totalMinutes - usedMinutes, 0),
          required: durationInMinutes
        };
      }
      
      return { 
        success: true, 
        message: 'Sufficient minutes available',
        remaining: Math.max(totalMinutes - usedMinutes, 0),
        required: durationInMinutes
      };
    }
    
    const subscription = subscriptions[0];
    const durationInMinutes = durationInSeconds / 60;
    const newUsedMinutes = subscription.used_minutes + durationInMinutes;
    
    // Check if user has enough minutes
    if (newUsedMinutes > subscription.subscription_minutes) {
      console.log(`❌ Insufficient subscription minutes: ${newUsedMinutes.toFixed(2)} > ${subscription.subscription_minutes}`);
      return { 
        success: false, 
        message: 'Insufficient subscription minutes remaining',
        remaining: Math.max(subscription.subscription_minutes - subscription.used_minutes, 0),
        required: durationInMinutes
      };
    }
    
    return { 
      success: true, 
      message: 'Sufficient subscription minutes available',
      remaining: Math.max(subscription.subscription_minutes - subscription.used_minutes, 0),
      required: durationInMinutes
    };
    
  } catch (error) {
    console.error('❌ Error checking minutes:', error);
    return { success: false, message: 'Error checking minutes' };
  }
};

module.exports = {
  deductMinutesFromSubscription,
  checkUserMinutes
};
