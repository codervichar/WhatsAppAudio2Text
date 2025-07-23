const { pool } = require('../config/database');

const Language = {
  async getAll() {
    const [rows] = await pool.execute('SELECT id, code, language as label FROM language_codes ORDER BY language ASC');
    return rows;
  },
};

module.exports = Language; 