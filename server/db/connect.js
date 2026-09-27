// اتصال أدوات النسخ الاحتياطي/الاستعادة بقاعدة البيانات
// --url=mysql://user:password@host:port/database  (مثلاً رابط MYSQL_PUBLIC_URL من Railway)
// بدون --url تُستخدم إعدادات DB_* من ملف server/.env
const mysql = require('mysql2');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

function connectionOptions(argv) {
  const urlArg = argv.find((a) => a.startsWith('--url='));
  const common = { charset: 'utf8mb4_unicode_ci', dateStrings: true, supportBigNumbers: true, bigNumberStrings: true };
  if (urlArg) return { uri: urlArg.slice('--url='.length), ...common };

  const env = process.env;
  return {
    host: env.DB_HOST || 'localhost',
    port: Number(env.DB_PORT) || 3306,
    user: env.DB_USER || 'root',
    password: env.DB_PASSWORD || '',
    database: env.DB_NAME || 'library_management',
    ssl: env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    ...common,
  };
}

function connect(argv) {
  const conn = mysql.createConnection(connectionOptions(argv));
  return { conn, promise: conn.promise() };
}

module.exports = { connect };
