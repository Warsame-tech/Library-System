const mysql = require('mysql2/promise');
require('dotenv').config();

// DB_* تأخذ الأولوية، ثم متغيرات Railway (MYSQLHOST, ...) التي تضيفها خدمة MySQL تلقائياً
const env = process.env;

const pool = mysql.createPool({
  host: env.DB_HOST || env.MYSQLHOST || 'localhost',
  port: Number(env.DB_PORT || env.MYSQLPORT) || 3306,
  user: env.DB_USER || env.MYSQLUSER || 'root',
  password: env.DB_PASSWORD || env.MYSQLPASSWORD || '',
  database: env.DB_NAME || env.MYSQLDATABASE || 'library_management',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4_unicode_ci',
  // Managed MySQL providers (Aiven, Railway, TiDB Cloud, ...) require TLS.
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

module.exports = pool;
