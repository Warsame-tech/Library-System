// تخزين ملفات PDF داخل قاعدة البيانات على شكل أجزاء (chunks)
// - الحفظ: يُقرأ الملف المؤقت جزءاً جزءاً ويُدرج كل جزء في صف مستقل
// - القراءة: تُرسل الأجزاء بالترتيب مباشرة إلى المتصفح دون تحميل الملف كاملاً في الذاكرة
const fs = require('fs');
const path = require('path');
const pool = require('../config/db');
const { PDF_DIR } = require('../middleware/upload');

// 256KB: حتى في النسخة الاحتياطية (mysqldump --hex-blob يضاعف الحجم إلى ~512KB) يبقى كل صف أقل من
// max_allowed_packet الافتراضي (1MB في XAMPP)، وأقل بكثير من حد سجل InnoDB
const CHUNK_SIZE = 256 * 1024;

async function savePdfChunks(conn, pdfId, filePath) {
  const stream = fs.createReadStream(filePath, { highWaterMark: CHUNK_SIZE });
  let seq = 0;
  for await (const chunk of stream) {
    await conn.execute('INSERT INTO book_pdf_chunks (pdf_id, seq, data) VALUES (?, ?, ?)', [pdfId, seq++, chunk]);
  }
  return seq;
}

function contentDisposition(type, name) {
  const fallback = name.replace(/[^\x20-\x7e]/g, '_').replace(/"/g, '');
  return `${type}; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

// يرسل الملف إلى المتصفح. إن لم توجد أجزاء في قاعدة البيانات (ملفات قديمة لم تُنقل بعد)
// يُقرأ الملف من مجلد uploads/pdfs كحل احتياطي
async function sendPdf(req, res, pdf, disposition) {
  const [[{ count }]] = await pool.query('SELECT COUNT(*) AS count FROM book_pdf_chunks WHERE pdf_id = ?', [pdf.id]);

  if (count === 0) {
    const legacyPath = path.join(PDF_DIR, pdf.file_name);
    if (!fs.existsSync(legacyPath)) return res.status(404).json({ message: 'الملف غير موجود على الخادم' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', contentDisposition(disposition, pdf.original_name));
    return fs.createReadStream(legacyPath).pipe(res);
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Length', pdf.file_size);
  res.setHeader('Content-Disposition', contentDisposition(disposition, pdf.original_name));

  let aborted = false;
  req.on('close', () => {
    aborted = true;
  });

  try {
    for (let seq = 0; seq < count && !aborted; seq++) {
      const [[row]] = await pool.execute('SELECT data FROM book_pdf_chunks WHERE pdf_id = ? AND seq = ?', [pdf.id, seq]);
      if (!row) throw new Error(`missing chunk ${seq} for pdf ${pdf.id}`);
      if (!res.write(row.data)) await new Promise((resolve) => res.once('drain', resolve));
    }
    res.end();
  } catch (err) {
    console.error(err);
    res.destroy(err);
  }
}

module.exports = { savePdfChunks, sendPdf, CHUNK_SIZE };
