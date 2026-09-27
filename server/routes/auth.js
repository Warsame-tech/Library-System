const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');
const { loginSchema } = require('../schemas/authSchema');
const { loginLimiter } = require('../middleware/rateLimiters');
const { logAudit, clientIp } = require('../utils/audit');

const router = express.Router();

const MAX_ATTEMPTS = Number(process.env.LOGIN_MAX_ATTEMPTS) || 5;
const LOCK_MINUTES = Number(process.env.LOGIN_LOCK_MINUTES) || 15;

// تسجيل الدخول
router.post('/login', loginLimiter, validate(loginSchema), async (req, res) => {
  try {
    const { username, password } = req.body;
    const ip = clientIp(req);

    const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    const user = rows[0];

    // رسالة موحّدة لعدم وجود المستخدم أو خطأ كلمة المرور، لمنع تخمين أسماء المستخدمين
    const invalidCredentialsResponse = () =>
      res.status(401).json({ message: 'اسم المستخدم أو كلمة المرور غير صحيحة' });

    if (!user) {
      logAudit({ username, action: 'login_failed', details: 'مستخدم غير موجود', ip });
      return invalidCredentialsResponse();
    }

    // حساب مقفل مؤقتاً بسبب محاولات فاشلة متكررة
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const minutesLeft = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
      logAudit({ userId: user.id, username, action: 'login_blocked', details: `الحساب مقفل، متبقي ${minutesLeft} دقيقة`, ip });
      return res.status(423).json({
        message: `الحساب مقفل مؤقتاً بسبب محاولات دخول فاشلة متكررة، حاول بعد ${minutesLeft} دقيقة`,
      });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      const attempts = user.failed_login_attempts + 1;
      if (attempts >= MAX_ATTEMPTS) {
        const lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
        await pool.query('UPDATE users SET failed_login_attempts = 0, locked_until = ? WHERE id = ?', [
          lockedUntil,
          user.id,
        ]);
        logAudit({ userId: user.id, username, action: 'account_locked', details: `تم القفل بعد ${attempts} محاولات فاشلة`, ip });
      } else {
        await pool.query('UPDATE users SET failed_login_attempts = ? WHERE id = ?', [attempts, user.id]);
        logAudit({ userId: user.id, username, action: 'login_failed', details: `محاولة ${attempts} من ${MAX_ATTEMPTS}`, ip });
      }
      return invalidCredentialsResponse();
    }

    // تسجيل دخول ناجح: إعادة تصفير عداد المحاولات الفاشلة
    if (user.failed_login_attempts > 0 || user.locked_until) {
      await pool.query('UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?', [user.id]);
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    logAudit({ userId: user.id, username, action: 'login_success', ip });

    res.json({
      message: 'تم تسجيل الدخول بنجاح',
      token,
      user: { id: user.id, username: user.username, full_name: user.full_name },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'حدث خطأ أثناء تسجيل الدخول' });
  }
});

// تسجيل الخروج (تسجيل الحدث فقط — إبطال الرمز الفعلي يتم من جهة العميل)
router.post('/logout', authenticate, (req, res) => {
  logAudit({ userId: req.user.id, username: req.user.username, action: 'logout', ip: clientIp(req) });
  res.json({ message: 'تم تسجيل الخروج بنجاح' });
});

// التحقق من الجلسة الحالية
router.get('/me', authenticate, async (req, res) => {
  const [rows] = await pool.query('SELECT id, username, full_name FROM users WHERE id = ?', [req.user.id]);
  if (!rows[0]) return res.status(404).json({ message: 'المستخدم غير موجود' });
  res.json(rows[0]);
});

module.exports = router;
