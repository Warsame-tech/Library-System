const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const TEST_DB_NAME = process.env.DB_NAME;

// أمان إضافي: لا تُنفَّذ أي عملية هدّامة إلا على قاعدة بيانات تحمل بوضوح لاحقة "_test"
if (!TEST_DB_NAME || !TEST_DB_NAME.endsWith('_test')) {
  throw new Error(`رفض تشغيل الاختبارات: DB_NAME (${TEST_DB_NAME}) لا ينتهي بـ "_test"`);
}

async function resetTestDb() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });

  const schemaSql = fs
    .readFileSync(path.join(__dirname, '..', '..', 'db', 'schema.sql'), 'utf8')
    .replace(/library_management(?!_test)/g, TEST_DB_NAME);

  await connection.query(`DROP DATABASE IF EXISTS \`${TEST_DB_NAME}\`;`);
  await connection.query(schemaSql);
  await connection.end();

  // إنشاء حساب مدير اختباري ثابت
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: TEST_DB_NAME,
  });

  const hash = await bcrypt.hash(process.env.DEFAULT_ADMIN_PASSWORD, 4);
  await pool.query('INSERT INTO users (username, password_hash, full_name) VALUES (?, ?, ?)', [
    process.env.DEFAULT_ADMIN_USERNAME,
    hash,
    'مدير الاختبار',
  ]);

  await pool.end();
}

async function dropTestDb() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  });
  await connection.query(`DROP DATABASE IF EXISTS \`${TEST_DB_NAME}\`;`);
  await connection.end();
}

module.exports = { resetTestDb, dropTestDb, TEST_DB_NAME };
