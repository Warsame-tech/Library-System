const express = require('express');
const fs = require('fs');
const path = require('path');
const pool = require('../config/db');
const authenticate = require('../middleware/auth');
const { authenticateAllowQuery } = require('../middleware/auth');
const { uploadBookFiles, PDF_DIR, isValidPdfSignature } = require('../middleware/upload');
const { bookSchema } = require('../schemas/bookSchema');
const { logAudit, clientIp } = require('../utils/audit');

const router = express.Router();

const BOOK_SELECT = `SELECT b.id, b.title, b.publisher_id, p.name AS publisher_name,
              b.art_id, ar.name AS art_name, b.volume_count, b.shelf_number,
              b.created_at, b.updated_at
       FROM books b
       LEFT JOIN publishers p ON p.id = b.publisher_id
       LEFT JOIN arts ar ON ar.id = b.art_id`;

// تحويل قائمة معرفات المؤلفين القادمة من النموذج إلى مصفوفة أرقام
function parseAuthorIds(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(Number).filter(Boolean);
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map(Number).filter(Boolean);
  } catch {
    // قيمة مفردة
  }
  return [Number(raw)].filter(Boolean);
}

// حذف ملفات مرفوعة (تُستخدم للتراجع عند فشل التحقق بعد الرفع)
function deleteFiles(files) {
  files.forEach((f) => fs.unlink(f.path, () => {}));
}

async function attachAuthorsAndPdfs(books) {
  if (books.length === 0) return books;
  const ids = books.map((b) => b.id);
  const [authorRows] = await pool.query(
    `SELECT ba.book_id, a.id, a.name FROM book_authors ba
     JOIN authors a ON a.id = ba.author_id WHERE ba.book_id IN (?)`,
    [ids]
  );
  const [pdfRows] = await pool.query(
    `SELECT id, book_id, file_name, original_name, file_size, uploaded_at
     FROM book_pdfs WHERE book_id IN (?) ORDER BY uploaded_at ASC`,
    [ids]
  );
  return books.map((book) => ({
    ...book,
    authors: authorRows.filter((a) => a.book_id === book.id).map((a) => ({ id: a.id, name: a.name })),
    pdfs: pdfRows.filter((p) => p.book_id === book.id),
  }));
}

// عرض جميع الكتب: بحث + تصفية + ترقيم صفحات + فرز
router.get('/', authenticate, async (req, res) => {
  try {
    const {
      search = '',
      author_id,
      publisher_id,
      art_id,
      page = 1,
      limit = 20,
      sort_by = 'created_at',
      sort_dir = 'DESC',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(1000, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    const allowedSort = ['title', 'created_at'];
    const sortCol = allowedSort.includes(sort_by) ? sort_by : 'created_at';
    const sortDir = sort_dir.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const conditions = [];
    const params = [];

    if (search) {
      conditions.push(
        `(b.title LIKE ? OR EXISTS (
            SELECT 1 FROM book_authors ba2 JOIN authors au2 ON au2.id = ba2.author_id
            WHERE ba2.book_id = b.id AND au2.name LIKE ?
          ) OR p.name LIKE ? OR ar.name LIKE ? OR b.shelf_number LIKE ?)`
      );
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (author_id) {
      conditions.push('EXISTS (SELECT 1 FROM book_authors ba3 WHERE ba3.book_id = b.id AND ba3.author_id = ?)');
      params.push(author_id);
    }
    if (publisher_id) {
      conditions.push('b.publisher_id = ?');
      params.push(publisher_id);
    }
    if (art_id) {
      conditions.push('b.art_id = ?');
      params.push(art_id);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const baseQuery = `FROM books b
      LEFT JOIN publishers p ON p.id = b.publisher_id
      LEFT JOIN arts ar ON ar.id = b.art_id
      ${where}`;

    const [countRows] = await pool.query(`SELECT COUNT(DISTINCT b.id) AS total ${baseQuery}`, params);

    const [rows] = await pool.query(
      `${BOOK_SELECT}
       ${where}
       ORDER BY b.${sortCol} ${sortDir}
       LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );

    const data = await attachAuthorsAndPdfs(rows);

    res.json({
      data,
      pagination: {
        total: countRows[0].total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(countRows[0].total / limitNum) || 1,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'حدث خطأ أثناء جلب الكتب' });
  }
});

// عرض كتاب واحد بكامل تفاصيله
router.get('/:id', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(`${BOOK_SELECT} WHERE b.id = ?`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ message: 'الكتاب غير موجود' });
    const [full] = await attachAuthorsAndPdfs(rows);
    res.json(full);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'حدث خطأ أثناء جلب بيانات الكتاب' });
  }
});

// إضافة كتاب جديد
router.post('/', authenticate, (req, res) => {
  uploadBookFiles(req, res, async (err) => {
    if (err) return res.status(400).json({ message: err.message });

    const pdfFiles = req.files?.pdfs || [];

    const parsed = bookSchema.safeParse(req.body);
    if (!parsed.success) {
      deleteFiles(pdfFiles);
      return res.status(400).json({ message: parsed.error.issues[0]?.message || 'بيانات الطلب غير صالحة' });
    }
    const { title, publisher_id, art_id, volume_count, shelf_number } = parsed.data;
    const authorIds = parseAuthorIds(req.body.author_ids);

    // التحقق من محتوى الملف الفعلي (magic bytes) وليس فقط من الترويسة المُرسَلة من المتصفح
    const invalidPdf = pdfFiles.find((f) => !isValidPdfSignature(f.path));
    if (invalidPdf) {
      deleteFiles(pdfFiles);
      return res.status(400).json({ message: 'أحد الملفات المرفوعة ليس ملف PDF صالحاً' });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [result] = await conn.query(
        `INSERT INTO books (title, publisher_id, art_id, volume_count, shelf_number)
         VALUES (?, ?, ?, ?, ?)`,
        [title, publisher_id || null, art_id || null, volume_count || null, shelf_number || null]
      );
      const bookId = result.insertId;

      for (const authorId of authorIds) {
        await conn.query('INSERT INTO book_authors (book_id, author_id) VALUES (?, ?)', [bookId, authorId]);
      }

      for (const pdf of pdfFiles) {
        await conn.query(
          `INSERT INTO book_pdfs (book_id, file_name, original_name, file_size) VALUES (?, ?, ?, ?)`,
          [bookId, pdf.filename, pdf.originalname, pdf.size]
        );
      }

      await conn.commit();

      const [rows] = await pool.query(`${BOOK_SELECT} WHERE b.id = ?`, [bookId]);
      const [full] = await attachAuthorsAndPdfs(rows);

      logAudit({ userId: req.user.id, username: req.user.username, action: 'create', entityType: 'book', entityId: bookId, details: title, ip: clientIp(req) });

      res.status(201).json({ message: 'تمت إضافة الكتاب بنجاح', data: full });
    } catch (error) {
      await conn.rollback();
      deleteFiles(pdfFiles);
      console.error(error);
      res.status(500).json({ message: 'حدث خطأ أثناء إضافة الكتاب' });
    } finally {
      conn.release();
    }
  });
});

// تعديل كتاب (لا يتم حذف ملفات PDF السابقة تلقائياً)
router.put('/:id', authenticate, (req, res) => {
  uploadBookFiles(req, res, async (err) => {
    if (err) return res.status(400).json({ message: err.message });

    const pdfFiles = req.files?.pdfs || [];
    const bookId = req.params.id;

    const parsed = bookSchema.safeParse(req.body);
    if (!parsed.success) {
      deleteFiles(pdfFiles);
      return res.status(400).json({ message: parsed.error.issues[0]?.message || 'بيانات الطلب غير صالحة' });
    }
    const { title, publisher_id, art_id, volume_count, shelf_number } = parsed.data;
    const authorIds = parseAuthorIds(req.body.author_ids);

    const invalidPdf = pdfFiles.find((f) => !isValidPdfSignature(f.path));
    if (invalidPdf) {
      deleteFiles(pdfFiles);
      return res.status(400).json({ message: 'أحد الملفات المرفوعة ليس ملف PDF صالحاً' });
    }

    const conn = await pool.getConnection();
    try {
      const [existingRows] = await conn.query('SELECT * FROM books WHERE id = ?', [bookId]);
      const existing = existingRows[0];
      if (!existing) {
        deleteFiles(pdfFiles);
        return res.status(404).json({ message: 'الكتاب غير موجود' });
      }

      await conn.beginTransaction();

      await conn.query(
        `UPDATE books SET title = ?, publisher_id = ?, art_id = ?, volume_count = ?, shelf_number = ?
         WHERE id = ?`,
        [title, publisher_id || null, art_id || null, volume_count || null, shelf_number || null, bookId]
      );

      // تحديث قائمة المؤلفين بالكامل
      await conn.query('DELETE FROM book_authors WHERE book_id = ?', [bookId]);
      for (const authorId of authorIds) {
        await conn.query('INSERT INTO book_authors (book_id, author_id) VALUES (?, ?)', [bookId, authorId]);
      }

      // إضافة أي ملفات PDF جديدة (الملفات القديمة تبقى كما هي)
      for (const pdf of pdfFiles) {
        await conn.query(
          `INSERT INTO book_pdfs (book_id, file_name, original_name, file_size) VALUES (?, ?, ?, ?)`,
          [bookId, pdf.filename, pdf.originalname, pdf.size]
        );
      }

      await conn.commit();

      const [rows] = await pool.query(`${BOOK_SELECT} WHERE b.id = ?`, [bookId]);
      const [full] = await attachAuthorsAndPdfs(rows);

      logAudit({ userId: req.user.id, username: req.user.username, action: 'update', entityType: 'book', entityId: bookId, details: title, ip: clientIp(req) });

      res.json({ message: 'تم تحديث الكتاب بنجاح', data: full });
    } catch (error) {
      await conn.rollback();
      deleteFiles(pdfFiles);
      console.error(error);
      res.status(500).json({ message: 'حدث خطأ أثناء تحديث الكتاب' });
    } finally {
      conn.release();
    }
  });
});

// حذف كتاب بالكامل (مع ملفاته)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM books WHERE id = ?', [req.params.id]);
    const book = rows[0];
    if (!book) return res.status(404).json({ message: 'الكتاب غير موجود' });

    const [pdfs] = await pool.query('SELECT file_name FROM book_pdfs WHERE book_id = ?', [req.params.id]);

    await pool.query('DELETE FROM books WHERE id = ?', [req.params.id]);

    pdfs.forEach((p) => fs.unlink(path.join(PDF_DIR, p.file_name), () => {}));

    logAudit({ userId: req.user.id, username: req.user.username, action: 'delete', entityType: 'book', entityId: book.id, details: book.title, ip: clientIp(req) });

    res.json({ message: 'تم حذف الكتاب بنجاح' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'حدث خطأ أثناء حذف الكتاب' });
  }
});

// حذف ملف PDF واحد من كتاب
router.delete('/:id/pdfs/:pdfId', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM book_pdfs WHERE id = ? AND book_id = ?', [
      req.params.pdfId,
      req.params.id,
    ]);
    const pdf = rows[0];
    if (!pdf) return res.status(404).json({ message: 'الملف غير موجود' });

    await pool.query('DELETE FROM book_pdfs WHERE id = ?', [req.params.pdfId]);
    fs.unlink(path.join(PDF_DIR, pdf.file_name), () => {});

    logAudit({ userId: req.user.id, username: req.user.username, action: 'delete', entityType: 'book_pdf', entityId: pdf.id, details: pdf.original_name, ip: clientIp(req) });

    res.json({ message: 'تم حذف الملف بنجاح' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'حدث خطأ أثناء حذف الملف' });
  }
});

// قراءة ملف PDF داخل المتصفح (عرض مباشر) — يسمح بتمرير الرمز عبر query لأجل <a>/<iframe>
router.get('/:id/pdfs/:pdfId/view', authenticateAllowQuery, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM book_pdfs WHERE id = ? AND book_id = ?', [
      req.params.pdfId,
      req.params.id,
    ]);
    const pdf = rows[0];
    if (!pdf) return res.status(404).json({ message: 'الملف غير موجود' });

    const filePath = path.join(PDF_DIR, pdf.file_name);
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'الملف غير موجود على الخادم' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(pdf.original_name)}"`);
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'حدث خطأ أثناء فتح الملف' });
  }
});

// تحميل ملف PDF — يسمح بتمرير الرمز عبر query لأجل رابط التحميل المباشر
router.get('/:id/pdfs/:pdfId/download', authenticateAllowQuery, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM book_pdfs WHERE id = ? AND book_id = ?', [
      req.params.pdfId,
      req.params.id,
    ]);
    const pdf = rows[0];
    if (!pdf) return res.status(404).json({ message: 'الملف غير موجود' });

    const filePath = path.join(PDF_DIR, pdf.file_name);
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'الملف غير موجود على الخادم' });

    res.download(filePath, pdf.original_name);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'حدث خطأ أثناء تحميل الملف' });
  }
});

module.exports = router;
