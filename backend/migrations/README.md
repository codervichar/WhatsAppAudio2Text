# Database Migrations

This directory contains database migration files for the WhatsApp Audio2Text application.

## Available Migrations

### 1. Country Table Migration (`country_table.sql`)

This migration creates the `country` table with a comprehensive list of countries and their phone codes.

**What it does:**
- Creates the `country` table with columns: `id`, `iso`, `name`, `phonecode`, `created_at`, `updated_at`
- Inserts 195+ countries with their ISO codes, names, and phone codes
- Sets up proper indexing and constraints

**Why it's needed:**
The country dropdown in the signup and dashboard forms was showing "No countries found" because the `country` table didn't exist in the database.

## Running Migrations

### Option 1: Using the Migration Script (Recommended)

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Run the migration script:
   ```bash
   node scripts/run-migration.js
   ```

3. The script will:
   - Execute the SQL migration
   - Verify the table was created
   - Show the total number of countries inserted

### Option 2: Manual SQL Execution

1. Connect to your MySQL database
2. Run the SQL commands from `country_table.sql`:
   ```sql
   -- Copy and paste the contents of country_table.sql
   ```

## Verification

After running the migration, you can verify it worked by:

1. **Checking the API endpoint:**
   ```bash
   curl http://localhost:5000/api/users/countries
   ```

2. **Checking the database directly:**
   ```sql
   SELECT COUNT(*) FROM country;
   SELECT * FROM country LIMIT 5;
   ```

3. **Testing the frontend:**
   - Go to the signup page
   - Click on the country code dropdown
   - You should see a list of countries instead of "No countries found"

## Troubleshooting

### Common Issues

1. **Database connection error:**
   - Check your `.env` file has correct database credentials
   - Ensure the database server is running

2. **Permission denied:**
   - Make sure your database user has CREATE TABLE and INSERT permissions

3. **Table already exists:**
   - The migration uses `CREATE TABLE IF NOT EXISTS`, so it's safe to run multiple times

### Getting Help

If you encounter issues:
1. Check the console output for error messages
2. Verify your database connection settings
3. Ensure you have the necessary database permissions
