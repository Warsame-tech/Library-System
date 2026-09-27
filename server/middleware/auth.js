const jwt = require('jsonwebtoken');

function verify(token, req, res, next) {
  if (!token) {
    return res.status(401).json({ message: 'يجب تسجيل الدخول للوصول إلى هذا المورد' });
  }
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: 'الجلسة غير صالحة أو منتهية، يرجى تسجيل الدخول مرة أخرى' });
  }
}

// المصادقة القياسية: الرمز عبر ترويسة Authorization فقط (لجميع نقاط API)
function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  verify(token, req, res, next);
}

// مصادقة تسمح أيضاً بتمرير الرمز عبر query string — تُستخدم حصراً في مسارات
// عرض/تحميل ملفات PDF المباشرة (روابط <a>/<iframe> لا يمكنها إرسال ترويسة Authorization)
function authenticateAllowQuery(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : req.query.token || null;
  verify(token, req, res, next);
}

module.exports = authenticate;
module.exports.authenticateAllowQuery = authenticateAllowQuery;
