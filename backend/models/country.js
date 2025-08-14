const { pool } = require('../config/database');

const Country = {
  async getAll() {
    const [rows] = await pool.execute('SELECT id, iso as code, nicename as label, phonecode, iso FROM country ORDER BY nicename ASC');
    return rows;
  },
};

module.exports = Country; 