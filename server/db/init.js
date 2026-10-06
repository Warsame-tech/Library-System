// تهيئة قاعدة البيانات عند تشغيل الخادم (Database bootstrap on startup)
// - ينشئ الجداول الناقصة من schema.sql (كل الجداول تستخدم IF NOT EXISTS فالتكرار آمن)
// - على قاعدة بيانات جديدة فقط: يستورد البيانات الأولية من data.sql
// - ينشئ حساب المدير إذا كان جدول المستخدمين فارغاً
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');

// أوامر CREATE DATABASE / USE تُتجاهل: قاعدة البيانات تأتي من الإعدادات
// (على Railway اسمها "railway" وليس library_management)
function schemaStatements() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  return sql
    .split(/;\s*(?:\r?\n|$)/)
    .map((stmt) => stmt.replace(/^\s*--.*$/gm, '').trim())
    .filter((stmt) => stmt && !/^(CREATE DATABASE|USE)\b/i.test(stmt));
}

// ترقيات البنية لقواعد البيانات الموجودة مسبقاً: CREATE TABLE IF NOT EXISTS لا يضيف أعمدة
// جديدة إلى جدول موجود، لذلك يُضاف كل عمود جديد هنا مرة واحدة فقط (إن لم يكن موجوداً)
const COLUMN_MIGRATIONS = [
  {
    table: 'books',
    column: 'book_type',
    sql: "ALTER TABLE books ADD COLUMN book_type ENUM('risala','mujallad') DEFAULT NULL AFTER art_id, ADD KEY idx_books_type (book_type)",
  },
];

async function runMigrations(db = pool) {
  for (const m of COLUMN_MIGRATIONS) {
    const [rows] = await db.query(
      'SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
      [m.table, m.column]
    );
    if (rows.length === 0) {
      await db.query(m.sql);
      console.log(`✅ تمت إضافة العمود ${m.table}.${m.column}`);
    }
  }
}

async function ensureAdmin() {
  const [[{ count }]] = await pool.query('SELECT COUNT(*) AS count FROM users');
  if (count > 0) return;

  const username = process.env.DEFAULT_ADMIN_USERNAME || 'admin';
  const password = process.env.DEFAULT_ADMIN_PASSWORD;
  if (!password && process.env.NODE_ENV === 'production') {
    console.warn('⚠️  لا يوجد أي مستخدم. عيّن DEFAULT_ADMIN_PASSWORD ثم أعد تشغيل الخادم لإنشاء حساب المدير.');
    return;
  }

  const hash = await bcrypt.hash(password || 'admin123', 10);
  await pool.query('INSERT INTO users (username, password_hash, full_name) VALUES (?, ?, ?)', [
    username,
    hash,
    'مدير النظام',
  ]);
  console.log(`✅ تم إنشاء حساب المدير "${username}"`);
}

// استيراد البيانات الأولية من data.sql (مُصدَّرة من XAMPP) مرة واحدة فقط:
// عند أول تشغيل على قاعدة بيانات جديدة. mysqldump --compact يضع كل INSERT في سطر واحد
async function importInitialData() {
  const file = path.join(__dirname, 'data.sql');
  if (!fs.existsSync(file)) return;
  const statements = fs
    .readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .filter((line) => /^INSERT INTO /i.test(line));

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (const stmt of statements) await conn.query(stmt.replace(/;\s*$/, ''));
    await conn.commit();
    console.log(`✅ تم استيراد البيانات الأولية (${statements.length} جداول)`);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function initDatabase() {
  const [existing] = await pool.query("SHOW TABLES LIKE 'books'");
  const isFreshDatabase = existing.length === 0;

  for (const stmt of schemaStatements()) {
    await pool.query(stmt);
  }
  await runMigrations();
  if (isFreshDatabase) await importInitialData();
  await ensureAdmin();
  console.log('✅ قاعدة البيانات جاهزة');
}

module.exports = { initDatabase, schemaStatements, runMigrations };
