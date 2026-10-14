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

const bookSchema = z
  .object({
    title: z.string().trim().min(1, 'اسم الكتاب مطلوب').max(255, 'اسم الكتاب طويل جداً'),
    publisher_id: optionalNumericId,
    art_id: optionalNumericId,
    book_type: z.enum(Object.keys(BOOK_TYPES), { error: 'نوع الكتب مطلوب (الرسالة أو المجلد)' }),
    volume_count: z.string().trim().optional(),
    has_copies: z.string().trim().optional(),
    copy_count: z.string().trim().optional(),
    shelf_number: z.string().trim().max(50, 'رقم الرف طويل جداً').optional(),
    author_ids: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.book_type === 'mujallad') {
      const v = data.volume_count || '';
      if (!/^\d+$/.test(v) || Number(v) < 1 || Number(v) > 100000) {
        ctx.addIssue({ code: 'custom', path: ['volume_count'], message: 'عدد المجلدات مطلوب للمجلد ويجب أن يكون رقماً صحيحاً أكبر من صفر' });
      }
    }
    // عدد النسخات اختياري، لكن إن أُدخل يجب أن يكون رقماً صحيحاً ضمن الحد المسموح
    const copies = data.copy_count || '';
    if (isChecked(data.has_copies) && copies !== '' && (!/^\d+$/.test(copies) || Number(copies) < 1 || Number(copies) > MAX_COPIES)) {
      ctx.addIssue({ code: 'custom', path: ['copy_count'], message: `عدد النسخات يجب أن يكون رقماً صحيحاً من 1 إلى ${MAX_COPIES}` });
    }
  })
  // عدد المجلدات يُحفظ فقط للمجلد؛ للرسالة تُحفظ NULL مهما كانت القيمة المرسلة
  // عدد النسخات يُحفظ فقط عند تفعيل "له النسخات"؛ وإلا تُحفظ NULL
  .transform((data) => {
    const hasCopies = isChecked(data.has_copies);
    return {
      ...data,
      volume_count: data.book_type === 'mujallad' ? Number(data.volume_count) : null,
      has_copies: hasCopies,
      copy_count: hasCopies && data.copy_count ? Number(data.copy_count) : null,
    };
  });

module.exports = { bookSchema, BOOK_TYPES, MAX_COPIES };
