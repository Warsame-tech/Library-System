const pool = require('../config/db');

// تسجيل حدث تدقيق (login/logout/create/update/delete) — لا يوقف الطلب الأساسي في حال فشل التسجيل
async function logAudit({ userId = null, username = null, action, entityType = null, entityId = null, details = null, ip = null }) {
  try {
    await pool.query(
      `INSERT INTO audit_logs (user_id, username, action, entity_type, entity_id, details, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, username, action, entityType, entityId, details, ip]
    );
  } catch (err) {
    console.error('تعذّر تسجيل حدث التدقيق:', err.message);
  }
}

function clientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket?.remoteAddress || null;
}

module.exports = { logAudit, clientIp };
