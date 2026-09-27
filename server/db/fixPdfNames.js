// إصلاح أسماء ملفات PDF العربية المحفوظة بترميز خاطئ (UTF-8 قُرئ كـ latin1 عند الرفع)
// الاستخدام: node db/fixPdfNames.js          (معاينة فقط)
//            node db/fixPdfNames.js --apply  (تطبيق التعديل)
const pool = require('../config/db');

function repair(name) {
  const fixed = Buffer.from(name, 'latin1').toString('utf8');
  // لا نعدّل إلا إذا كان الاسم فعلاً مُشوّهاً وكان الإصلاح نظيفاً
  return fixed !== name && !fixed.includes('�') ? fixed : null;
}

(async () => {
  const apply = process.argv.includes('--apply');
  const [rows] = await pool.query('SELECT id, original_name FROM book_pdfs');
  for (const row of rows) {
    const fixed = repair(row.original_name);
    if (!fixed) continue;
    console.log(`#${row.id}: ${fixed}`);
    if (apply) await pool.query('UPDATE book_pdfs SET original_name = ? WHERE id = ?', [fixed, row.id]);
  }
  console.log(apply ? 'تم التطبيق' : 'معاينة فقط — أضف --apply للتطبيق');
  await pool.end();
})();
