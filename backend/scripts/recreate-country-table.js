const { pool } = require('../config/database');
const fs = require('fs');
const path = require('path');

async function recreateCountryTable() {
  try {
    console.log('🔄 Recreating country table...');
    
    // Drop the existing table
    await pool.execute('DROP TABLE IF EXISTS country');
    console.log('✅ Dropped existing country table');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '../migrations/country_table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split the SQL into individual statements
    const statements = migrationSQL.split(';').filter(stmt => stmt.trim());
    
    // Execute each statement
    for (const statement of statements) {
      if (statement.trim()) {
        await pool.execute(statement);
        console.log('✅ Executed:', statement.substring(0, 50) + '...');
      }
    }
    
    console.log('✅ Country table recreated successfully!');
    
    // Verify the table was created
    const [rows] = await pool.execute('SELECT COUNT(*) as count FROM country');
    console.log(`📊 Total countries in database: ${rows[0].count}`);
    
    // Check for empty nicename
    const [emptyNicename] = await pool.execute('SELECT COUNT(*) as count FROM country WHERE nicename = "" OR nicename IS NULL');
    console.log(`Countries with empty nicename: ${emptyNicename[0].count}`);
    
  } catch (error) {
    console.error('❌ Recreation failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the recreation
recreateCountryTable().catch(console.error);
