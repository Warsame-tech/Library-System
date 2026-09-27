// إنشاء حساب المدير الافتراضي (Default admin account seeder)
require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../config/db');

async function seed() {
  const username = process.env.DEFAULT_ADMIN_USERNAME || 'admin';
  const password = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';

  const [rows] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
  if (rows.length > 0) {
    console.log(`المستخدم "${username}" موجود بالفعل.`);
    process.exit(0);
  }

  const hash = await bcrypt.hash(password, 10);
  await pool.query(
    'INSERT INTO users (username, password_hash, full_name) VALUES (?, ?, ?)',
    [username, hash, 'مدير النظام']
  );

  console.log(`تم إنشاء حساب المدير بنجاح:`);
  console.log(`اسم المستخدم: ${username}`);
  console.log(`كلمة المرور: ${password}`);
  process.exit(0);
}

seed().catch((err) => {
  console.error('فشل إنشاء حساب المدير:', err);
  process.exit(1);
});
