const express = require('express');
const fs = require('fs');
const path = require('path');
const pool = require('../config/db');
const authenticate = require('../middleware/auth');
const { authenticateAllowQuery } = require('../middleware/auth');
const { uploadBookFiles, PDF_DIR, isValidPdfSignature } = require('../middleware/upload');
const { bookSchema, BOOK_TYPES } = require('../schemas/bookSchema');
const { logAudit, clientIp } = require('../utils/audit');
const { savePdfChunks, sendPdf } = require('../utils/pdfStorage');

const router = express.Router();

const BOOK_SELECT = `SELECT b.id, b.title, b.publisher_id, p.name AS publisher_name,
              b.art_id, ar.name AS art_name, b.book_type, b.volume_count, b.has_copies, b.copy_count, b.copy_description, b.shelf_number,
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

// أنواع الكتب التي يطابق اسمها نص البحث (بعد توحيد الهمزات والتاء المربوطة وإزالة "ال" والتشكيل)
function normalizeTypeText(text) {
  return String(text)
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/^ال/, '')
    .trim();
}
function typesMatchingSearch(search) {
  const q = normalizeTypeText(search);
  if (q.length < 3) return [];
  return Object.entries(BOOK_TYPES)
    .filter(([, label]) => normalizeTypeText(label).includes(q))
    .map(([code]) => code);
}

// حذف ملفات الرفع المؤقتة (بعد نقلها إلى قاعدة البيانات، أو عند فشل التحقق)
function deleteFiles(files) {
  files.forEach((f) => fs.unlink(f.path, () => {}));
}

function uploadedFiles(req) {
  const pdfFiles = req.files?.pdfs || [];
  const copyFiles = req.files?.copy_pdfs || [];
  return { pdfFiles, copyFiles, allFiles: [...pdfFiles, ...copyFiles] };
}

// التحقق من ملفات النسخات: لكل ملف رقم نسخة (من copy_numbers بالترتيب نفسه) ضمن 1..copy_count،
// ولا يتكرر رقم النسخة في الطلب نفسه. يعيد { error } أو { numbers }
function checkCopyUploads(copyFiles, rawNumbers, hasCopies, copyCount) {
  if (copyFiles.length === 0) return { numbers: [] };
  if (!hasCopies) return { error: 'لا يمكن رفع ملفات النسخات إلا عند تفعيل "له النسخات"' };

  let numbers;
  try {
    numbers = JSON.parse(rawNumbers || '[]');
  } catch {
    numbers = null;
  }
  if (!Array.isArray(numbers) || numbers.length !== copyFiles.length) {
    return { error: 'بيانات ملفات النسخات غير صالحة' };
  }
  numbers = numbers.map(Number);
  const invalid = numbers.find((n) => !Number.isInteger(n) || n < 1 || n > (copyCount || 0));
  if (invalid !== undefined) return { error: `رقم النسخة ${invalid} غير صالح (عدد النسخات ${copyCount || 0})` };
  if (new Set(numbers).size !== numbers.length) return { error: 'لا يمكن رفع أكثر من ملف لنفس النسخة' };
  return { numbers };
}

// عند التعديل: لا يُسمح بإلغاء "له النسخات" أو تقليل عدد النسخات بحيث تُفقد نسخة لها ملف PDF مرفوع
async function copyCountConflict(conn, bookId, hasCopies, copyCount) {
  const [[{ maxCopy }]] = await conn.query(
    'SELECT MAX(copy_number) AS maxCopy FROM book_pdfs WHERE book_id = ? AND copy_number IS NOT NULL',
    [bookId]
  );
  if (!maxCopy) return null;
  if (!hasCopies) return 'لا يمكن إلغاء "له النسخات" لأن للكتاب ملفات نسخات مرفوعة؛ احذف ملفات النسخات أولاً';
  if (!copyCount || copyCount < maxCopy) {
    return `لا يمكن أن يكون عدد النسخات أقل من ${maxCopy} لأن النسخة رقم ${maxCopy} لها ملف PDF؛ احذف الملف أولاً`;
  }
  return null;
}

// حفظ ملفات النسخات داخل المعاملة؛ رفع ملف لنسخة لها ملف سابق يستبدله.
// يعيد أسماء الملفات المستبدلة لحذف أي نسخة قديمة منها في مجلد uploads بعد نجاح المعاملة
async function saveCopyPdfs(conn, bookId, copyFiles, numbers) {
  const replaced = [];
  for (let i = 0; i < copyFiles.length; i++) {
    const pdf = copyFiles[i];
    const [old] = await conn.query('SELECT id, file_name FROM book_pdfs WHERE book_id = ? AND copy_number = ?', [bookId, numbers[i]]);
    if (old[0]) {
      await conn.query('DELETE FROM book_pdfs WHERE id = ?', [old[0].id]);
      replaced.push(old[0].file_name);
    }
    const [pdfResult] = await conn.query(
      `INSERT INTO book_pdfs (book_id, copy_number, file_name, original_name, file_size) VALUES (?, ?, ?, ?, ?)`,
      [bookId, numbers[i], pdf.filename, pdf.originalname, pdf.size]
    );
    await savePdfChunks(conn, pdfResult.insertId, pdf.path);
  }
  return replaced;
}

function unlinkLegacyFiles(fileNames) {
  fileNames.forEach((name) => fs.unlink(path.join(PDF_DIR, name), () => {}));
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
    `SELECT id, book_id, copy_number, file_name, original_name, file_size, uploaded_at
     FROM book_pdfs WHERE book_id IN (?) ORDER BY copy_number IS NULL, copy_number, uploaded_at ASC, id ASC`,
    [ids]
  );
  return books.map((book) => ({
    ...book,
    has_copies: !!book.has_copies,
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
      // البحث بكلمة "رسالة" أو "مجلد" يُطابق نوع الكتب أيضاً
      const types = typesMatchingSearch(search);
      conditions.push(
        `(b.title LIKE ? OR EXISTS (
            SELECT 1 FROM book_authors ba2 JOIN authors au2 ON au2.id = ba2.author_id
            WHERE ba2.book_id = b.id AND au2.name LIKE ?
          ) OR p.name LIKE ? OR ar.name LIKE ? OR b.shelf_number LIKE ?${types.length ? ' OR b.book_type IN (?)' : ''})`
      );
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
      if (types.length) params.push(types);
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
    // تصفية حسب نوع الكتب (risala / mujallad)
    if (req.query.book_type && BOOK_TYPES[req.query.book_type]) {
      conditions.push('b.book_type = ?');
      params.push(req.query.book_type);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const baseQuery = `FROM books b
      LEFT JOIN publishers p ON p.id = b.publisher_id
      LEFT JOIN arts ar ON ar.id = b.art_id
      ${where}`;

    const [countRows] = await pool.query(`SELECT COUNT(DISTINCT b.id) AS total ${baseQuery}`, params);

    // ?all=true يعيد كل الكتب المطابقة دون ترقيم (لتقرير الكتب حسب الفنون)
    const all = req.query.all === 'true';
    const [rows] = await pool.query(
      `${BOOK_SELECT}
       ${where}
       ORDER BY b.${sortCol} ${sortDir}
       ${all ? '' : 'LIMIT ? OFFSET ?'}`,
      all ? params : [...params, limitNum, offset]
    );

    const data = await attachAuthorsAndPdfs(rows);
    const total = countRows[0].total;

    res.json({
      data,
      pagination: all
        ? { total, page: 1, limit: total, totalPages: 1 }
        : { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) || 1 },
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

    const { pdfFiles, copyFiles, allFiles } = uploadedFiles(req);

    const parsed = bookSchema.safeParse(req.body);
    if (!parsed.success) {
      deleteFiles(allFiles);
      return res.status(400).json({ message: parsed.error.issues[0]?.message || 'بيانات الطلب غير صالحة' });
    }
    const { title, publisher_id, art_id, book_type, volume_count, has_copies, copy_count, copy_description, shelf_number } = parsed.data;
    const authorIds = parseAuthorIds(req.body.author_ids);

    // ملفات النسخات اختيارية: يمكن رفع بعضها فقط أو لا شيء
    const copies = checkCopyUploads(copyFiles, req.body.copy_numbers, has_copies, copy_count);
    if (copies.error) {
      deleteFiles(allFiles);
      return res.status(400).json({ message: copies.error });
    }

    // التحقق من محتوى الملف الفعلي (magic bytes) وليس فقط من الترويسة المُرسَلة من المتصفح
    const invalidPdf = allFiles.find((f) => !isValidPdfSignature(f.path));
    if (invalidPdf) {
      deleteFiles(allFiles);
      return res.status(400).json({ message: 'أحد الملفات المرفوعة ليس ملف PDF صالحاً' });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [result] = await conn.query(
        `INSERT INTO books (title, publisher_id, art_id, book_type, volume_count, has_copies, copy_count, copy_description, shelf_number)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [title, publisher_id || null, art_id || null, book_type, volume_count, has_copies ? 1 : 0, copy_count, copy_description, shelf_number || null]
      );
      const bookId = result.insertId;

      for (const authorId of authorIds) {
        await conn.query('INSERT INTO book_authors (book_id, author_id) VALUES (?, ?)', [bookId, authorId]);
      }

      for (const pdf of pdfFiles) {
        const [pdfResult] = await conn.query(
          `INSERT INTO book_pdfs (book_id, file_name, original_name, file_size) VALUES (?, ?, ?, ?)`,
          [bookId, pdf.filename, pdf.originalname, pdf.size]
        );
        await savePdfChunks(conn, pdfResult.insertId, pdf.path);
      }
      await saveCopyPdfs(conn, bookId, copyFiles, copies.numbers);

      await conn.commit();

      const [rows] = await pool.query(`${BOOK_SELECT} WHERE b.id = ?`, [bookId]);
      const [full] = await attachAuthorsAndPdfs(rows);

      logAudit({ userId: req.user.id, username: req.user.username, action: 'create', entityType: 'book', entityId: bookId, details: title, ip: clientIp(req) });

      res.status(201).json({ message: 'تمت إضافة الكتاب بنجاح', data: full });
    } catch (error) {
      await conn.rollback();
      console.error(error);
      res.status(500).json({ message: 'حدث خطأ أثناء إضافة الكتاب' });
    } finally {
      conn.release();
      deleteFiles(allFiles);
    }
  });
});

// تعديل كتاب (لا يتم حذف ملفات PDF السابقة تلقائياً)
router.put('/:id', authenticate, (req, res) => {
  uploadBookFiles(req, res, async (err) => {
    if (err) return res.status(400).json({ message: err.message });

    const { pdfFiles, copyFiles, allFiles } = uploadedFiles(req);
    const bookId = req.params.id;

    const parsed = bookSchema.safeParse(req.body);
    if (!parsed.success) {
      deleteFiles(allFiles);
      return res.status(400).json({ message: parsed.error.issues[0]?.message || 'بيانات الطلب غير صالحة' });
    }
    const { title, publisher_id, art_id, book_type, volume_count, has_copies, copy_count, copy_description, shelf_number } = parsed.data;
    const authorIds = parseAuthorIds(req.body.author_ids);

    const copies = checkCopyUploads(copyFiles, req.body.copy_numbers, has_copies, copy_count);
    if (copies.error) {
      deleteFiles(allFiles);
      return res.status(400).json({ message: copies.error });
    }

    const invalidPdf = allFiles.find((f) => !isValidPdfSignature(f.path));
    if (invalidPdf) {
      deleteFiles(allFiles);
      return res.status(400).json({ message: 'أحد الملفات المرفوعة ليس ملف PDF صالحاً' });
    }

    const conn = await pool.getConnection();
    try {
      const [existingRows] = await conn.query('SELECT * FROM books WHERE id = ?', [bookId]);
      const existing = existingRows[0];
      if (!existing) {
        return res.status(404).json({ message: 'الكتاب غير موجود' });
      }

      // حماية ملفات النسخات الموجودة من الحذف غير المقصود
      const conflict = await copyCountConflict(conn, bookId, has_copies, copy_count);
      if (conflict) {
        return res.status(400).json({ message: conflict });
      }

      await conn.beginTransaction();

      await conn.query(
        `UPDATE books SET title = ?, publisher_id = ?, art_id = ?, book_type = ?, volume_count = ?,
                has_copies = ?, copy_count = ?, copy_description = ?, shelf_number = ?
         WHERE id = ?`,
        [title, publisher_id || null, art_id || null, book_type, volume_count, has_copies ? 1 : 0, copy_count, copy_description, shelf_number || null, bookId]
      );

      // تحديث قائمة المؤلفين بالكامل
      await conn.query('DELETE FROM book_authors WHERE book_id = ?', [bookId]);
      for (const authorId of authorIds) {
        await conn.query('INSERT INTO book_authors (book_id, author_id) VALUES (?, ?)', [bookId, authorId]);
      }

      // إضافة أي ملفات PDF جديدة (الملفات القديمة تبقى كما هي)
      for (const pdf of pdfFiles) {
        const [pdfResult] = await conn.query(
          `INSERT INTO book_pdfs (book_id, file_name, original_name, file_size) VALUES (?, ?, ?, ?)`,
          [bookId, pdf.filename, pdf.originalname, pdf.size]
        );
        await savePdfChunks(conn, pdfResult.insertId, pdf.path);
      }
      // ملفات النسخات: الخانات الفارغة لا تؤثر على الملفات الموجودة؛ الخانة التي فيها ملف جديد تستبدل ملفها
      const replaced = await saveCopyPdfs(conn, bookId, copyFiles, copies.numbers);

      await conn.commit();
      unlinkLegacyFiles(replaced);

      const [rows] = await pool.query(`${BOOK_SELECT} WHERE b.id = ?`, [bookId]);
      const [full] = await attachAuthorsAndPdfs(rows);

      logAudit({ userId: req.user.id, username: req.user.username, action: 'update', entityType: 'book', entityId: bookId, details: title, ip: clientIp(req) });

      res.json({ message: 'تم تحديث الكتاب بنجاح', data: full });
    } catch (error) {
      await conn.rollback();
      console.error(error);
      res.status(500).json({ message: 'حدث خطأ أثناء تحديث الكتاب' });
    } finally {
      conn.release();
      deleteFiles(allFiles);
    }
  });
});

// رفع ملفات نسخات لكتاب محفوظ دون إعادة إرسال بياناته — ملف واحد أو عدة ملفات دفعة واحدة
// الحقول: copy_pdfs (الملفات) و copy_numbers (مصفوفة JSON بأرقام النسخ بالترتيب نفسه)
router.post('/:id/copy-pdfs', authenticate, (req, res) => {
  uploadBookFiles(req, res, async (err) => {
    if (err) return res.status(400).json({ message: err.message });

    const { copyFiles, allFiles } = uploadedFiles(req);
    const bookId = req.params.id;

    const conn = await pool.getConnection();
    try {
      if (copyFiles.length === 0) {
        return res.status(400).json({ message: 'اختر ملف PDF واحداً على الأقل' });
      }

      const [bookRows] = await conn.query('SELECT id, title, has_copies, copy_count FROM books WHERE id = ?', [bookId]);
      const book = bookRows[0];
      if (!book) return res.status(404).json({ message: 'الكتاب غير موجود' });

      const copies = checkCopyUploads(copyFiles, req.body.copy_numbers, !!book.has_copies, book.copy_count);
      if (copies.error) return res.status(400).json({ message: copies.error });

      if (copyFiles.some((f) => !isValidPdfSignature(f.path))) {
        return res.status(400).json({ message: 'أحد الملفات المرفوعة ليس ملف PDF صالحاً' });
      }

      await conn.beginTransaction();
      const replaced = await saveCopyPdfs(conn, book.id, copyFiles, copies.numbers);
      await conn.commit();
      unlinkLegacyFiles(replaced);

      const [rows] = await pool.query(`${BOOK_SELECT} WHERE b.id = ?`, [book.id]);
      const [full] = await attachAuthorsAndPdfs(rows);

      logAudit({
        userId: req.user.id,
        username: req.user.username,
        action: 'upload',
        entityType: 'book_pdf',
        entityId: book.id,
        details: `${book.title} — النسخ: ${copies.numbers.join('، ')}`,
        ip: clientIp(req),
      });

      res.json({
        message: copyFiles.length === 1 ? 'تم رفع الملف بنجاح' : `تم رفع ${copyFiles.length} ملفات بنجاح`,
        data: full,
      });
    } catch (error) {
      await conn.rollback();
      console.error(error);
      res.status(500).json({ message: 'حدث خطأ أثناء رفع الملفات' });
    } finally {
      conn.release();
      deleteFiles(allFiles);
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

    await sendPdf(req, res, pdf, 'inline');
  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.status(500).json({ message: 'حدث خطأ أثناء فتح الملف' });
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

    await sendPdf(req, res, pdf, 'attachment');
  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.status(500).json({ message: 'حدث خطأ أثناء تحميل الملف' });
  }
});

module.exports = router;
