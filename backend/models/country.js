const { pool } = require('../config/database');

const Country = {
  async getAll() {
    const [rows] = await pool.execute('SELECT iso as code, name as label, phonecode FROM country ORDER BY name ASC');
    return rows;
  },
};

module.exports = Country; 