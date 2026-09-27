// نقل ملفات PDF القديمة (المحفوظة كملفات على القرص) إلى داخل قاعدة البيانات
// الاستخدام:
//   node db/importPdfFiles.js                        معاينة — يبحث في uploads/pdfs
//   node db/importPdfFiles.js --apply                تنفيذ النقل
//   node db/importPdfFiles.js "D:\old\pdfs" --apply  البحث في مجلد آخر (مثلاً نسخة من جهاز آخر)
// الملفات الأصلية لا تُحذف — احذفها يدوياً بعد التأكد من أن كل شيء يعمل
const fs = require('fs');
const path = require('path');
const pool = require('../config/db');
const { PDF_DIR } = require('../middleware/upload');
const { savePdfChunks } = require('../utils/pdfStorage');

(async () => {
  const apply = process.argv.includes('--apply');
  const dir = process.argv.slice(2).find((a) => !a.startsWith('--')) || PDF_DIR;

  const [rows] = await pool.query(
    `SELECT p.id, p.file_name, p.original_name FROM book_pdfs p
     WHERE NOT EXISTS (SELECT 1 FROM book_pdf_chunks c WHERE c.pdf_id = p.id)`
  );

  let imported = 0;
  const missing = [];
  for (const row of rows) {
    const filePath = path.join(dir, row.file_name);
    if (!fs.existsSync(filePath)) {
      missing.push(row);
      continue;
    }
    console.log(`#${row.id}: ${row.original_name}`);
    if (!apply) continue;

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await savePdfChunks(conn, row.id, filePath);
      await conn.commit();
      imported++;
    } catch (err) {
      await conn.rollback();
      console.error(`  فشل: ${err.message}`);
    } finally {
      conn.release();
    }
  }

  if (missing.length) {
    console.log(`\nملفات غير موجودة في ${dir}:`);
    missing.forEach((r) => console.log(`  #${r.id}: ${r.original_name}  (${r.file_name})`));
  }
  console.log(apply ? `\nتم نقل ${imported} ملف إلى قاعدة البيانات` : '\nمعاينة فقط — أضف --apply للتنفيذ');
  await pool.end();
})();
