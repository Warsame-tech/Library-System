const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

const PDF_DIR = path.join(__dirname, '..', 'uploads', 'pdfs');
if (!fs.existsSync(PDF_DIR)) fs.mkdirSync(PDF_DIR, { recursive: true });

// اسم ملف عشوائي آمن بامتداد .pdf ثابت — يتجاهل امتداد/اسم الملف الأصلي بالكامل
// لمنع أي محاولة path traversal أو انتحال امتداد آخر
function safeFileName() {
  const random = crypto.randomBytes(16).toString('hex');
  return `${Date.now()}-${random}.pdf`;
}

const pdfStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, PDF_DIR),
  filename: (req, file, cb) => cb(null, safeFileName()),
});

const MAX_PDF_SIZE = (Number(process.env.MAX_PDF_SIZE_MB) || 50) * 1024 * 1024;

const pdfFileFilter = (req, file, cb) => {
  if (file.mimetype !== 'application/pdf') {
    return cb(new Error('يُسمح فقط برفع ملفات PDF'));
  }
  // multer يقرأ اسم الملف كـ latin1، فتتشوّه الأسماء العربية — نعيد فكّه كـ UTF-8
  file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
  cb(null, true);
};

// رفع ملفات PDF الخاصة باستمارة الكتاب
const uploadBookFiles = multer({
  storage: pdfStorage,
  limits: { fileSize: MAX_PDF_SIZE },
  fileFilter: pdfFileFilter,
}).fields([{ name: 'pdfs', maxCount: 20 }]);

// التحقق من التوقيع الفعلي للملف (magic bytes) بدلاً من الاعتماد فقط على
// Content-Type القادم من المتصفح (قابل للتزييف بسهولة)
function isValidPdfSignature(filePath) {
  try {
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(5);
    fs.readSync(fd, buffer, 0, 5, 0);
    fs.closeSync(fd);
    return buffer.toString('ascii') === '%PDF-';
  } catch {
    return false;
  }
}

module.exports = { uploadBookFiles, PDF_DIR, isValidPdfSignature };
