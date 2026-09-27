const rateLimit = require('express-rate-limit');

// حد عام لجميع طلبات API لمنع إساءة الاستخدام
const apiLimiter = rateLimit({
  windowMs: (Number(process.env.RATE_LIMIT_WINDOW_MINUTES) || 15) * 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_MAX) || 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'تم تجاوز الحد المسموح به من الطلبات، حاول لاحقاً' },
});

// حد صارم على تسجيل الدخول لمنع هجمات التخمين (brute-force)
const loginLimiter = rateLimit({
  windowMs: (Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MINUTES) || 15) * 60 * 1000,
  limit: Number(process.env.LOGIN_RATE_LIMIT_MAX) || 20,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { message: 'محاولات تسجيل دخول كثيرة جداً، حاول مرة أخرى بعد قليل' },
});

module.exports = { apiLimiter, loginLimiter };
