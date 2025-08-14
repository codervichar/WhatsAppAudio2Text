const { pool } = require('../config/database');

async function checkCountries() {
  try {
    console.log('🔍 Checking country data...');
    
    // Check the first 5 countries
    const [rows] = await pool.execute('SELECT id, iso, nicename, phonecode FROM country LIMIT 5');
    console.log('First 5 countries:');
    console.table(rows);
    
    // Check if nicename is empty
    const [emptyNicename] = await pool.execute('SELECT COUNT(*) as count FROM country WHERE nicename = "" OR nicename IS NULL');
    console.log(`Countries with empty nicename: ${emptyNicename[0].count}`);
    
    // Check total count
    const [total] = await pool.execute('SELECT COUNT(*) as count FROM country');
    console.log(`Total countries: ${total[0].count}`);
    
  } catch (error) {
    console.error('❌ Error checking countries:', error.message);
  } finally {
    await pool.end();
  }
}

checkCountries().catch(console.error);
