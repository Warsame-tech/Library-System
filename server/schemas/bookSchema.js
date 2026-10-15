const { z } = require('zod');

// أنواع الكتب: القيمة المخزّنة في قاعدة البيانات ← الاسم المعروض
const BOOK_TYPES = { risala: 'الرسالة', mujallad: 'المجلد' };

// الحد الأقصى لعدد النسخات (وبالتالي لعدد خانات رفع ملفات النسخات)
const MAX_COPIES = 100;

// بيانات نموذج الكتاب تصل كسلاسل نصية (multipart/form-data عبر multer)
const optionalNumericId = z
  .string()
  .trim()
  .refine((v) => v === '' || /^\d+$/.test(v), 'قيمة غير صالحة')
  .optional();

// قيمة مربع الاختيار "له النسخات" كما يرسلها النموذج
const isChecked = (v) => ['true', '1', 'on'].includes(String(v || '').trim().toLowerCase());

// الأرقام العربية (٠-٩) والفارسية (۰-۹) تُحوَّل إلى 0-9 حتى يُقبل عدد النسخات المكتوب بلوحة مفاتيح عربية
const toLatinDigits = (v) =>
  String(v || '').replace(/[٠-٩۰-۹]/g, (d) => String((d.charCodeAt(0) & 0xf) % 10));

const bookSchema = z
  .object({
    title: z.string().trim().min(1, 'اسم الكتاب مطلوب').max(255, 'اسم الكتاب طويل جداً'),
    publisher_id: optionalNumericId,
    art_id: optionalNumericId,
    book_type: z.enum(Object.keys(BOOK_TYPES), { error: 'نوع الكتب مطلوب (الرسالة أو المجلد)' }),
    // عدد المجلدات نص حر: أرقام أو كلمات بأي لغة (مثل "3" أو "المجلد الأول")
    volume_count: z.string().trim().max(100, 'عدد المجلدات طويل جداً (100 حرف كحد أقصى)').optional(),
    has_copies: z.string().trim().optional(),
    // عدد النسخات رقم صحيح فقط لأنه يحدد عدد خانات رفع ملفات PDF
    copy_count: z.string().trim().transform(toLatinDigits).optional(),
    // وصف النسخ نص حر اختياري بأي لغة (مثل "النسخة الأصلية" أو "Student Copy" أو "Nuqulka Macallinka")
    copy_description: z.string().trim().max(500, 'وصف النسخ طويل جداً (500 حرف كحد أقصى)').optional(),
    shelf_number: z.string().trim().max(50, 'رقم الرف طويل جداً').optional(),
    author_ids: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.book_type === 'mujallad' && !data.volume_count) {
      ctx.addIssue({ code: 'custom', path: ['volume_count'], message: 'عدد المجلدات مطلوب للمجلد' });
    }
    // عدد النسخات اختياري، لكن إن أُدخل يجب أن يكون رقماً صحيحاً ضمن الحد المسموح
    const copies = data.copy_count || '';
    if (isChecked(data.has_copies) && copies !== '' && (!/^\d+$/.test(copies) || Number(copies) < 1 || Number(copies) > MAX_COPIES)) {
      ctx.addIssue({ code: 'custom', path: ['copy_count'], message: `عدد النسخات يجب أن يكون رقماً صحيحاً من 1 إلى ${MAX_COPIES}` });
    }
  })
  // عدد المجلدات يُحفظ فقط للمجلد؛ للرسالة تُحفظ NULL مهما كانت القيمة المرسلة
  // عدد النسخات ووصف النسخ يُحفظان فقط عند تفعيل "له النسخات"؛ وإلا تُحفظ NULL
  .transform((data) => {
    const hasCopies = isChecked(data.has_copies);
    return {
      ...data,
      volume_count: data.book_type === 'mujallad' ? data.volume_count : null,
      has_copies: hasCopies,
      copy_count: hasCopies && data.copy_count ? Number(data.copy_count) : null,
      copy_description: hasCopies && data.copy_description ? data.copy_description : null,
    };
  });

module.exports = { bookSchema, BOOK_TYPES, MAX_COPIES };
