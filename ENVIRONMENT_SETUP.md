# Environment Variables Setup Guide

This guide shows you how to set up all the environment variables needed for the WhatsApp2Text application with Stripe integration.

## Frontend Environment Variables (.env)

Create or update the `.env` file in the root directory:

```env
# API Configuration
API_URL="http://localhost:5000/api"

# Stripe Configuration
VITE_PRO_MONTHLY_MINUTES=3000
VITE_PRO_MONTHLY_AMOUNT=19.99
VITE_PRICE_ID=price_your_price_id_here
```

## Backend Environment Variables (backend/.env)

Create a `.env` file in the `backend` directory:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_actual_password
DB_NAME=whatsapp_audio2text

# JWT Configuration
JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_jwt_refresh_secret_here

# Server Configuration
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Email Configuration for Password Reset
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password_here

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret_here

# Subscription Configuration
PRO_MONTHLY_MINUTES=3000
PRO_MONTHLY_AMOUNT=19.99
```

## Variable Descriptions

### Frontend Variables (VITE_*)
- `VITE_PRO_MONTHLY_MINUTES`: Number of transcription minutes included in the monthly plan
- `VITE_PRO_MONTHLY_AMOUNT`: Monthly subscription price (without $ symbol)
- `VITE_PRICE_ID`: Stripe Price ID (starts with `price_`)

### Backend Variables
- `PRO_MONTHLY_MINUTES`: Same as frontend, used for database operations
- `PRO_MONTHLY_AMOUNT`: Same as frontend, used for validation

## How to Get Stripe IDs

### 1. Price ID
1. Go to Stripe Dashboard → Products
2. Create or select your product
3. Go to Pricing section
4. Create or select your price
5. Copy the Price ID (starts with `price_`)

### 3. Secret Key
1. Go to Stripe Dashboard → Developers → API Keys
2. Copy the Secret Key (starts with `sk_test_` for test mode)

### 4. Webhook Secret
1. Go to Stripe Dashboard → Developers → Webhooks
2. Create webhook endpoint: `https://your-domain.com/api/stripe/webhook`
3. Copy the signing secret (starts with `whsec_`)

## Stripe Webhook URL

### For Local Development:
```
https://your-ngrok-url.ngrok.io/api/stripe/webhook
```

### For Production:
```
https://your-domain.com/api/stripe/webhook
```

## Testing

After setting up the environment variables:

1. **Start the backend server**:
   ```bash
   cd backend && npm run dev
   ```

2. **Start the frontend**:
   ```bash
   npm run frontend:dev
   ```

3. **Test the subscription flow**:
   - Go to Pricing page
   - Click "Subscribe Now"
   - Use test card: `4242 4242 4242 4242`

## Security Notes

- Never commit `.env` files to version control
- Use different keys for test and production environments
- Keep your Stripe secret keys secure
- Use HTTPS in production

## Troubleshooting

If you encounter issues:

1. **Check environment variables are loaded**:
   - Frontend: Check browser console for VITE_* variables
   - Backend: Check server logs for environment variable errors

2. **Verify Stripe configuration**:
   - Ensure all Stripe IDs are correct
   - Check webhook endpoint is accessible
   - Verify webhook events are being received

3. **Database issues**:
   - Run the migration script: `source database_migration.sql`
   - Check database connection settings 