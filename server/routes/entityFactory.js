// مصنع عام لإنشاء مسارات CRUD لكيانات بسيطة متشابهة البنية
// (الفنون، المؤلفين، دور النشر): id, name فقط
const express = require('express');
const pool = require('../config/db');
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');
const { entityNameSchema } = require('../schemas/entitySchema');
const { logAudit, clientIp } = require('../utils/audit');

function createEntityRouter({ table, entityLabel, dependents }) {
  const router = express.Router();
  router.use(authenticate);

  // عرض الكل + بحث + ترقيم صفحات
  router.get('/', async (req, res) => {
    try {
      const { search = '', page = 1, limit = 20 } = req.query;
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
      const offset = (pageNum - 1) * limitNum;

      const where = search ? `WHERE name LIKE ?` : '';
      const params = search ? [`%${search}%`] : [];

      const [countRows] = await pool.query(
        `SELECT COUNT(*) AS total FROM ${table} ${where}`,
        params
      );
      const [rows] = await pool.query(
        `SELECT * FROM ${table} ${where} ORDER BY name ASC LIMIT ? OFFSET ?`,
        [...params, limitNum, offset]
      );

      res.json({
        data: rows,
        pagination: {
          total: countRows[0].total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(countRows[0].total / limitNum) || 1,
        },
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: `حدث خطأ أثناء جلب ${entityLabel}` });
    }
  });

  // عرض عنصر واحد
  router.get('/:id', async (req, res) => {
    try {
      const [rows] = await pool.query(`SELECT * FROM ${table} WHERE id = ?`, [req.params.id]);
      if (!rows[0]) return res.status(404).json({ message: `${entityLabel} غير موجود` });
      res.json(rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: `حدث خطأ أثناء جلب ${entityLabel}` });
    }
  });

  // إضافة
  router.post('/', validate(entityNameSchema), async (req, res) => {
    try {
      const { name } = req.body;
      const [result] = await pool.query(`INSERT INTO ${table} (name) VALUES (?)`, [name]);
      const [rows] = await pool.query(`SELECT * FROM ${table} WHERE id = ?`, [result.insertId]);

      logAudit({ userId: req.user.id, username: req.user.username, action: 'create', entityType: table, entityId: result.insertId, details: name, ip: clientIp(req) });

      res.status(201).json({ message: `تمت إضافة ${entityLabel} بنجاح`, data: rows[0] });
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ message: `${entityLabel} بهذا الاسم موجود مسبقاً` });
      }
      console.error(err);
      res.status(500).json({ message: `حدث خطأ أثناء إضافة ${entityLabel}` });
    }
  });

  // تعديل
  router.put('/:id', validate(entityNameSchema), async (req, res) => {
    try {
      const { name } = req.body;
      const [existing] = await pool.query(`SELECT id FROM ${table} WHERE id = ?`, [req.params.id]);
      if (!existing[0]) return res.status(404).json({ message: `${entityLabel} غير موجود` });

      await pool.query(`UPDATE ${table} SET name = ? WHERE id = ?`, [name, req.params.id]);
      const [rows] = await pool.query(`SELECT * FROM ${table} WHERE id = ?`, [req.params.id]);

      logAudit({ userId: req.user.id, username: req.user.username, action: 'update', entityType: table, entityId: req.params.id, details: name, ip: clientIp(req) });

      res.json({ message: `تم تحديث ${entityLabel} بنجاح`, data: rows[0] });
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ message: `${entityLabel} بهذا الاسم موجود مسبقاً` });
      }
      console.error(err);
      res.status(500).json({ message: `حدث خطأ أثناء تحديث ${entityLabel}` });
    }
  });

  // حذف
  router.delete('/:id', async (req, res) => {
    try {
      const [existing] = await pool.query(`SELECT id, name FROM ${table} WHERE id = ?`, [req.params.id]);
      if (!existing[0]) return res.status(404).json({ message: `${entityLabel} غير موجود` });

      if (dependents) {
        const [used] = await pool.query(dependents.countQuery, [req.params.id]);
        if (used[0].c > 0) {
          return res.status(409).json({
            message: `لا يمكن حذف ${entityLabel} لأنه مرتبط بـ ${used[0].c} كتاب/كتب`,
          });
        }
      }

      await pool.query(`DELETE FROM ${table} WHERE id = ?`, [req.params.id]);

      logAudit({ userId: req.user.id, username: req.user.username, action: 'delete', entityType: table, entityId: req.params.id, details: existing[0].name, ip: clientIp(req) });

      res.json({ message: `تم حذف ${entityLabel} بنجاح` });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: `حدث خطأ أثناء حذف ${entityLabel}` });
    }
  });

  return router;
}

module.exports = createEntityRouter;
