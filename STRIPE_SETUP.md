# Stripe Integration Setup Guide

This guide will help you set up Stripe payments for the WhatsApp2Text subscription system.

## Prerequisites

1. A Stripe account (sign up at https://stripe.com)
2. Node.js and npm installed
3. The backend server running

## Step 1: Stripe Account Setup

### 1.1 Create a Stripe Account
- Go to https://stripe.com and create an account
- Complete the account verification process
- Switch to test mode for development

### 1.2 Get Your API Keys
1. Go to the Stripe Dashboard
2. Navigate to Developers → API Keys
3. Copy your **Publishable Key** and **Secret Key**
4. Keep these keys secure and never commit them to version control

## Step 2: Create Products and Prices in Stripe

### 2.1 Create a Product
1. Go to Products in your Stripe Dashboard
2. Click "Add Product"
3. Fill in the details:
   - **Name**: WhatsApp2Text Monthly Plan
   - **Description**: 3000 minutes of audio transcription per month
   - **Images**: Add your logo (optional)

### 2.2 Create a Price
1. In the product page, click "Add Price"
2. Configure the price:
   - **Price**: $19.99
   - **Billing**: Recurring
   - **Billing period**: Monthly
   - **Currency**: USD
3. Save the price and copy the **Price ID** (starts with `price_`)

## Step 3: Configure Environment Variables

### 3.1 Backend Environment Variables
Create a `.env` file in the `backend` directory with the following variables:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
FRONTEND_URL=http://localhost:5173
```

### 3.2 Update Price ID in Frontend
In `src/pages/Pricing.tsx`, replace the placeholder price ID:

```typescript
priceId="price_your_actual_price_id_here" // Replace with your actual Stripe price ID
```

## Step 4: Set Up Webhooks

### 4.1 Create Webhook Endpoint
1. Go to Developers → Webhooks in Stripe Dashboard
2. Click "Add endpoint"
3. Set the endpoint URL: `https://your-domain.com/api/stripe/webhook`
4. For local development, use a tool like ngrok:
   ```bash
   ngrok http 5000
   ```
   Then use the ngrok URL: `https://your-ngrok-url.ngrok.io/api/stripe/webhook`

### 4.2 Select Events
Select these events for your webhook:
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

### 4.3 Get Webhook Secret
1. After creating the webhook, click on it
2. Go to "Signing secret"
3. Click "Reveal" and copy the webhook secret
4. Add it to your `.env` file as `STRIPE_WEBHOOK_SECRET`

## Step 5: Database Setup

### 5.1 Create Subscriptions Table
Run this SQL query in your database:

```sql
CREATE TABLE IF NOT EXISTS subscriptions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  stripe_subscription_id VARCHAR(255) NOT NULL,
  plan VARCHAR(50) NOT NULL,
  type VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  subscription_minutes INT DEFAULT 3000,
  used_minutes INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_stripe_subscription (stripe_subscription_id)
);
```

## Step 6: Test the Integration

### 6.1 Test Cards
Use these test card numbers in Stripe test mode:
- **Success**: 4242 4242 4242 4242
- **Decline**: 4000 0000 0000 0002
- **Requires Authentication**: 4000 0025 0000 3155

### 6.2 Test Flow
1. Start your backend server: `npm run backend:dev`
2. Start your frontend: `npm run frontend:dev`
3. Sign up/login to your application
4. Go to the Pricing page
5. Click "Subscribe Now" on the Monthly Plan
6. Complete the payment with a test card
7. Verify you're redirected to the success page

## Step 7: Production Deployment

### 7.1 Switch to Live Mode
1. In Stripe Dashboard, switch from "Test mode" to "Live mode"
2. Get your live API keys
3. Update your environment variables with live keys
4. Create live products and prices
5. Set up production webhooks

### 7.2 Security Considerations
- Never expose your secret key in frontend code
- Always use HTTPS in production
- Implement proper error handling
- Monitor webhook events in Stripe Dashboard
- Set up logging for payment events

## Troubleshooting

### Common Issues

1. **Webhook Signature Verification Failed**
   - Check that your webhook secret is correct
   - Ensure the webhook URL is accessible
   - Verify the webhook is receiving events

2. **Checkout Session Creation Fails**
   - Verify your Stripe secret key is correct
   - Check that the price ID exists in your Stripe account
   - Ensure the user is authenticated

3. **Subscription Not Created**
   - Check webhook logs in Stripe Dashboard
   - Verify database connection
   - Check server logs for errors

### Debug Mode
Enable debug logging by setting:
```env
NODE_ENV=development
```

## Support

For additional help:
- Stripe Documentation: https://stripe.com/docs
- Stripe Support: https://support.stripe.com
- Check the server logs for detailed error messages

## Security Notes

- Keep your Stripe keys secure
- Use environment variables for all sensitive data
- Implement proper authentication before allowing payments
- Monitor for suspicious activity
- Regularly update dependencies 