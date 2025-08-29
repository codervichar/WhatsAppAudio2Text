const fs = require('fs');
const path = require('path');

const envContent = `# Backend Environment Variables
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=whatsapp_audio2text

# JWT Configuration
JWT_SECRET=your_jwt_secret_here_change_this_in_production
JWT_REFRESH_SECRET=your_jwt_refresh_secret_here_change_this_in_production

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
# IMPORTANT: Replace these with your actual Stripe keys from your Stripe dashboard
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret_here

# Subscription Configuration
PRO_MONTHLY_MINUTES=3000
PRO_MONTHLY_AMOUNT=9.99
FREE_MONTHLY_MINUTES=60
`;

const envPath = path.join(__dirname, '.env');

try {
  if (!fs.existsSync(envPath)) {
    fs.writeFileSync(envPath, envContent);
    console.log('✅ .env file created successfully!');
    console.log('📝 Please update the following variables in backend/.env:');
    console.log('   - DB_PASSWORD: Your MySQL password');
    console.log('   - STRIPE_SECRET_KEY: Your Stripe secret key');
    console.log('   - STRIPE_WEBHOOK_SECRET: Your Stripe webhook secret');
    console.log('   - JWT_SECRET: A random string for JWT signing');
    console.log('   - JWT_REFRESH_SECRET: A random string for JWT refresh');
  } else {
    console.log('⚠️ .env file already exists');
  }
} catch (error) {
  console.error('❌ Error creating .env file:', error.message);
}
